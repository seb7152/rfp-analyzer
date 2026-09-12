/**
 * A batch of a soutenance analysis: the requirements the compte rendu found
 * concerned, evaluated again with the transcript as context. Quotes are
 * verified word for word in the transcript and become timed evidence.
 */

import { z } from "zod";
import { findCatalogueModel } from "@/lib/agents/openrouter";
import { BATCH_JSON_SCHEMA, batchOutputSchema, extractJson, toHalfStep, type FindingOutput } from "@/lib/agents/schema";
import { findQuoteRange, verifyQuote } from "@/lib/agents/quotes";
import { parseTools } from "@/lib/agents/tools";
import { runConversation, type BatchOutcome } from "@/lib/agents/worker";
import type { Db } from "@/lib/agents/context";
import type { AgentRunBatch, FindingEvidence, FindingQuote, ReasoningEffort } from "@/lib/agents/types";
import { formatAt, transcriptPlainText, voiceLabel, type TranscriptSegment, type VoiceNames } from "@/lib/connectors/granola";
import { loadRfpEvalContext, normaliseCode, responseOf } from "./context";
import { buildSoutenanceBatchMessages, type SoutenanceBatchItem } from "./prompts";
import type { SoutenanceSessionRow } from "./types";

const MAX_TOKENS = 64_000;
const FALLBACK_MAX_TOKENS = 32_000;

const addressedSchema = z.array(z.object({ code: z.string(), at: z.string().nullable().default(null), why: z.string().nullable().default(null) }));

export interface SoutenanceRunRow {
  id: string;
  rfp_id: string;
  version_id: string;
  supplier_id: string;
  category_id: string;
  session_id: string | null;
  kind: string;
  agent_versions: { id: string; system_prompt: string; model_id: string; reasoning_effort: ReasoningEffort; tools: unknown } | null;
  suppliers: { name: string } | null;
}

/** Where a verified quote sits in the transcript: its turn's time and voice. */
function locateQuote(segments: TranscriptSegment[], quote: string): { at: string; voice: string } | null {
  for (const s of segments) {
    if (findQuoteRange(s.text, quote)) return { at: formatAt(s.t), voice: s.voice };
  }
  // A quote may straddle two turns: find it in the joined text, then the turn its start belongs to.
  const joined = transcriptPlainText(segments);
  const range = findQuoteRange(joined, quote);
  if (!range) return null;
  let offset = 0;
  for (const s of segments) {
    const end = offset + s.text.length;
    if (range.start < end) return { at: formatAt(s.t), voice: s.voice };
    offset = end + 1;
  }
  return null;
}

export function toSoutenanceFinding(
  runId: string,
  responseId: string,
  requirementId: string,
  out: FindingOutput,
  segments: TranscriptSegment[],
  voiceNames: VoiceNames
) {
  const text = transcriptPlainText(segments);
  const quotes: FindingQuote[] = [];
  const evidence: FindingEvidence[] = [];
  for (const raw of out.quotes) {
    const q = raw.trim();
    if (!q) continue;
    const verified = verifyQuote(text, q);
    quotes.push({ text: q, verified });
    const where = verified ? locateQuote(segments, q) : null;
    evidence.push({ type: "transcript", text: q, at: where?.at ?? null, voice: where ? voiceLabel(where.voice, voiceNames) : null, verified });
  }
  return {
    run_id: runId,
    response_id: responseId,
    requirement_id: requirementId,
    verdict: out.verdict,
    proposed_score: out.verdict === "non_repondu" ? 0 : toHalfStep(out.proposed_score),
    justification: out.justification.trim(),
    quotes,
    questions: out.questions.map((q) => q.trim()).filter(Boolean),
    risks: out.risks.map((r) => r.trim()).filter(Boolean),
    // Unchanged evaluation ("the séance said nothing") needs no quote.
    sourced: quotes.length === 0 ? true : quotes.some((q) => q.verified),
    evidence,
    status: "proposed" as const,
  };
}

/**
 * Runs one batch of a soutenance analysis and writes its proposals. Same
 * conversation engine as the domain analyses, without tools.
 */
