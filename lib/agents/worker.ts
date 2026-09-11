/**
 * The background worker: claims pending batches, runs each one against
 * OpenRouter, verifies the quotes, writes the proposals, derives the run's
 * state. Runs with the service role; never called by a browser.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { describeDomain, loadCategories, loadLeaves, loadResponses, subtreeIds, type Db } from "./context";
import { buildMessages, type DomainDescription } from "./prompt";
import { BATCH_JSON_SCHEMA, batchOutputSchema, extractJson, toHalfStep, type FindingOutput } from "./schema";
import { CompletionTimeoutError, OpenRouterError, findCatalogueModel, streamChatCompletion } from "./openrouter";
import { verifyQuote } from "./quotes";
import type { AgentRunBatch, FindingQuote, ReasoningEffort, RunStatus } from "./types";

/** Well under Vercel's 300 s: leaves time to persist the result. */
export const BATCH_TIMEOUT_MS = 240_000;
/** Batches taken per worker invocation; they run in parallel. */
export const CLAIM_LIMIT = 4;
/** Past this, a `running` batch is considered lost and goes back to pending. */
export const STALE_AFTER_SECONDS = 300;
export const MAX_ATTEMPTS = 3;
const MAX_TOKENS = 32_000;

const RETRIABLE_HTTP = new Set([408, 429, 500, 502, 503, 524, 529]);

interface RunContext {
  run: {
    id: string;
    rfp_id: string;
    version_id: string;
    supplier_id: string;
    category_id: string;
    agent_versions: { id: string; system_prompt: string; model_id: string; reasoning_effort: ReasoningEffort } | null;
    suppliers: { name: string } | null;
  };
  domain: DomainDescription;
  responses: Map<string, { id: string; requirement_id: string; response_text: string | null }>;
}

async function loadRunContext(db: Db, runId: string): Promise<RunContext> {
  const { data: run, error } = await db
    .from("agent_runs")
    .select("id, rfp_id, version_id, supplier_id, category_id, agent_versions(id, system_prompt, model_id, reasoning_effort), suppliers(name)")
    .eq("id", runId)
    .single();
  if (error || !run) throw new Error(`Analyse introuvable : ${error?.message ?? runId}`);
  const r = run as unknown as RunContext["run"];
  const categories = await loadCategories(db, r.rfp_id);
  const leaves = await loadLeaves(db, r.rfp_id, subtreeIds(categories, r.category_id));
  const domain = describeDomain(categories, r.category_id, leaves);
  const responses = await loadResponses(db, r.version_id, r.supplier_id, domain.leaves.map((l) => l.id));
  return { run: r, domain, responses };
}

type FindingInsert = {
  run_id: string;
  response_id: string;
  requirement_id: string;
  verdict: string;
  proposed_score: number;
  justification: string;
  quotes: FindingQuote[];
  questions: string[];
  risks: string[];
  sourced: boolean;
  status: "proposed";
};

function toFinding(runId: string, responseId: string, requirementId: string, out: FindingOutput, responseText: string | null): FindingInsert {
  const quotes: FindingQuote[] = out.quotes
    .map((q) => q.trim())
    .filter(Boolean)
    .map((text) => ({ text, verified: verifyQuote(responseText, text) }));
  const notAnswered = out.verdict === "non_repondu";
  return {
    run_id: runId,
    response_id: responseId,
    requirement_id: requirementId,
    verdict: out.verdict,
    proposed_score: notAnswered ? 0 : toHalfStep(out.proposed_score),
    justification: out.justification.trim(),
    quotes,
    questions: out.questions.map((q) => q.trim()).filter(Boolean),
    risks: out.risks.map((r) => r.trim()).filter(Boolean),
    // A "non répondu" proposal needs no quote; any other is sourced only when
    // at least one quote was found verbatim in the response.
    sourced: notAnswered ? true : quotes.some((q) => q.verified),
    status: "proposed",
  };
}

function notAnsweredFinding(runId: string, responseId: string, requirementId: string): FindingInsert {
  return {
    run_id: runId,
    response_id: responseId,
    requirement_id: requirementId,
    verdict: "non_repondu",
    proposed_score: 0,
    justification: "Aucune réponse du fournisseur sur cette exigence.",
    quotes: [],
    questions: [],
    risks: [],
    sourced: true,
    status: "proposed",
  };
}

