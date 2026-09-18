import { NextRequest, NextResponse } from "next/server";
import { PILOT, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";

export const dynamic = "force-dynamic";

/** DELETE — removes an assignment (consultation owner). */
export async function DELETE(_request: NextRequest, { params }: { params: { rfpId: string; assignmentId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    const { error: deleteError, count } = await supabase
      .from("rfp_agent_assignments")
      .delete({ count: "exact" })
      .eq("id", params.assignmentId)
      .eq("rfp_id", params.rfpId);
    if (deleteError) throw new Error(deleteError.message);
    if (!count) return NextResponse.json({ error: "Affectation introuvable." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    return failure(err);
  }
}
