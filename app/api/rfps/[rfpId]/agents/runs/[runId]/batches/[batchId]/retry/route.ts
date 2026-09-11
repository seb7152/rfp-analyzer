import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { PILOT, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { triggerWorker } from "@/lib/agents/worker";

export const dynamic = "force-dynamic";

/** POST — puts a failed batch back in the queue, alone (consultation owner). */
export async function POST(request: NextRequest, { params }: { params: { rfpId: string; runId: string; batchId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;

    const { data: batch, error: batchError } = await supabase
      .from("agent_run_batches")
      .select("id, status, agent_runs!inner(id, rfp_id)")
      .eq("id", params.batchId)
      .eq("run_id", params.runId)
      .eq("agent_runs.rfp_id", params.rfpId)
      .maybeSingle();
    if (batchError) throw new Error(batchError.message);
    if (!batch) return NextResponse.json({ error: "Lot introuvable." }, { status: 404 });
    if (batch.status !== "failed") return NextResponse.json({ error: "Seul un lot en erreur se relance." }, { status: 409 });

    const { error: updateError } = await supabase
      .from("agent_run_batches")
      .update({ status: "pending", attempts: 0, error: null, claimed_at: null, completed_at: null })
      .eq("id", params.batchId);
    if (updateError) throw new Error(updateError.message);
    const { error: runError } = await supabase.from("agent_runs").update({ status: "running", completed_at: null }).eq("id", params.runId);
    if (runError) throw new Error(runError.message);

    waitUntil(triggerWorker(request.nextUrl.origin));
    return NextResponse.json({ success: true }, { status: 202 });
  } catch (err) {
    return failure(err);
  }
}