/** Derives the run's state from its batches and stores the aggregates. */
export async function refreshRunStatus(db: Db, runId: string): Promise<RunStatus> {
  const { data: batches, error } = await db
    .from("agent_run_batches")
    .select("status, prompt_tokens, completion_tokens, cached_tokens, cost, served_model, generation_id, error, started_at, completed_at")
    .eq("run_id", runId);
  if (error) throw new Error(`Lots illisibles : ${error.message}`);
  const rows = (batches ?? []) as Array<Pick<AgentRunBatch, "status" | "prompt_tokens" | "completion_tokens" | "cached_tokens" | "cost" | "served_model" | "generation_id" | "error" | "started_at" | "completed_at">>;
  const counts = { pending: 0, running: 0, completed: 0, failed: 0 };
  for (const b of rows) counts[b.status]++;
  let status: RunStatus;
  if (counts.running > 0 || (counts.pending > 0 && counts.completed + counts.failed > 0)) status = "running";
  else if (counts.pending > 0) status = "pending";
  else if (counts.failed === 0) status = "completed";
  else if (counts.completed > 0) status = "partial";
  else status = "failed";
  const done = status === "completed" || status === "partial" || status === "failed";
  const served = rows.map((b) => b.served_model).filter(Boolean).pop() ?? null;
  const firstError = rows.map((b) => b.error).filter(Boolean)[0] ?? null;
  const startedAt = rows.map((b) => b.started_at).filter(Boolean).sort()[0] ?? null;
  const { error: updateError } = await db
    .from("agent_runs")
    .update({
      status,
      served_model: served,
      generation_id: rows.map((b) => b.generation_id).filter(Boolean).pop() ?? null,
      prompt_tokens: rows.reduce((n, b) => n + (b.prompt_tokens ?? 0), 0),
      completion_tokens: rows.reduce((n, b) => n + (b.completion_tokens ?? 0), 0),
      cached_tokens: rows.reduce((n, b) => n + (b.cached_tokens ?? 0), 0),
      cost: rows.reduce((n, b) => n + Number(b.cost ?? 0), 0),
      error: status === "partial" || status === "failed" ? firstError : null,
      started_at: startedAt,
      completed_at: done ? new Date().toISOString() : null,
    })
    .eq("id", runId);
  if (updateError) throw new Error(`Analyse non mise à jour : ${updateError.message}`);
  return status;
}

interface BatchOutcome {
  status: "completed" | "failed" | "pending";
  error: string | null;
  usage?: { prompt_tokens: number; completion_tokens: number; cached_tokens: number; cost: number };
  served_model?: string | null;
  generation_id?: string | null;
  raw_output?: unknown;
}

async function runBatch(db: Db, batch: AgentRunBatch): Promise<BatchOutcome> {
  const ctx = await loadRunContext(db, batch.run_id);
  const agentVersion = ctx.run.agent_versions;
  if (!agentVersion) return { status: "failed", error: "Version d'agent introuvable." };

  const leafById = new Map(ctx.domain.leaves.map((l) => [l.id, l]));
  const targets = batch.requirement_ids.map((id) => leafById.get(id)).filter((l): l is NonNullable<typeof l> => !!l);
  const findings: FindingInsert[] = [];
  const toAsk: typeof targets = [];
  for (const leaf of targets) {
    const response = ctx.responses.get(leaf.id);
    if (!response) continue; // no response row on this version: nothing to attach a proposal to
    if (!response.response_text || !response.response_text.trim()) {
      findings.push(notAnsweredFinding(ctx.run.id, response.id, leaf.id));
    } else {
      toAsk.push(leaf);
    }
  }

  let outcome: BatchOutcome = { status: "completed", error: null };
  if (toAsk.length > 0) {
    const catalogueModel = await findCatalogueModel(agentVersion.model_id);
    const structured = catalogueModel?.structured_outputs ?? false;
    const messages = buildMessages({
      systemPrompt: agentVersion.system_prompt,
      modelId: agentVersion.model_id,
      domain: ctx.domain,
      supplierName: ctx.run.suppliers?.name ?? "Fournisseur",
      responseText: (id) => ctx.responses.get(id)?.response_text ?? null,
      targetCodes: toAsk.map((l) => l.code),
    });
    const result = await streamChatCompletion({
      model: agentVersion.model_id,
      messages,
      reasoning: agentVersion.reasoning_effort,
      jsonSchema: structured ? (BATCH_JSON_SCHEMA as unknown as Record<string, unknown>) : null,
      maxTokens: MAX_TOKENS,
      timeoutMs: BATCH_TIMEOUT_MS,
    });
    outcome = {
      status: "completed",
      error: null,
      usage: {
        prompt_tokens: result.usage.prompt_tokens,
        completion_tokens: result.usage.completion_tokens,
        cached_tokens: result.usage.cached_tokens,
        cost: result.usage.cost,
      },
      served_model: result.model,
      generation_id: result.id,
      raw_output: result.content,
    };
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
    const byCode = new Map(toAsk.map((l) => [l.code, l]));
    const seen = new Set<string>();
    for (const out of parsed.findings) {
      const leaf = byCode.get(out.requirement_id_external.trim());
      if (!leaf || seen.has(leaf.id)) continue; // outside the batch, or duplicated: ignored
      seen.add(leaf.id);
      const response = ctx.responses.get(leaf.id)!;
      findings.push(toFinding(ctx.run.id, response.id, leaf.id, out, response.response_text));
    }
    const missing = toAsk.filter((l) => !seen.has(l.id)).map((l) => l.code);
    if (missing.length > 0) {
      outcome = { ...outcome, status: "failed", error: `Le modèle n'a pas produit de proposition pour : ${missing.join(", ")}.` };
    }
  }

  if (findings.length > 0) {
    const { error } = await db.from("agent_findings").upsert(findings, { onConflict: "run_id,response_id" });
    if (error) return { ...outcome, status: "failed", error: `Propositions non enregistrées : ${error.message}` };
  }
  return outcome;
}