export async function runSoutenanceBatch(db: Db, batch: AgentRunBatch, run: SoutenanceRunRow, deadlineMs: number): Promise<BatchOutcome> {
  const agentVersion = run.agent_versions;
  if (!agentVersion) return { status: "failed", error: "Version d'agent introuvable." };
  if (!run.session_id) return { status: "failed", error: "Séance introuvable pour cette analyse." };
  const { data: session, error: sError } = await db.from("soutenance_sessions").select("*").eq("id", run.session_id).maybeSingle();
  if (sError || !session) return { status: "failed", error: `Séance illisible : ${sError?.message ?? "introuvable"}` };
  const s = session as SoutenanceSessionRow;
  const segments = Array.isArray(s.transcript_segments) ? s.transcript_segments : [];
  if (segments.length === 0) return { status: "failed", error: "La séance n'a pas de transcript." };

  const ctx = await loadRfpEvalContext(db, run.rfp_id, run.version_id);
  const { data: jobRow } = s.report_job_id ? await db.from("ai_jobs").select("result").eq("id", s.report_job_id).maybeSingle() : { data: null };
  const addressed = addressedSchema.safeParse((jobRow as { result?: { addressed?: unknown } } | null)?.result?.addressed ?? []);
  const whyOf = new Map<string, { why: string | null; at: string | null }>();
  if (addressed.success) for (const a of addressed.data) whyOf.set(normaliseCode(a.code), { why: a.why, at: a.at });

  const { data: existing } = await db.from("agent_findings").select("requirement_id").eq("run_id", run.id).in("requirement_id", batch.requirement_ids);
  const alreadyDone = new Set(((existing ?? []) as Array<{ requirement_id: string }>).map((f) => f.requirement_id));

  const items: SoutenanceBatchItem[] = [];
  for (const id of batch.requirement_ids) {
    if (alreadyDone.has(id)) continue;
    const req = ctx.requirements.find((r) => r.id === id);
    if (!req) continue;
    const resp = responseOf(ctx, req.id, run.supplier_id);
    if (!resp) continue; // no response row on the target version: nothing to attach a proposal to
    const meta = whyOf.get(normaliseCode(req.code));
    items.push({ req, resp, why: meta?.why ?? null, at: meta?.at ?? null });
  }
  if (items.length === 0) return { status: "completed", error: null };

  const started = Date.now();
  const catalogueModel = await findCatalogueModel(agentVersion.model_id);
  const structured = catalogueModel?.structured_outputs ?? false;
  const maxTokens = catalogueModel?.max_completion_tokens ? Math.min(MAX_TOKENS, catalogueModel.max_completion_tokens) : FALLBACK_MAX_TOKENS;
  const messages = buildSoutenanceBatchMessages({
    systemPrompt: agentVersion.system_prompt,
    modelId: agentVersion.model_id,
    supplierName: run.suppliers?.name ?? "Fournisseur",
    segments,
    voiceNames: s.voice_names ?? {},
    items,
    ctx,
    supplierId: run.supplier_id,
  });
  const result = await runConversation(db, batch, {
    model: agentVersion.model_id,
    reasoning: agentVersion.reasoning_effort,
    tools: parseTools({ enabled: [] }),
    jsonSchema: structured ? (BATCH_JSON_SCHEMA as unknown as Record<string, unknown>) : null,
    maxTokens,
    price: catalogueModel,
    initialMessages: messages,
    deadline: started + deadlineMs,
  });
  const outcome: BatchOutcome = {
    status: "completed",
    error: null,
    usage: result.usage,
    served_model: result.served_model,
    generation_id: result.generation_id,
    raw_output: result.content,
    turns: result.turns,
  };
  if (result.checkpoint) return { ...outcome, status: "pending", raw_output: null, checkpoint: result.checkpoint };
  if (result.finish_reason && result.finish_reason !== "stop" && result.finish_reason !== "end_turn") {
    return { ...outcome, status: "failed", error: `Génération interrompue (finish_reason = ${result.finish_reason}).` };
  }
  let parsed;
  try {
    parsed = batchOutputSchema.parse(extractJson(result.content));
  } catch (err) {
    return { ...outcome, status: "failed", error: `Sortie du modèle invalide : ${(err as Error).message.slice(0, 500)}` };
  }
  outcome.raw_output = parsed;
  const byCode = new Map(items.map((i) => [normaliseCode(i.req.code), i]));
  const seen = new Set<string>();
  const findings = [];
  for (const out of parsed.findings) {
    const item = byCode.get(normaliseCode(out.requirement_id_external));
    if (!item || seen.has(item.req.id)) continue;
    seen.add(item.req.id);
    findings.push(toSoutenanceFinding(run.id, item.resp!.id, item.req.id, out, segments, s.voice_names ?? {}));
  }
  const missing = items.filter((i) => !seen.has(i.req.id)).map((i) => i.req.code);
  if (findings.length > 0) {
    const { error } = await db.from("agent_findings").upsert(findings, { onConflict: "run_id,response_id", ignoreDuplicates: true });
    if (error) return { ...outcome, status: "failed", error: `Propositions non enregistrées : ${error.message}` };
  }
  if (missing.length > 0) return { ...outcome, status: "failed", error: `Le modèle n'a pas produit de proposition pour : ${missing.join(", ")}.` };
  return outcome;
}
