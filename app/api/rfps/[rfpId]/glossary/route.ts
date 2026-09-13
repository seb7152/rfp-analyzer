import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EVALUATOR, PILOT, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { loadActiveVersion } from "@/lib/agents/context";
import { triggerWorker } from "@/lib/agents/worker";
import { ensureSystemAgent } from "@/lib/soutenance/agents";
import { MAX_ALIASES, MAX_TERMS, cleanTerms, loadGlossary } from "@/lib/soutenance/glossary";
import type { GlossaryTerm } from "@/lib/soutenance/types";

export const dynamic = "force-dynamic";

async function jobOf(db: Parameters<typeof loadGlossary>[0], jobId: string | null) {
  if (!jobId) return null;
  const { data } = await db.from("ai_jobs").select("id, status, error, cost, completed_at").eq("id", jobId).maybeSingle();
  return (data as { id: string; status: string; error: string | null; cost: number; completed_at: string | null } | null) ?? null;
}

/** GET /api/rfps/[rfpId]/glossary — the consultation's vocabulary and the state of its extraction. */
export async function GET(_request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, EVALUATOR);
    if (access.error) return access.error;
    const glossary = await loadGlossary(supabase, params.rfpId);
    const job = await jobOf(supabase, glossary?.job_id ?? null);
    return NextResponse.json({ glossary, job });
  } catch (err) {
    return failure(err);
  }
}

const termSchema = z.object({
  term: z.string().trim().min(1).max(80),
  aliases: z.array(z.string().trim().max(80)).max(MAX_ALIASES).default([]),
  note: z.string().trim().max(120).default(""),
  source: z.enum(["agent", "manual"]).default("manual"),
});
const putSchema = z.object({ terms: z.array(termSchema).max(MAX_TERMS) });

/** PUT — replaces the list of terms (pilots): the hand-kept vocabulary. */
export async function PUT(request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    const parsed = putSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    const terms: GlossaryTerm[] = cleanTerms(parsed.data.terms);
    const { error: uError } = await supabase.from("rfp_glossaries").upsert({ rfp_id: params.rfpId, terms, edited_at: new Date().toISOString() }, { onConflict: "rfp_id" });
    if (uError) throw new Error(uError.message);
    const glossary = await loadGlossary(supabase, params.rfpId);
    return NextResponse.json({ glossary, job: await jobOf(supabase, glossary?.job_id ?? null) });
  } catch (err) {
    return failure(err);
  }
}

/** POST — (re)extracts the vocabulary from the référentiel and the offers, as a job of the worker (pilots). */
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
    const existing = await loadGlossary(supabase, params.rfpId);
    const running = await jobOf(supabase, existing?.job_id ?? null);
    if (running && (running.status === "pending" || running.status === "running")) {
      return NextResponse.json({ error: "Le vocabulaire est déjà en cours d'extraction." }, { status: 409 });
    }
    const { data: rfp } = await supabase.from("rfps").select("organization_id").eq("id", params.rfpId).single();
    await ensureSystemAgent((rfp as { organization_id: string }).organization_id, "vocabulaire", user.id);
    const { data: job, error: jError } = await supabase
      .from("ai_jobs")
      .insert({ rfp_id: params.rfpId, kind: "glossary", payload: { version_id: version.id }, created_by: user.id })
      .select("id")
      .single();
    if (jError || !job) throw new Error(`Travail non créé : ${jError?.message ?? "inconnu"}`);
    const { error: uError } = await supabase.from("rfp_glossaries").upsert({ rfp_id: params.rfpId, job_id: job.id, error: null }, { onConflict: "rfp_id" });
    if (uError) throw new Error(uError.message);
    await triggerWorker(request.nextUrl.origin);
    return NextResponse.json({ jobId: job.id }, { status: 202 });
  } catch (err) {
    return failure(err);
  }
}