/** Cuts a timed-out batch in two halves (once), both back to pending. */
async function splitBatch(db: Db, batch: AgentRunBatch, reason: string): Promise<void> {
  const half = Math.ceil(batch.requirement_ids.length / 2);
  const first = batch.requirement_ids.slice(0, half);
  const second = batch.requirement_ids.slice(half);
  const { data: last } = await db
    .from("agent_run_batches")
    .select("batch_index")
    .eq("run_id", batch.run_id)
    .order("batch_index", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextIndex = ((last as { batch_index: number } | null)?.batch_index ?? batch.batch_index) + 1;
  await db
    .from("agent_run_batches")
    .update({ requirement_ids: first, status: "pending", split_depth: batch.split_depth + 1, error: reason, claimed_at: null, completed_at: null })
    .eq("id", batch.id);
  await db.from("agent_run_batches").insert({
    run_id: batch.run_id,
    batch_index: nextIndex,
    requirement_ids: second,
    status: "pending",
    split_depth: batch.split_depth + 1,
    error: reason,
  });
}

async function settleBatch(db: Db, batch: AgentRunBatch, outcome: BatchOutcome): Promise<void> {
  const done = outcome.status !== "pending";
  await db
    .from("agent_run_batches")
    .update({
      status: outcome.status,
      error: outcome.error,
      prompt_tokens: outcome.usage?.prompt_tokens ?? 0,
      completion_tokens: outcome.usage?.completion_tokens ?? 0,
      cached_tokens: outcome.usage?.cached_tokens ?? 0,
      cost: outcome.usage?.cost ?? 0,
      served_model: outcome.served_model ?? null,
      generation_id: outcome.generation_id ?? null,
      raw_output: outcome.raw_output ?? null,
      completed_at: done ? new Date().toISOString() : null,
      claimed_at: done ? batch.claimed_at : null,
    })
    .eq("id", batch.id);
}

async function processBatch(db: Db, batch: AgentRunBatch): Promise<void> {
  try {
    const outcome = await runBatch(db, batch);
    await settleBatch(db, batch, outcome);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof CompletionTimeoutError && batch.requirement_ids.length >= 2 && batch.split_depth === 0) {
      await splitBatch(db, batch, `${message} Lot scindé en deux moitiés.`);
    } else if (
      err instanceof OpenRouterError &&
      RETRIABLE_HTTP.has(err.status) &&
      batch.attempts < MAX_ATTEMPTS
    ) {
      await settleBatch(db, batch, { status: "pending", error: `${message} Nouvelle tentative prévue.` });
    } else {
      await settleBatch(db, batch, { status: "failed", error: message });
    }
  }
  await refreshRunStatus(db, batch.run_id);
}

export interface WorkerReport {
  requeued: number;
  claimed: number;
  remaining: boolean;
}

/**
 * One worker round: requeue lost batches, claim a few pending ones, run them
 * in parallel, report whether work remains (the caller re-triggers itself).
 */
export async function runWorkerRound(): Promise<WorkerReport> {
  const db = createServiceClient();
  const { data: requeued } = await db.rpc("requeue_stale_agent_run_batches", { p_timeout_seconds: STALE_AFTER_SECONDS });
  const { data: claimed, error } = await db.rpc("claim_agent_run_batches", { p_limit: CLAIM_LIMIT });
  if (error) throw new Error(`Réclamation des lots impossible : ${error.message}`);
  const batches = (claimed ?? []) as AgentRunBatch[];
  for (const b of batches) await refreshRunStatus(db, b.run_id);
  await Promise.all(batches.map((b) => processBatch(db, b)));
  const { data: remaining } = await db.rpc("agent_worker_has_work", { p_timeout_seconds: STALE_AFTER_SECONDS });
  return { requeued: Number(requeued ?? 0), claimed: batches.length, remaining: !!remaining };
}

/** Fires the worker without waiting for it. */
export async function triggerWorker(origin: string): Promise<void> {
  const secret = process.env.AGENT_WORKER_SECRET;
  if (!secret) throw new Error("AGENT_WORKER_SECRET n'est pas définie.");
  const url = `${process.env.AGENT_WORKER_URL || origin}/api/agents/worker`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-agent-worker-secret": secret },
    body: JSON.stringify({ source: "trigger" }),
  }).catch((err) => console.error("[agents] worker trigger failed:", err));
}
