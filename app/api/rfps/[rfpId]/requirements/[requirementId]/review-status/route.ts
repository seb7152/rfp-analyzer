import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { checkRFPAccess } from "@/lib/permissions/rfp-access";
import type { PeerReviewStatus } from "@/types/peer-review";

// Transition matrix: [currentStatus, targetStatus] -> minimum access level required
type AccessLevel = "owner" | "evaluator" | "viewer" | "admin";

const ALLOWED_TRANSITIONS: Record<
  string,
  { target: PeerReviewStatus; minLevels: AccessLevel[] }[]
> = {
  draft: [
    {
      target: "submitted",
      minLevels: ["evaluator", "owner", "admin"],
    },
  ],
  rejected: [
    {
      target: "submitted",
      minLevels: ["evaluator", "owner", "admin"],
    },
  ],
  submitted: [
    { target: "approved", minLevels: ["owner", "admin"] },
    { target: "rejected", minLevels: ["owner", "admin"] },
  ],
  approved: [],
};

function canTransition(
  currentStatus: PeerReviewStatus,
  targetStatus: PeerReviewStatus,
  accessLevel: AccessLevel
): boolean {
  const transitions = ALLOWED_TRANSITIONS[currentStatus] ?? [];
  const transition = transitions.find((t) => t.target === targetStatus);
  if (!transition) return false;
  return transition.minLevels.includes(accessLevel);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { rfpId: string; requirementId: string } }
) {
  try {
    const { rfpId, requirementId } = params;

    if (!rfpId || !requirementId) {
      return NextResponse.json(
        { error: "rfpId and requirementId are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check access
    const { hasAccess, accessLevel } = await checkRFPAccess(rfpId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Parse body
    const body = await request.json();
    const {
      status: targetStatus,
      version_id: versionId,
      rejection_comment: rejectionComment,
    } = body as {
      status: PeerReviewStatus;
      version_id: string;
      rejection_comment?: string;
    };

    if (!targetStatus || !versionId) {
      return NextResponse.json(
        { error: "status and version_id are required" },
        { status: 400 }
      );
    }

    if (!["submitted", "approved", "rejected"].includes(targetStatus)) {
      return NextResponse.json(
        { error: "Invalid target status. Must be submitted, approved, or rejected." },
        { status: 400 }
      );
    }

    // Verify peer review is enabled on this RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("peer_review_enabled")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    if (!rfp.peer_review_enabled) {
      return NextResponse.json(
        { error: "Peer review is not enabled on this RFP" },
        { status: 400 }
      );
    }

    // Verify requirement belongs to this RFP
    const { data: requirement, error: reqError } = await supabase
      .from("requirements")
      .select("id")
      .eq("id", requirementId)
      .eq("rfp_id", rfpId)
      .single();

    if (reqError || !requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      );
    }

    // Get current review status (if any)
    const { data: existing } = await supabase
      .from("requirement_review_status")
      .select("id, status")
      .eq("requirement_id", requirementId)
      .eq("version_id", versionId)
      .single();

    const currentStatus: PeerReviewStatus = existing?.status ?? "draft";

    // Validate transition
    if (!canTransition(currentStatus, targetStatus, accessLevel!)) {
      return NextResponse.json(
        {
          error: `Transition from '${currentStatus}' to '${targetStatus}' is not allowed for your access level (${accessLevel}).`,
        },
        { status: 400 }
      );
    }

    // Build update payload
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = {
      requirement_id: requirementId,
      version_id: versionId,
      status: targetStatus,
      updated_at: now,
    };

    if (targetStatus === "submitted") {
      updatePayload.submitted_by = user.id;
      updatePayload.submitted_at = now;
      // Clear rejection data when resubmitting
      updatePayload.rejection_comment = null;
      updatePayload.reviewed_by = null;
      updatePayload.reviewed_at = null;
    } else if (targetStatus === "approved") {
      updatePayload.reviewed_by = user.id;
      updatePayload.reviewed_at = now;
      updatePayload.rejection_comment = null;
    } else if (targetStatus === "rejected") {
      updatePayload.reviewed_by = user.id;
      updatePayload.reviewed_at = now;
      updatePayload.rejection_comment = rejectionComment ?? null;
      // Per spec: rejected resets to draft on next submission, but DB stores 'rejected' temporarily
    }

    // Upsert
    const { data: reviewStatus, error: upsertError } = await supabase
      .from("requirement_review_status")
      .upsert(updatePayload, {
        onConflict: "requirement_id,version_id",
      })
      .select(
        "id, requirement_id, version_id, status, submitted_by, submitted_at, reviewed_by, reviewed_at, rejection_comment, updated_at"
      )
      .single();

    if (upsertError) {
      return NextResponse.json(
        { error: `Failed to update review status: ${upsertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ review_status: reviewStatus }, { status: 200 });
  } catch (error) {
    console.error("Error updating review status:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
