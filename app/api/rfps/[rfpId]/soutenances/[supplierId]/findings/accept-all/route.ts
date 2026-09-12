import { NextRequest, NextResponse } from "next/server";
import { EVALUATOR, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";

export const dynamic = "force-dynamic";

/**
 * POST /api/rfps/[rfpId]/soutenances/[supplierId]/findings/accept-all —
 * « Tout reprendre » : every proposal of the séance still open is accepted,
 * one by one through the same function as a single acceptance, under the
 * caller's rights. Reports how many went through.
 */
export async function POST(_request: NextRequest, { params }: { params: { rfpId: string; supplierId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, EVALUATOR);
    if (access.error) return access.error;
    const { data: session } = await supabase.from("soutenance_sessions").select("id").eq("rfp_id", params.rfpId).eq("supplier_id", params.supplierId).maybeSingle();
    if (!session) return NextResponse.json({ error: "Séance introuvable." }, { status: 404 });
    const { data: rows, error: fError } = await supabase
      .from("agent_findings")
      .select("id, agent_runs!inner(session_id)")
      .eq("agent_runs.session_id", (session as { id: string }).id)
      .eq("status", "proposed");
    if (fError) throw new Error(fError.message);
    const ids = ((rows ?? []) as Array<{ id: string }>).map((r) => r.id);
    let accepted = 0;
    const errors: string[] = [];
    for (const id of ids) {
      const { error: aError } = await supabase.rpc("accept_agent_finding", { p_finding_id: id });
      if (aError) errors.push(aError.message.replace(/^.*?: /, ""));
      else accepted++;
    }
    if (accepted === 0 && errors.length > 0) {
      const forbidden = /évaluateur ou pilote|Non authentifié/.test(errors[0]);
      return NextResponse.json({ error: errors[0] }, { status: forbidden ? 403 : 500 });
    }
    return NextResponse.json({ accepted, failed: errors.length, total: ids.length });
  } catch (err) {
    return failure(err);
  }
}
