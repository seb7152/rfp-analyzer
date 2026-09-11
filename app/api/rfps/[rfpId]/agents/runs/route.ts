import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { PILOT, READER, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { loadActiveVersion } from "@/lib/agents/context";
import { createRuns, planRuns } from "@/lib/agents/plan";
import { triggerWorker } from "@/lib/agents/worker";

export const dynamic = "force-dynamic";

/**
 * GET /api/rfps/[rfpId]/agents/runs?versionId=… — the analyses of a version
 * with their batches, and the proposals summary per agent. No external call.
 */
export async function GET(request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, READER);
    if (access.error) return access.error;

    let versionId = request.nextUrl.searchParams.get("versionId");
    if (!versionId) versionId = (await loadActiveVersion(supabase, params.rfpId))?.id ?? null;
    if (!versionId) return NextResponse.json({ runs: [], summary: [], access: access.access });

    const { data: runs, error: runsError } = await supabase
      .from("agent_runs")
      .select(
        "*, agent_versions(id, version_number, model_id, agents(id, name)), suppliers(id, name), categories(id, code, title), agent_run_batches(*)"
      )
      .eq("rfp_id", params.rfpId)
      .eq("version_id", versionId)
      .order("created_at", { ascending: false });
    if (runsError) throw new Error(runsError.message);

    const runIds = (runs ?? []).map((r) => r.id);
    let findings: Array<{ run_id: string; status: string; sourced: boolean }> = [];
    if (runIds.length > 0) {
      const { data, error: fError } = await supabase.from("agent_findings").select("run_id, status, sourced").in("run_id", runIds);
      if (fError) throw new Error(fError.message);
      findings = (data ?? []) as typeof findings;
    }

    const agentOfRun = new Map<string, { id: string; name: string }>();
    for (const r of (runs ?? []) as Array<{ id: string; agent_versions: { agents: { id: string; name: string } | null } | null }>) {
      const a = r.agent_versions?.agents;
      if (a) agentOfRun.set(r.id, a);
    }
    const summary = new Map<string, { agent_id: string; agent_name: string; produced: number; unsourced: number; accepted: number; rejected: number; proposed: number }>();
    for (const f of findings) {
      const a = agentOfRun.get(f.run_id);
      if (!a) continue;
      const s = summary.get(a.id) ?? { agent_id: a.id, agent_name: a.name, produced: 0, unsourced: 0, accepted: 0, rejected: 0, proposed: 0 };
      if (f.status !== "obsolete") {
        s.produced++;
        if (!f.sourced) s.unsourced++;
        if (f.status === "accepted") s.accepted++;
        if (f.status === "rejected") s.rejected++;
        if (f.status === "proposed") s.proposed++;
      }
      summary.set(a.id, s);
    }
    const perRun = new Map<string, { produced: number; unsourced: number }>();
    for (const f of findings) {
      if (f.status === "obsolete") continue;
      const p = perRun.get(f.run_id) ?? { produced: 0, unsourced: 0 };
      p.produced++;
      if (!f.sourced) p.unsourced++;
      perRun.set(f.run_id, p);
    }

    return NextResponse.json({
      access: access.access,
      versionId,
      runs: (runs ?? []).map((r) => ({
        ...r,
        agent_run_batches: [...(r.agent_run_batches ?? [])].sort((a: { batch_index: number }, b: { batch_index: number }) => a.batch_index - b.batch_index),
        findings: perRun.get(r.id) ?? { produced: 0, unsourced: 0 },
      })),
      summary: Array.from(summary.values()).sort((a, b) => a.agent_name.localeCompare(b.agent_name)),
    });
  } catch (err) {
    return failure(err);
  }
}

/**
 * POST /api/rfps/[rfpId]/agents/runs — launches the analyses on the active
 * version: creates them pending and triggers the worker without waiting.
 */
export async function POST(request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    if (!process.env.OPENROUTER_API_KEY || !process.env.AGENT_WORKER_SECRET) {
      return NextResponse.json({ error: "La clé OpenRouter ou le secret du travailleur n'est pas configuré sur le serveur." }, { status: 503 });
    }
    const version = await loadActiveVersion(supabase, params.rfpId);
    if (!version) return NextResponse.json({ error: "Aucune version d'évaluation active." }, { status: 409 });
    const planned = await planRuns(supabase, params.rfpId, version.id);
    if (planned.length === 0) {
      return NextResponse.json({ error: "Rien à analyser : affectez un agent à un domaine qui a des réponses." }, { status: 409 });
    }
    const runIds = await createRuns(supabase, params.rfpId, version.id, user.id, planned);
    waitUntil(triggerWorker(request.nextUrl.origin));
    return NextResponse.json({ runIds, versionId: version.id }, { status: 202 });
  } catch (err) {
    return failure(err);
  }
}
