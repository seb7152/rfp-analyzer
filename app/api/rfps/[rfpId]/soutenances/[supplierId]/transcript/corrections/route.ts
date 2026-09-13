import { NextRequest, NextResponse } from "next/server";
import { creditsGuard } from "@/lib/agents/credits";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { PILOT, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { triggerWorker } from "@/lib/agents/worker";
import { ensureSystemAgent } from "@/lib/soutenance/agents";
import type { TranscriptCorrection } from "@/lib/soutenance/transcript";
import type { SoutenanceSessionRow } from "@/lib/soutenance/types";

export const dynamic = "force-dynamic";

async function loadSession(db: SupabaseClient, rfpId: string, supplierId: string) {
  const { data } = await db.from("soutenance_sessions").select("*").eq("rfp_id", rfpId).eq("supplier_id", supplierId).maybeSingle();
  return (data as SoutenanceSessionRow | null) ?? null;
}

/**
 * POST /api/rfps/[rfpId]/soutenances/[supplierId]/transcript/corrections —
 * the targeted pass: the glossary's substitutions, then the agent's
 * replacements, as a job of the worker. Hand edits are kept.
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
    const credits = await creditsGuard();
    if (credits) return credits;
    const session = await loadSession(supabase, params.rfpId, params.supplierId);
    if (!session || !Array.isArray(session.transcript_segments) || session.transcript_segments.length === 0) {
      return NextResponse.json({ error: "Chargez d'abord le transcript de la séance." }, { status: 409 });
    }
    if (session.transcript_fix_job_id) {
      const { data: job } = await supabase.from("ai_jobs").select("status").eq("id", session.transcript_fix_job_id).maybeSingle();
      const status = (job as { status: string } | null)?.status;
      if (status === "pending" || status === "running") return NextResponse.json({ error: "La correction de ce transcript est déjà en cours." }, { status: 409 });
    }
    const { data: rfp } = await supabase.from("rfps").select("organization_id").eq("id", params.rfpId).single();
    await ensureSystemAgent((rfp as { organization_id: string }).organization_id, "vocabulaire", user.id);
    const { data: job, error: jError } = await supabase
      .from("ai_jobs")
      .insert({ rfp_id: params.rfpId, kind: "transcript_fix", payload: { session_id: session.id, supplier_id: params.supplierId }, created_by: user.id })
      .select("id")
      .single();
    if (jError || !job) throw new Error(`Travail non créé : ${jError?.message ?? "inconnu"}`);
    const { error: uError } = await supabase.from("soutenance_sessions").update({ transcript_fix_job_id: job.id }).eq("id", session.id);
    if (uError) throw new Error(uError.message);
    await triggerWorker(request.nextUrl.origin);
    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (err) {
    return failure(err);
  }
}

const correctionSchema = z.object({
  i: z.number().int().min(0),
  from: z.string().min(1).max(400),
  to: z.string().max(400),
  n: z.number().int().min(0).optional(),
  by: z.enum(["glossary", "agent", "manual"]),
});
const patchSchema = z.object({ corrections: z.array(correctionSchema).max(5_000) });

/** PATCH — the whole corrections list, after a hand edit or a removal (pilots). */
export async function PATCH(request: NextRequest, { params }: { params: { rfpId: string; supplierId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    const session = await loadSession(supabase, params.rfpId, params.supplierId);
    if (!session) return NextResponse.json({ error: "Aucune séance." }, { status: 404 });
    const count = Array.isArray(session.transcript_segments) ? session.transcript_segments.length : 0;
    const corrections: TranscriptCorrection[] = parsed.data.corrections.filter((c) => c.i < count);
    const { data: updated, error: uError } = await supabase.from("soutenance_sessions").update({ transcript_corrections: corrections }).eq("id", session.id).select("*").single();
    if (uError) throw new Error(uError.message);
    return NextResponse.json({ session: updated });
  } catch (err) {
    return failure(err);
  }
}
