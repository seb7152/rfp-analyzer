import { NextRequest, NextResponse } from "next/server";
import { PILOT, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { triggerWorker } from "@/lib/agents/worker";
import { ensureSystemAgent } from "@/lib/soutenance/agents";
import { resolveTargetVersion } from "@/lib/soutenance/sessions";
import type { SoutenanceSessionRow } from "@/lib/soutenance/types";

export const dynamic = "force-dynamic";

/**
 * POST /api/rfps/[rfpId]/soutenances/[supplierId]/analyze — the compte rendu
 * of the transcript and, from it, the proposals on the requirements the
 * séance concerned, towards the target version. One job, then batches.
 */
export async function POST(request: NextRequest, { params }: { params: { rfpId: string; supplierId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    if (!process.env.OPENROUTER_API_KEY || !process.env.AGENT_WORKER_SECRET) {
      return NextResponse.json({ error: "La clé OpenRouter ou le secret du travailleur n'est pas configuré sur le serveur." }, { status: 503 });
    }
    const { data: sessionRow } = await supabase.from("soutenance_sessions").select("*").eq("rfp_id", params.rfpId).eq("supplier_id", params.supplierId).maybeSingle();
    const session = (sessionRow as SoutenanceSessionRow | null) ?? null;
    if (!session || !session.transcript_source || !Array.isArray(session.transcript_segments) || session.transcript_segments.length === 0) {
      return NextResponse.json({ error: "Chargez d'abord le transcript de la séance." }, { status: 409 });
    }
    const target = await resolveTargetVersion(supabase, params.rfpId);
    if (!target) return NextResponse.json({ error: "Aucune version d'évaluation active." }, { status: 409 });
    if (session.report_job_id) {
      const { data: job } = await supabase.from("ai_jobs").select("status").eq("id", session.report_job_id).maybeSingle();
      const status = (job as { status: string } | null)?.status;
      if (status === "pending" || status === "running") return NextResponse.json({ error: "L'analyse de cette séance est déjà en cours." }, { status: 409 });
    }
    const { count: running } = await supabase.from("agent_runs").select("id", { count: "exact", head: true }).eq("session_id", session.id).in("status", ["pending", "running"]);
    if (running && running > 0) return NextResponse.json({ error: "Les propositions de cette séance sont encore en cours de production." }, { status: 409 });

    const { data: rfp } = await supabase.from("rfps").select("organization_id").eq("id", params.rfpId).single();
    await ensureSystemAgent((rfp as { organization_id: string }).organization_id, "soutenance", user.id);
    const { data: job, error: jError } = await supabase
      .from("ai_jobs")
      .insert({
        rfp_id: params.rfpId,
        kind: "soutenance_report",
        payload: { session_id: session.id, supplier_id: params.supplierId, version_id: target.id },
        created_by: user.id,
      })
      .select("id")
      .single();
    if (jError || !job) throw new Error(`Travail non créé : ${jError?.message ?? "inconnu"}`);
    const { error: uError } = await supabase.from("soutenance_sessions").update({ report_job_id: job.id }).eq("id", session.id);
    if (uError) throw new Error(uError.message);
    await triggerWorker(request.nextUrl.origin);
    return NextResponse.json({ jobId: job.id, targetVersion: target }, { status: 202 });
  } catch (err) {
    return failure(err);
  }
}
