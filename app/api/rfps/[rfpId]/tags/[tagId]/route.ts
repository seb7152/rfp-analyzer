import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * DELETE /api/rfps/[rfpId]/tags/[tagId]
 *
 * Delete a tag and all its associations with requirements
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { rfpId: string; tagId: string } },
) {
  try {
    const { rfpId, tagId } = params;

    // Validate inputs
    if (!rfpId || rfpId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    if (!tagId || tagId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid Tag ID" }, { status: 400 });
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

    // Verify user has access to this RFP and is evaluator/owner
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

    if (
      userOrgError ||
      !userOrg ||
      !["admin", "evaluator"].includes(userOrg.role)
    ) {
      return NextResponse.json(
        { error: "Permission denied to delete tags" },
        { status: 403 },
      );
    }

    // Verify tag exists and belongs to this RFP
    const { data: tag, error: tagError } = await supabase
      .from("tags")
      .select("id, rfp_id")
      .eq("id", tagId)
      .eq("rfp_id", rfpId)
      .maybeSingle();

    if (tagError || !tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Delete all requirement-tag associations
    const { error: deleteAssociationsError } = await supabase
      .from("requirement_tags")
      .delete()
      .eq("tag_id", tagId);

    if (deleteAssociationsError) {
      console.error(
        "Error deleting requirement-tag associations:",
        deleteAssociationsError,
      );
      return NextResponse.json(
        { error: "Failed to delete tag associations" },
        { status: 500 },
      );
    }

    // Delete the tag itself
    const { error: deleteTagError } = await supabase
      .from("tags")
      .delete()
      .eq("id", tagId);

    if (deleteTagError) {
      console.error("Error deleting tag:", deleteTagError);
      return NextResponse.json(
        { error: "Failed to delete tag" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
