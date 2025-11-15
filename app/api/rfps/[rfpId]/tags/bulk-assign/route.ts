import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TagAssignment {
  requirementId: string;
  tagIds: string[];
}

interface BulkAssignRequest {
  assignments: TagAssignment[];
}

/**
 * POST /api/rfps/[rfpId]/tags/bulk-assign
 *
 * Bulk assign tags to multiple requirements in a single API call
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } },
) {
  try {
    const { rfpId } = params;
    const { assignments } = (await request.json()) as BulkAssignRequest;

    // Validate inputs
    if (!rfpId || rfpId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: "Assignments array is required" },
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
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    // Collect all tag relations to insert
    const relationsToInsert: Array<{
      requirement_id: string;
      tag_id: string;
      created_by: string;
    }> = [];

    // For each assignment, get existing relations and build new ones
    for (const assignment of assignments) {
      const { requirementId, tagIds } = assignment;

      // Verify requirement exists
      const { data: requirement } = await supabase
        .from("requirements")
        .select("id")
        .eq("id", requirementId)
        .eq("rfp_id", rfpId)
        .maybeSingle();

      if (!requirement) {
        continue; // Skip if requirement doesn't exist
      }

      // Get existing tag relations for this requirement
      const { data: existingRelations } = await supabase
        .from("requirement_tags")
        .select("tag_id")
        .eq("requirement_id", requirementId);

      const existingTagIds = new Set(
        existingRelations?.map((r: any) => r.tag_id) || [],
      );

      // Add only new tags (avoid duplicates)
      for (const tagId of tagIds) {
        if (!existingTagIds.has(tagId)) {
          relationsToInsert.push({
            requirement_id: requirementId,
            tag_id: tagId,
            created_by: user.id,
          });
        }
      }
    }

    // Insert all relations in a single batch
    if (relationsToInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("requirement_tags")
        .insert(relationsToInsert);

      if (insertError) {
        console.error("Error bulk assigning tags:", insertError);
        return NextResponse.json(
          { error: "Failed to assign tags" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        assignedCount: relationsToInsert.length,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
