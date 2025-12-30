import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";

/**
 * DELETE /api/rfps/[rfpId]/assignments/[userId]
 *
 * Remove a user assignment from an RFP
 * Only the RFP owner or organization admin can remove assignments
 *
 * Response:
 *   - 200: { success: true, message: string }
 *   - 400: Invalid RFP ID or user ID
 *   - 401: User not authenticated
 *   - 403: Access denied (not RFP owner or org admin)
 *   - 404: Assignment not found
 *   - 500: Server error
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { rfpId: string; userId: string } }
) {
  try {
    const { rfpId, userId } = params;

    if (!rfpId || !userId) {
      return NextResponse.json(
        { error: "RFP ID and User ID are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    const accessCheckResponse = await verifyRFPAccess(rfpId, currentUser.id);
    if (accessCheckResponse) {
      return accessCheckResponse;
    }

    // Get RFP details
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id, created_by")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json(
        { error: "RFP not found or access denied" },
        { status: 404 }
      );
    }

    // Check if current user is RFP owner or organization admin
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    const isRFPOwner = rfp.created_by === currentUser.id;
    const isOrgAdmin = userOrg?.role === "admin";

    if (!isRFPOwner && !isOrgAdmin) {
      return NextResponse.json(
        {
          error:
            "Access denied. Only RFP owner or organization admin can remove assignments.",
        },
        { status: 403 }
      );
    }

    // Delete the assignment
    const { error: deleteError } = await supabase
      .from("rfp_user_assignments")
      .delete()
      .eq("rfp_id", rfpId)
      .eq("user_id", userId);

    if (deleteError) {
      throw deleteError;
    }

    return NextResponse.json(
      {
        success: true,
        message: "Assignment removed successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing RFP assignment:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
