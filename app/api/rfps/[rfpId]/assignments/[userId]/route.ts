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

/**
 * PATCH /api/rfps/[rfpId]/assignments/[userId] — change the access level of
 * an analyst on the consultation (owner, evaluator, viewer). Pilots only.
 */
export async function PATCH(request: NextRequest, { params }: { params: { rfpId: string; userId: string } }) {
  const { rfpId, userId } = params;
  const supabase = await createServerClient();
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  const { requireRfpAccess, PILOT } = await import("@/lib/agents/auth");
  const access = await requireRfpAccess(rfpId, currentUser.id, PILOT);
  if (access.error) return access.error;

  const body = (await request.json().catch(() => null)) as { access_level?: string } | null;
  const level = body?.access_level;
  if (level !== "owner" && level !== "evaluator" && level !== "viewer") {
    return NextResponse.json({ error: "Niveau d'accès invalide." }, { status: 400 });
  }
  const { data: updated, error } = await supabase
    .from("rfp_user_assignments")
    .update({ access_level: level })
    .eq("rfp_id", rfpId)
    .eq("user_id", userId)
    .select("id, rfp_id, user_id, access_level, assigned_at, assigned_by")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!updated) return NextResponse.json({ error: "Affectation introuvable." }, { status: 404 });
  return NextResponse.json({ assignment: updated });
}
