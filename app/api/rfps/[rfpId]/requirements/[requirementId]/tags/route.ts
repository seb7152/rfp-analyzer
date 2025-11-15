import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/rfps/[rfpId]/requirements/[requirementId]/tags
 *
 * Fetch all tags for a specific requirement
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string; requirementId: string } },
) {
  try {
    const { rfpId, requirementId } = params;

    if (!rfpId || !requirementId) {
      return NextResponse.json(
        { error: "Invalid RFP ID or Requirement ID" },
        { status: 400 },
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

    // Verify requirement exists and belongs to this RFP
    const { data: requirement } = await supabase
      .from("requirements")
      .select("id, rfp_id")
      .eq("id", requirementId)
      .eq("rfp_id", rfpId)
      .maybeSingle();

    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 },
      );
    }

    // Fetch tags for this requirement with the tag details
    const { data: tagRelations, error: tagsError } = await supabase
      .from("requirement_tags")
      .select("tag_id, created_at, tags(id, name, color)")
      .eq("requirement_id", requirementId);

    if (tagsError) {
      console.error("Error fetching requirement tags:", tagsError);
      return NextResponse.json(
        { error: "Failed to fetch tags" },
        { status: 500 },
      );
    }

    // Transform the response
    const tags = tagRelations.map((rt: any) => rt.tags);

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/rfps/[rfpId]/requirements/[requirementId]/tags
 *
 * Add one or more tags to a requirement
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string; requirementId: string } },
) {
  try {
    const { rfpId, requirementId } = params;
    const { tagIds } = await request.json();

    if (!rfpId || !requirementId) {
      return NextResponse.json(
        { error: "Invalid RFP ID or Requirement ID" },
        { status: 400 },
      );
    }

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json(
        { error: "Tag IDs array is required" },
        { status: 400 },
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

    // Verify user has access and is evaluator/owner
    const { data: rfp } = await supabase
      .from("rfps")
      .select("organization_id")
      .eq("id", rfpId)
      .maybeSingle();

    if (!rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (!userOrg || !["admin", "evaluator"].includes(userOrg.role)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 },
      );
    }

    // Verify requirement exists
    const { data: requirement } = await supabase
      .from("requirements")
      .select("id")
      .eq("id", requirementId)
      .eq("rfp_id", rfpId)
      .maybeSingle();

    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 },
      );
    }

    // Get existing tag relations to avoid duplicates
    const { data: existingRelations } = await supabase
      .from("requirement_tags")
      .select("tag_id")
      .eq("requirement_id", requirementId);

    const existingTagIds = new Set(
      existingRelations?.map((r: any) => r.tag_id) || [],
    );

    // Filter out tags that are already assigned
    const newTagIds = tagIds.filter((id) => !existingTagIds.has(id));

    if (newTagIds.length === 0) {
      return NextResponse.json(
        { message: "All tags are already assigned" },
        { status: 200 },
      );
    }

    // Create requirement-tag relations
    const { data: relations, error: insertError } = await supabase
      .from("requirement_tags")
      .insert(
        newTagIds.map((tagId) => ({
          requirement_id: requirementId,
          tag_id: tagId,
          created_by: user.id,
        })),
      )
      .select();

    if (insertError) {
      console.error("Error adding tags:", insertError);
      return NextResponse.json(
        { error: "Failed to add tags" },
        { status: 500 },
      );
    }

    return NextResponse.json({ relations }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/rfps/[rfpId]/requirements/[requirementId]/tags
 *
 * Remove a tag from a requirement
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { rfpId: string; requirementId: string } },
) {
  try {
    const { rfpId, requirementId } = params;
    const { tagId } = await request.json();

    if (!rfpId || !requirementId || !tagId) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 },
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

    // Verify user has permission
    const { data: rfp } = await supabase
      .from("rfps")
      .select("organization_id")
      .eq("id", rfpId)
      .maybeSingle();

    if (!rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (!userOrg || !["admin", "evaluator"].includes(userOrg.role)) {
      return NextResponse.json(
        { error: "Permission denied" },
        { status: 403 },
      );
    }

    // Delete the requirement-tag relation
    const { error: deleteError } = await supabase
      .from("requirement_tags")
      .delete()
      .eq("requirement_id", requirementId)
      .eq("tag_id", tagId);

    if (deleteError) {
      console.error("Error removing tag:", deleteError);
      return NextResponse.json(
        { error: "Failed to remove tag" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
