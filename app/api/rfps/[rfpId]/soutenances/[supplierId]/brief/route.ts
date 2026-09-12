import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PILOT, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { loadActiveVersion } from "@/lib/agents/context";
import { triggerWorker } from "@/lib/agents/worker";
import { ensureSystemAgent } from "@/lib/soutenance/agents";
import { ensureSession } from "@/lib/soutenance/sessions";
import { BRIEF_STATUSES, DEFAULT_BRIEF_STATUSES } from "@/lib/soutenance/types";

export const dynamic = "force-dynamic";

const postSchema = z.object({
  statuses: z.array(z.enum(BRIEF_STATUSES)).min(1).default(DEFAULT_BRIEF_STATUSES),
});

/**
 * POST /api/rfps/[rfpId]/soutenances/[supplierId]/brief — generates the
 * brief of the séance on the active version, as a job of the worker.
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
    const parsed = postSchema.safeParse((await request.json().catch(() => ({}))) ?? {});
    if (!parsed.success) return NextResponse.json({ error: "Statuts invalides." }, { status: 400 });
    const version = await loadActiveVersion(supabase, params.rfpId);
    if (!version) return NextResponse.json({ error: "Aucune version d'évaluation active." }, { status: 409 });
    const session = await ensureSession(supabase, params.rfpId, params.supplierId, user.id);
    const { data: rfp } = await supabase.from("rfps").select("organization_id").eq("id", params.rfpId).single();
    const agent = await ensureSystemAgent((rfp as { organization_id: string }).organization_id, "soutenance", user.id);

    const { data: running } = await supabase.from("soutenance_briefs").select("id").eq("session_id", session.id).in("status", ["pending", "processing"]).limit(1);
    if (running && running.length > 0) return NextResponse.json({ error: "Un brief est déjà en cours de génération pour cette séance." }, { status: 409 });

    const { data: brief, error: bError } = await supabase
      .from("soutenance_briefs")
      .insert({
        rfp_id: params.rfpId,
        supplier_id: params.supplierId,
        version_id: version.id,
        session_id: session.id,
        correlation_id: `brief-${session.id}-${Date.now()}`,
        status: "pending",
        target_statuses: parsed.data.statuses,
        model_id: agent.model_id,
        generated_by: user.id,
      })
      .select("id")
      .single();
    if (bError || !brief) throw new Error(`Brief non créé : ${bError?.message ?? "inconnu"}`);
    const { data: job, error: jError } = await supabase
      .from("ai_jobs")
      .insert({
        rfp_id: params.rfpId,
        kind: "brief",
        payload: { brief_id: brief.id, session_id: session.id, supplier_id: params.supplierId, version_id: version.id, statuses: parsed.data.statuses },
        created_by: user.id,
      })
      .select("id")
      .single();
    if (jError || !job) throw new Error(`Travail non créé : ${jError?.message ?? "inconnu"}`);
    await supabase.from("soutenance_briefs").update({ job_id: job.id }).eq("id", brief.id);
    await triggerWorker(request.nextUrl.origin);
    return NextResponse.json({ briefId: brief.id, jobId: job.id }, { status: 202 });
  } catch (err) {
    return failure(err);
  }
}

const patchSchema = z.object({ brief_id: z.string().uuid(), report_markdown: z.string().max(200_000) });

/** PATCH — hand edit of the brief (pilots). */
export async function PATCH(request: NextRequest, { params }: { params: { rfpId: string; supplierId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    const { data: updated, error: uError } = await supabase
      .from("soutenance_briefs")
      .update({ report_markdown: parsed.data.report_markdown.trim() || null, edited_at: new Date().toISOString() })
      .eq("id", parsed.data.brief_id)
      .eq("rfp_id", params.rfpId)
      .eq("supplier_id", params.supplierId)
      .select("id, report_markdown, edited_at")
      .maybeSingle();
    if (uError) throw new Error(uError.message);
    if (!updated) return NextResponse.json({ error: "Brief introuvable." }, { status: 404 });
    return NextResponse.json({ brief: updated });
  } catch (err) {
    return failure(err);
  }
}
