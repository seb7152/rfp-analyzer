import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/rfps/[rfpId]/tags/bulk-fetch
 *
 * Fetch all tags for multiple requirements in a single API call
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const { requirementIds } = await request.json();

    // Validate inputs
    if (!rfpId || rfpId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    if (!Array.isArray(requirementIds) || requirementIds.length === 0) {
      return NextResponse.json(
        { error: "Requirement IDs array is required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .maybeSingle();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: "Access denied to this RFP" },
        { status: 403 }
      );
    }

    // Fetch all requirement-tag associations for the given requirements
    const { data: tagRelations, error: tagsError } = await supabase
      .from("requirement_tags")
      .select("requirement_id, tag_id, tags(id, name, color)")
      .in("requirement_id", requirementIds);

    if (tagsError) {
      console.error("Error fetching tags:", tagsError);
      return NextResponse.json(
        { error: "Failed to fetch tags" },
        { status: 500 }
      );
    }

    // Transform response into map of requirementId -> tags[]
    const tagsByRequirement: Record<string, any[]> = {};
    requirementIds.forEach((id) => {
      tagsByRequirement[id] = [];
    });

    if (tagRelations) {
      for (const relation of tagRelations) {
        if (relation.tags && tagsByRequirement[relation.requirement_id]) {
          tagsByRequirement[relation.requirement_id].push(relation.tags);
        }
      }
    }

    return NextResponse.json({ tagsByRequirement }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
