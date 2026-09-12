/**
 * The background worker: claims pending batches, runs each one against
 * OpenRouter, verifies the quotes, writes the proposals, derives the run's
 * state. Runs with the service role; never called by a browser.
 */

import { createServiceClient } from "@/lib/supabase/service";
import { describeDomain, loadCategories, loadLeaves, loadResponses, subtreeIds, type Db } from "./context";
import { buildMessages, type DomainDescription } from "./prompt";
import { BATCH_JSON_SCHEMA, BATCH_JSON_SCHEMA_WITH_TOOLS, batchOutputSchema, extractJson, toHalfStep, type FindingOutput } from "./schema";
import { CompletionTimeoutError, OpenRouterError, findCatalogueModel, streamChatCompletion, type ChatMessage, type CompletionUsage, type UrlCitation } from "./openrouter";
import { verifyQuote } from "./quotes";
import { parseTools, toolDefinitions, type AgentTools } from "./tools";
import { runClientTool, verifyCalculation } from "./calculator";
import type { AgentRunBatch, FindingEvidence, FindingQuote, ReasoningEffort, RunStatus } from "./types";

/** Well under Vercel's 300 s: leaves time to persist the result. */
export const BATCH_TIMEOUT_MS = 240_000;
/** Batches taken per worker invocation; they run in parallel. */
export const CLAIM_LIMIT = 4;
/** Past this, a `running` batch is considered lost and goes back to pending. */
export const STALE_AFTER_SECONDS = 300;
export const MAX_ATTEMPTS = 3;
/**
 * Output budget. Large on purpose: for Anthropic models OpenRouter derives
 * the thinking budget from max_tokens (about 80 % at "high"), and the JSON
 * for twelve proposals must still fit after it.
 */
const MAX_TOKENS = 100_000;
const FALLBACK_MAX_TOKENS = 64_000;
/** Tool rounds per batch; past it the model is asked to answer without tools. */
const MAX_TOOL_TURNS = 6;
/** Below this remaining time, a turn is not started: the batch is checkpointed for the next worker round. */
const MIN_TURN_MS = 45_000;
const TOOL_OUTPUT_MAX_CHARS = 4_000;

const RETRIABLE_HTTP = new Set([408, 429, 500, 502, 503, 524, 529]);

interface RunContext {
  run: {
    id: string;
    rfp_id: string;
    version_id: string;
    supplier_id: string;
    category_id: string;
    agent_versions: { id: string; system_prompt: string; model_id: string; reasoning_effort: ReasoningEffort; tools: unknown } | null;
    suppliers: { name: string } | null;
  };
  domain: DomainDescription;
  responses: Map<string, { id: string; requirement_id: string; response_text: string | null }>;
}

async function loadRunContext(db: Db, runId: string): Promise<RunContext> {
  const { data: run, error } = await db
    .from("agent_runs")
    .select("id, rfp_id, version_id, supplier_id, category_id, agent_versions(id, system_prompt, model_id, reasoning_effort, tools), suppliers(name)")
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
  evidence: FindingEvidence[];
  status: "proposed";
};

/**
 * What the model cites from its tools, checked against what the tools
 * actually produced: a calculation is re-evaluated, a page must have been
 * returned by the server tools of this batch.
 */
function toEvidence(out: FindingOutput, citedUrls: Set<string>, batchCalculations: Array<{ expression: string; result: string }>): FindingEvidence[] {
  const evidence: FindingEvidence[] = [];
  const seenExpressions = new Set<string>();
  for (const c of out.calculations) {
    const expression = c.expression.trim();
    if (!expression || seenExpressions.has(expression)) continue;
    seenExpressions.add(expression);
    evidence.push({ type: "calcul", expression, result: c.result.trim(), verified: verifyCalculation(expression, c.result) });
  }
  // Models do not always report what they computed: a calculation of the
  // batch whose result the justification quotes is attached anyway (it ran
  // here, so it is verified by construction).
  const text = out.justification.replace(/\u00a0/g, " ");
  for (const c of batchCalculations) {
    if (seenExpressions.has(c.expression)) continue;
    const numeric = c.result.match(/-?\d+(?:\.\d+)?/)?.[0];
    if (!numeric) continue;
    const variants = [numeric, numeric.replace(".", ","), numeric.replace(/\B(?=(\d{3})+(?!\d))/g, " ")];
    if (variants.some((v) => new RegExp(`(^|[^\\d,.])${v.replace(".", "\\.")}(?![\\d])`).test(text))) {
      seenExpressions.add(c.expression);
      evidence.push({ type: "calcul", expression: c.expression, result: c.result, verified: true });
    }
  }
  for (const src of out.sources) {
    const url = src.url.trim();
    if (!/^https?:\/\//i.test(url)) continue;
    evidence.push({ type: "url", url, title: src.title?.trim() || null, verified: citedUrls.has(normaliseUrl(url)) });
  }
  return evidence;
}

function normaliseUrl(url: string): string {
  return url.trim().toLowerCase().replace(/\/+$/, "").replace(/^http:\/\//, "https://");
}

function toFinding(
  runId: string,
  responseId: string,
  requirementId: string,
  out: FindingOutput,
  responseText: string | null,
  citedUrls: Set<string>,
  batchCalculations: Array<{ expression: string; result: string }>
): FindingInsert {
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
    evidence: toEvidence(out, citedUrls, batchCalculations),
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
    evidence: [],
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
  /** Set when the batch pauses between two tool turns: resumed by the next worker round. */
  checkpoint?: { conversation: ChatMessage[]; turns: number };
  turns?: number;
}

interface ConversationResult {
  content: string;
  finish_reason: string | null;
  usage: { prompt_tokens: number; completion_tokens: number; cached_tokens: number; cost: number };
  served_model: string | null;
  generation_id: string | null;
  citations: UrlCitation[];
  /** Successful calculations of this batch, whatever the model reports. */
  calculations: Array<{ expression: string; result: string }>;
  turns: number;
  /** Null when the conversation ended; set when it must resume in another round. */
  checkpoint: { conversation: ChatMessage[]; turns: number } | null;
}

function addUsage(total: ConversationResult["usage"], u: CompletionUsage, price: { prompt_price: number; completion_price: number } | null): void {
  total.prompt_tokens += u.prompt_tokens;
  total.completion_tokens += u.completion_tokens;
  total.cached_tokens += u.cached_tokens;
  // A provider key of the organisation's own may report no cost at all: the
  // catalogue price then gives an estimate rather than 0.
  total.cost += u.cost > 0 || !price ? u.cost : u.prompt_tokens * price.prompt_price + u.completion_tokens * price.completion_price;
}

/**
 * Runs the batch's conversation: one completion, then as many tool rounds
 * as the model asks for (bounded), each client tool call executed here and
 * journaled, server tool citations collected. Stops before the invocation
 * runs out of time and hands the conversation to the next round.
 */
async function runConversation(
  db: Db,
  batch: AgentRunBatch,
  params: {
    model: string;
    reasoning: ReasoningEffort;
    tools: AgentTools;
    jsonSchema: Record<string, unknown> | null;
    maxTokens: number;
    price: { prompt_price: number; completion_price: number } | null;
    initialMessages: ChatMessage[];
    deadline: number;
  }
): Promise<ConversationResult> {
  const resumed = Array.isArray(batch.conversation) && batch.conversation.length > 0;
  const messages: ChatMessage[] = resumed ? (batch.conversation as ChatMessage[]) : params.initialMessages;
  let turns = resumed ? batch.turns : 0;
  const total: ConversationResult = {
    content: "",
    finish_reason: null,
    // A resumed batch carries the usage of its earlier turns.
    usage: resumed
      ? { prompt_tokens: batch.prompt_tokens, completion_tokens: batch.completion_tokens, cached_tokens: batch.cached_tokens, cost: Number(batch.cost) }
      : { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0, cost: 0 },
    served_model: null,
    generation_id: null,
    citations: [],
    calculations: [],
    turns,
    checkpoint: null,
  };
  const definitions = toolDefinitions(params.tools);
  let jsonSchema = params.jsonSchema;

  for (;;) {
    const remaining = params.deadline - Date.now();
    if (remaining < MIN_TURN_MS) {
      total.turns = turns;
      total.checkpoint = { conversation: messages, turns };
      return total;
    }
    const exhausted = turns >= MAX_TOOL_TURNS;
    const request = {
      model: params.model,
      messages,
      reasoning: params.reasoning,
      jsonSchema,
      maxTokens: params.maxTokens,
      timeoutMs: remaining,
      tools: definitions,
      toolChoice: exhausted ? ("none" as const) : ("auto" as const),
    };
    let result;
    try {
      result = await streamChatCompletion(request);
    } catch (err) {
      // Some providers refuse a JSON schema together with tools: the schema
      // goes, the output is still validated here.
      if (jsonSchema && definitions.length > 0 && err instanceof OpenRouterError && err.status === 400 && /response_format|json_schema|structured/i.test(err.message)) {
        jsonSchema = null;
        result = await streamChatCompletion({ ...request, jsonSchema: null });
      } else {
        throw err;
      }
    }
    addUsage(total.usage, result.usage, params.price);
    total.served_model = result.model ?? total.served_model;
    total.generation_id = result.id ?? total.generation_id;
    total.citations.push(...result.citations);
    if (result.usage.web_search_requests > 0) {
      await db.from("agent_run_tool_calls").insert({
        run_id: batch.run_id,
        batch_id: batch.id,
        turn: turns,
        tool: "web",
        source: "server",
        input: { requests: result.usage.web_search_requests },
        output: result.citations.map((c) => `${c.title ?? ""} ${c.url}`.trim()).join("\n").slice(0, TOOL_OUTPUT_MAX_CHARS) || null,
        ok: true,
      });
    }

    if (result.tool_calls.length === 0) {
      total.content = result.content;
      total.finish_reason = result.finish_reason;
      total.turns = turns;
      return total;
    }

    // The model wants tools: run them, append the exchange, next turn.
    messages.push({
      role: "assistant",
      content: result.content || null,
      tool_calls: result.tool_calls,
      ...(result.reasoning_details.length > 0 ? { reasoning_details: result.reasoning_details } : {}),
    });
    for (const call of result.tool_calls) {
      const startedAt = Date.now();
      const run = runClientTool(call.function.name, call.function.arguments);
      const output = run.output.slice(0, TOOL_OUTPUT_MAX_CHARS);
      if (run.ok && call.function.name === "calculer") {
        try {
          const parsedOut = JSON.parse(run.output) as { expression: string; result: string };
          total.calculations.push(parsedOut);
        } catch {
          // output shape is ours; nothing to do
        }
      }
      messages.push({ role: "tool", tool_call_id: call.id, content: output });
      await db.from("agent_run_tool_calls").insert({
        run_id: batch.run_id,
        batch_id: batch.id,
        turn: turns,
        tool: call.function.name,
        source: "client",
        input: run.input,
        output,
        ok: run.ok,
        duration_ms: Date.now() - startedAt,
      });
    }
    turns += 1;
    if (turns === MAX_TOOL_TURNS) {
      messages.push({ role: "user", content: "Les outils ne sont plus disponibles pour ce lot. Réponds maintenant avec l'objet JSON final, sur la base de ce que tu as." });
    }
  }
}

async function runBatch(db: Db, batch: AgentRunBatch): Promise<BatchOutcome> {
  const ctx = await loadRunContext(db, batch.run_id);
  const agentVersion = ctx.run.agent_versions;
  if (!agentVersion) return { status: "failed", error: "Version d'agent introuvable." };

  const leafById = new Map(ctx.domain.leaves.map((l) => [l.id, l]));
  const targets = batch.requirement_ids.map((id) => leafById.get(id)).filter((l): l is NonNullable<typeof l> => !!l);

  // A re-run of the batch (retry, requeue) never touches a proposal this
  // analysis already produced: it may have been decided in the meantime.
  const { data: existing } = await db.from("agent_findings").select("requirement_id").eq("run_id", batch.run_id).in("requirement_id", batch.requirement_ids);
  const alreadyDone = new Set(((existing ?? []) as Array<{ requirement_id: string }>).map((f) => f.requirement_id));

  const findings: FindingInsert[] = [];
  const toAsk: typeof targets = [];
  for (const leaf of targets) {
    if (alreadyDone.has(leaf.id)) continue;
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
    const started = Date.now();
    const catalogueModel = await findCatalogueModel(agentVersion.model_id);
    const structured = catalogueModel?.structured_outputs ?? false;
    const maxTokens = catalogueModel?.max_completion_tokens
      ? Math.min(MAX_TOKENS, catalogueModel.max_completion_tokens)
      : FALLBACK_MAX_TOKENS;
    const tools = parseTools(agentVersion.tools);
    const hasTools = tools.enabled.length > 0;
    const messages = buildMessages({
      systemPrompt: agentVersion.system_prompt,
      modelId: agentVersion.model_id,
      tools,
      domain: ctx.domain,
      supplierName: ctx.run.suppliers?.name ?? "Fournisseur",
      responseText: (id) => ctx.responses.get(id)?.response_text ?? null,
      targetCodes: toAsk.map((l) => l.code),
    });
    const result = await runConversation(db, batch, {
      model: agentVersion.model_id,
      reasoning: agentVersion.reasoning_effort,
      tools,
      jsonSchema: structured ? ((hasTools ? BATCH_JSON_SCHEMA_WITH_TOOLS : BATCH_JSON_SCHEMA) as unknown as Record<string, unknown>) : null,
      maxTokens,
      price: catalogueModel,
      initialMessages: messages,
      deadline: started + BATCH_TIMEOUT_MS,
    });
    outcome = {
      status: "completed",
      error: null,
      usage: result.usage,
      served_model: result.served_model,
      generation_id: result.generation_id,
      raw_output: result.content,
      turns: result.turns,
    };
    if (result.checkpoint) {
      return { ...outcome, status: "pending", error: null, raw_output: null, checkpoint: result.checkpoint };
    }
    if (result.finish_reason && result.finish_reason !== "stop" && result.finish_reason !== "end_turn") {
      return { ...outcome, status: "failed", error: `Génération interrompue (finish_reason = ${result.finish_reason}).` };
    }
    const citedUrls = new Set(result.citations.map((c) => normaliseUrl(c.url)));
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
      findings.push(toFinding(ctx.run.id, response.id, leaf.id, out, response.response_text, citedUrls, result.calculations));
    }
    const missing = toAsk.filter((l) => !seen.has(l.id)).map((l) => l.code);
    if (missing.length > 0) {
      outcome = { ...outcome, status: "failed", error: `Le modèle n'a pas produit de proposition pour : ${missing.join(", ")}.` };
    }
  }

  if (findings.length > 0) {
    const { error } = await db.from("agent_findings").upsert(findings, { onConflict: "run_id,response_id", ignoreDuplicates: true });
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
      // A checkpoint keeps the conversation and does not count as an attempt.
      conversation: outcome.checkpoint ? outcome.checkpoint.conversation : null,
      turns: outcome.checkpoint ? outcome.checkpoint.turns : (outcome.turns ?? batch.turns),
      attempts: outcome.checkpoint ? Math.max(0, batch.attempts - 1) : batch.attempts,
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
  // Only never-attempted batches justify an immediate next round; batches put
  // back for a retry (rate limit, provider down) wait for the cron minute.
  const { count } = await db
    .from("agent_run_batches")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .or("attempts.eq.0,conversation.not.is.null");
  return { requeued: Number(requeued ?? 0), claimed: batches.length, remaining: (count ?? 0) > 0 };
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
