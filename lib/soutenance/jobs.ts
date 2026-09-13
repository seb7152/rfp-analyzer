/**
 * The AI jobs of the Soutenances chapter, run by the agents' worker: a brief
 * for a séance, a supplier's part of the point de synthèse, the compte rendu
 * of a transcript (which then plans the proposals as a soutenance analysis),
 * the vocabulary of a consultation, the targeted corrections of a transcript.
 */

import { z } from "zod";
import { chunk, type Db } from "@/lib/agents/context";
import { CompletionTimeoutError, OpenRouterError, findCatalogueModel, streamChatCompletion, type ChatMessage, type CompletionUsage } from "@/lib/agents/openrouter";
import { extractJson } from "@/lib/agents/schema";
import type { ReasoningEffort } from "@/lib/agents/types";
import { createServiceClient } from "@/lib/supabase/service";
import type { TranscriptSegment } from "@/lib/connectors/granola";
import { loadAiSettings } from "@/lib/ai/settings";
import { ensureSystemAgent, type SystemAgentKind } from "./agents";
import { loadRfpEvalContext, normaliseCode, responseOf, type RfpEvalContext } from "./context";
import { GLOSSARY_JSON_SCHEMA, TRANSCRIPT_FIX_JSON_SCHEMA, buildGlossaryMessages, buildTranscriptFixMessages, chunkSegments, cleanTerms, loadGlossary, loadGlossaryTerms, vocabularyFor } from "./glossary";
import { REPORT_JSON_SCHEMA, SYNTHESE_JSON_SCHEMA, buildBriefMessages, buildReportMessages, buildSyntheseMessages, cleanMarkdown } from "./prompts";
import { correctedSegments, glossaryCorrections, type TranscriptCorrection } from "./transcript";
import type { AiJobRow, BriefStatus, GlossaryTerm, SoutenanceSessionRow, SyntheseData, SyntheseDomain } from "./types";

/** Jobs taken per worker round, alongside the batches. */
export const JOB_CLAIM_LIMIT = 2;
export const JOB_MAX_ATTEMPTS = 3;
const JOB_TIMEOUT_MS = 230_000;
const MAX_TOKENS = 48_000;
/** Proposals of a séance go in small batches: the transcript is the bulk of the context. */
const SOUTENANCE_BATCH_SIZE = 8;

const RETRIABLE_HTTP = new Set([408, 429, 500, 502, 503, 524, 529]);

interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cost: number;
}

function usageOf(u: CompletionUsage, price: { prompt_price: number; completion_price: number } | null): Usage {
  return {
    prompt_tokens: u.prompt_tokens,
    completion_tokens: u.completion_tokens,
    cached_tokens: u.cached_tokens,
    cost: u.cost > 0 || !price ? u.cost : u.prompt_tokens * price.prompt_price + u.completion_tokens * price.completion_price,
  };
}

async function complete(params: { model: string; reasoning: ReasoningEffort; messages: ChatMessage[]; jsonSchema: Record<string, unknown> | null }) {
  const catalogueModel = await findCatalogueModel(params.model);
  const structured = catalogueModel?.structured_outputs ?? false;
  const maxTokens = catalogueModel?.max_completion_tokens ? Math.min(MAX_TOKENS, catalogueModel.max_completion_tokens) : MAX_TOKENS;
  const request = {
    model: params.model,
    messages: params.messages,
    reasoning: params.reasoning,
    jsonSchema: structured ? params.jsonSchema : null,
    maxTokens,
    timeoutMs: JOB_TIMEOUT_MS,
  };
  let result;
  try {
    result = await streamChatCompletion(request);
  } catch (err) {
    if (request.jsonSchema && err instanceof OpenRouterError && err.status === 400 && /response_format|json_schema|structured/i.test(err.message)) {
      result = await streamChatCompletion({ ...request, jsonSchema: null });
    } else {
      throw err;
    }
  }
  if (result.finish_reason && result.finish_reason !== "stop" && result.finish_reason !== "end_turn") {
    throw new Error(`Génération interrompue (finish_reason = ${result.finish_reason}).`);
  }
  return { content: result.content, usage: usageOf(result.usage, catalogueModel), served_model: result.model ?? params.model };
}

async function organizationOf(db: Db, rfpId: string): Promise<string> {
  const { data, error } = await db.from("rfps").select("organization_id").eq("id", rfpId).maybeSingle();
  if (error || !data) throw new Error(`Consultation illisible : ${error?.message ?? "introuvable"}`);
  return (data as { organization_id: string }).organization_id;
}

async function agentFor(db: Db, rfpId: string, kind: SystemAgentKind, by: string | null) {
  const organizationId = await organizationOf(db, rfpId);
  return ensureSystemAgent(organizationId, kind, by);
}

// ---------------------------------------------------------------------------
// brief
// ---------------------------------------------------------------------------

const briefPayload = z.object({
  brief_id: z.string().uuid(),
  session_id: z.string().uuid(),
  supplier_id: z.string().uuid(),
  version_id: z.string().uuid(),
  statuses: z.array(z.string()),
});

async function runBrief(db: Db, job: AiJobRow): Promise<{ usage: Usage; served_model: string; result: Record<string, unknown> }> {
  const p = briefPayload.parse(job.payload);
  const agent = await agentFor(db, job.rfp_id, "soutenance", job.created_by);
  const ctx = await loadRfpEvalContext(db, job.rfp_id, p.version_id);
  const { data: synth } = await db.from("soutenance_syntheses").select("data").eq("rfp_id", job.rfp_id).eq("version_id", p.version_id).maybeSingle();
  const { messages, count } = buildBriefMessages({
    systemPrompt: agent.system_prompt,
    modelId: agent.model_id,
    ctx,
    supplierId: p.supplier_id,
    statuses: p.statuses as BriefStatus[],
    synthese: ((synth as { data?: SyntheseData } | null)?.data as SyntheseData | undefined) ?? null,
    vocabulary: await vocabularyFor(db, job.rfp_id, ctx.rfp.organization_id),
  });
  await db.from("soutenance_briefs").update({ status: "processing", started_at: new Date().toISOString(), model_id: agent.model_id }).eq("id", p.brief_id);
  if (count === 0) {
    const markdown = "## En deux mots\n\nAucune exigence ne relève des statuts retenus pour ce brief : rien à clarifier en séance sur ce périmètre.";
    await db.from("soutenance_briefs").update({ status: "completed", report_markdown: markdown, completed_at: new Date().toISOString(), job_id: job.id }).eq("id", p.brief_id);
    return { usage: { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0, cost: 0 }, served_model: agent.model_id, result: { requirements: 0 } };
  }
  const out = await complete({ model: agent.model_id, reasoning: agent.reasoning_effort, messages, jsonSchema: null });
  const markdown = cleanMarkdown(out.content);
  if (!markdown) throw new Error("Le modèle a rendu un brief vide.");
  await db
    .from("soutenance_briefs")
    .update({ status: "completed", report_markdown: markdown, completed_at: new Date().toISOString(), job_id: job.id, cost: out.usage.cost, model_id: out.served_model, error_message: null })
    .eq("id", p.brief_id);
  return { usage: out.usage, served_model: out.served_model, result: { requirements: count } };
}

// ---------------------------------------------------------------------------
// synthese (one supplier)
// ---------------------------------------------------------------------------

const synthesePayload = z.object({ synthese_id: z.string().uuid(), supplier_id: z.string().uuid(), version_id: z.string().uuid() });

const syntheseOutput = z.object({
  domains: z.array(
    z.object({
      code: z.string(),
      forces: z.array(z.object({ code: z.string(), text: z.string() })).default([]),
      faiblesses: z.array(z.object({ code: z.string(), text: z.string() })).default([]),
      questions: z.array(z.object({ code: z.string(), text: z.string() })).default([]),
    })
  ),
});

function trimItems(items: Array<{ code: string; text: string }>, max: number) {
  return items
    .map((i) => ({ code: i.code.trim(), text: i.text.trim() }))
    .filter((i) => i.text)
    .slice(0, max);
}

async function refreshSyntheseStatus(db: Db, syntheseId: string): Promise<void> {
  const { data: jobs } = await db.from("ai_jobs").select("status").eq("kind", "synthese").filter("payload->>synthese_id", "eq", syntheseId);
  const rows = (jobs ?? []) as Array<{ status: string }>;
  const pending = rows.filter((j) => j.status === "pending" || j.status === "running").length;
  const failed = rows.filter((j) => j.status === "failed").length;
  const completed = rows.filter((j) => j.status === "completed").length;
  const status = pending > 0 ? "running" : failed === 0 ? "completed" : completed > 0 ? "partial" : "failed";
  const { data: sums } = await db.from("ai_jobs").select("prompt_tokens, completion_tokens, cost, served_model").eq("kind", "synthese").filter("payload->>synthese_id", "eq", syntheseId);
  const s = (sums ?? []) as Array<{ prompt_tokens: number; completion_tokens: number; cost: number; served_model: string | null }>;
  await db
    .from("soutenance_syntheses")
    .update({
      status,
      prompt_tokens: s.reduce((n, j) => n + (j.prompt_tokens ?? 0), 0),
      completion_tokens: s.reduce((n, j) => n + (j.completion_tokens ?? 0), 0),
      cost: s.reduce((n, j) => n + Number(j.cost ?? 0), 0),
      model_id: s.map((j) => j.served_model).filter(Boolean).pop() ?? null,
      generated_at: pending === 0 ? new Date().toISOString() : null,
    })
    .eq("id", syntheseId);
}

async function runSynthese(db: Db, job: AiJobRow): Promise<{ usage: Usage; served_model: string; result: Record<string, unknown> }> {
  const p = synthesePayload.parse(job.payload);
  const agent = await agentFor(db, job.rfp_id, "synthese", job.created_by);
  const ctx = await loadRfpEvalContext(db, job.rfp_id, p.version_id);
  const messages = buildSyntheseMessages({ systemPrompt: agent.system_prompt, modelId: agent.model_id, ctx, supplierId: p.supplier_id });
  const out = await complete({ model: agent.model_id, reasoning: agent.reasoning_effort, messages, jsonSchema: SYNTHESE_JSON_SCHEMA as unknown as Record<string, unknown> });
  const parsed = syntheseOutput.parse(extractJson(out.content));
  const domains: Record<string, SyntheseDomain> = {};
  for (const d of ctx.domains) domains[d.id] = { forces: [], faiblesses: [], questions: [] };
  const byCode = new Map(ctx.domains.map((d) => [normaliseCode(d.code), d.id]));
  const knownCodes = new Map(ctx.requirements.map((r) => [normaliseCode(r.code), r.code]));
  const canon = (items: Array<{ code: string; text: string }>) => items.map((i) => ({ ...i, code: knownCodes.get(normaliseCode(i.code)) ?? i.code }));
  for (const d of parsed.domains) {
    const id = byCode.get(normaliseCode(d.code));
    if (!id) continue;
    domains[id] = { forces: trimItems(canon(d.forces), 5), faiblesses: trimItems(canon(d.faiblesses), 5), questions: trimItems(canon(d.questions), 3) };
  }
  const { error } = await db.rpc("set_synthese_supplier", {
    p_synthese_id: p.synthese_id,
    p_supplier_id: p.supplier_id,
    p_value: { domains, generated_at: new Date().toISOString(), edited_at: null, error: null },
  });
  if (error) throw new Error(`Synthèse non enregistrée : ${error.message}`);
  return { usage: out.usage, served_model: out.served_model, result: { domains: Object.keys(domains).length } };
}

// ---------------------------------------------------------------------------
// soutenance_report (compte rendu + planning of the proposals)
// ---------------------------------------------------------------------------

const reportPayload = z.object({ session_id: z.string().uuid(), supplier_id: z.string().uuid(), version_id: z.string().uuid() });

const reportOutput = z.object({
  report_markdown: z.string(),
  addressed: z.array(z.object({ code: z.string(), at: z.string().nullable().default(null), why: z.string().nullable().default(null) })).default([]),
});

async function planSoutenanceRuns(
  db: Db,
  job: AiJobRow,
  session: SoutenanceSessionRow,
  ctx: RfpEvalContext,
  agentVersionId: string,
  versionId: string,
  addressedCodes: string[]
): Promise<number> {
  const codes = new Set(addressedCodes.map(normaliseCode));
  const concerned = ctx.requirements.filter((r) => codes.has(normaliseCode(r.code)) && r.domain_id && responseOf(ctx, r.id, session.supplier_id));
  // Proposals still open from an earlier analysis of this séance give way.
  const { data: previous } = await db.from("agent_runs").select("id").eq("session_id", session.id).eq("kind", "soutenance");
  const previousIds = ((previous ?? []) as Array<{ id: string }>).map((r) => r.id);
  if (previousIds.length > 0) {
    await createServiceClient().from("agent_findings").update({ status: "obsolete" }).in("run_id", previousIds).eq("status", "proposed");
  }
  const byDomain = new Map<string, string[]>();
  for (const r of concerned) {
    const list = byDomain.get(r.domain_id!) ?? [];
    list.push(r.id);
    byDomain.set(r.domain_id!, list);
  }
  let created = 0;
  for (const [domainId, ids] of byDomain) {
    const { data: run, error } = await db
      .from("agent_runs")
      .insert({
        rfp_id: job.rfp_id,
        version_id: versionId,
        agent_version_id: agentVersionId,
        supplier_id: session.supplier_id,
        category_id: domainId,
        kind: "soutenance",
        session_id: session.id,
        status: "pending",
        launched_by: job.created_by,
      })
      .select("id")
      .single();
    if (error || !run) throw new Error(`Analyse de soutenance non créée : ${error?.message ?? "inconnue"}`);
    const batches = chunk(ids, SOUTENANCE_BATCH_SIZE).map((requirement_ids, i) => ({ run_id: run.id, batch_index: i, requirement_ids, status: "pending" as const }));
    const { error: bError } = await db.from("agent_run_batches").insert(batches);
    if (bError) throw new Error(`Lots non créés : ${bError.message}`);
    created += ids.length;
  }
  return created;
}

async function runReport(db: Db, job: AiJobRow): Promise<{ usage: Usage; served_model: string; result: Record<string, unknown> }> {
  const p = reportPayload.parse(job.payload);
  const { data: sessionRow, error: sError } = await db.from("soutenance_sessions").select("*").eq("id", p.session_id).maybeSingle();
  if (sError || !sessionRow) throw new Error(`Séance illisible : ${sError?.message ?? "introuvable"}`);
  const session = sessionRow as SoutenanceSessionRow;
  const raw: TranscriptSegment[] = Array.isArray(session.transcript_segments) ? session.transcript_segments : [];
  if (raw.length === 0) throw new Error("La séance n'a pas de transcript.");
  const segments = correctedSegments(raw, Array.isArray(session.transcript_corrections) ? session.transcript_corrections : []);
  const agent = await agentFor(db, job.rfp_id, "soutenance", job.created_by);
  const ctx = await loadRfpEvalContext(db, job.rfp_id, p.version_id);
  const { data: brief } = await db
    .from("soutenance_briefs")
    .select("report_markdown")
    .eq("session_id", session.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const messages = buildReportMessages({
    systemPrompt: agent.system_prompt,
    modelId: agent.model_id,
    ctx,
    supplierId: p.supplier_id,
    brief: (brief as { report_markdown: string | null } | null)?.report_markdown ?? null,
    segments,
    voiceNames: session.voice_names ?? {},
    vocabulary: await vocabularyFor(db, job.rfp_id, ctx.rfp.organization_id),
  });
  const out = await complete({ model: agent.model_id, reasoning: agent.reasoning_effort, messages, jsonSchema: REPORT_JSON_SCHEMA as unknown as Record<string, unknown> });
  const parsed = reportOutput.parse(extractJson(out.content));
  const markdown = cleanMarkdown(parsed.report_markdown);
  if (!markdown) throw new Error("Le modèle a rendu un compte rendu vide.");
  const now = new Date().toISOString();
  const { error: uError } = await db
    .from("soutenance_sessions")
    .update({ report_markdown: markdown, report_generated_at: now, report_edited_at: null, report_job_id: job.id })
    .eq("id", session.id);
  if (uError) throw new Error(`Compte rendu non enregistré : ${uError.message}`);
  // The job's result is read by the batches (why each requirement is concerned):
  // it must be stored before the runs are planned.
  await db.from("ai_jobs").update({ result: { addressed: parsed.addressed.slice(0, 40) } }).eq("id", job.id);
  const planned = await planSoutenanceRuns(db, job, session, ctx, agent.agent_version_id, p.version_id, parsed.addressed.slice(0, 40).map((a) => a.code));
  return { usage: out.usage, served_model: out.served_model, result: { addressed: parsed.addressed.slice(0, 40), planned } };
}

// ---------------------------------------------------------------------------
// glossary (the vocabulary of the consultation)
// ---------------------------------------------------------------------------

const glossaryPayload = z.object({ version_id: z.string().uuid() });

const glossaryOutput = z.object({
  terms: z.array(z.object({ term: z.string(), aliases: z.array(z.string()).default([]), note: z.string().default("") })),
});

/** The agent's terms replace the previous agent's terms; hand-kept terms stay and gain the agent's aliases. */
export function mergeGlossary(existing: GlossaryTerm[], proposed: GlossaryTerm[]): GlossaryTerm[] {
  const out: GlossaryTerm[] = existing.filter((t) => t.source === "manual").map((t) => ({ ...t, aliases: [...t.aliases] }));
  for (const p of proposed) {
    const kept = out.find((t) => t.term.toLowerCase() === p.term.trim().toLowerCase());
    if (kept) {
      kept.aliases.push(...p.aliases);
      if (!kept.note && p.note) kept.note = p.note;
      continue;
    }
    out.push({ ...p, source: "agent" });
  }
  return cleanTerms(out);
}

async function runGlossary(db: Db, job: AiJobRow): Promise<{ usage: Usage; served_model: string; result: Record<string, unknown> }> {
  const p = glossaryPayload.parse(job.payload);
  const agent = await agentFor(db, job.rfp_id, "vocabulaire", job.created_by);
  const ctx = await loadRfpEvalContext(db, job.rfp_id, p.version_id);
  const { data: rfp } = await db.from("rfps").select("description").eq("id", job.rfp_id).maybeSingle();
  const existing = (await loadGlossary(db, job.rfp_id))?.terms ?? [];
  const messages = buildGlossaryMessages({
    systemPrompt: agent.system_prompt,
    modelId: agent.model_id,
    ctx,
    description: (rfp as { description: string | null } | null)?.description ?? null,
    existing: existing.filter((t) => t.source === "manual"),
  });
  const out = await complete({ model: agent.model_id, reasoning: agent.reasoning_effort, messages, jsonSchema: GLOSSARY_JSON_SCHEMA as unknown as Record<string, unknown> });
  const parsed = glossaryOutput.parse(extractJson(out.content));
  const terms = mergeGlossary(existing, parsed.terms.map((t) => ({ ...t, source: "agent" as const })));
  const { error } = await db
    .from("rfp_glossaries")
    .upsert({ rfp_id: job.rfp_id, terms, job_id: job.id, generated_at: new Date().toISOString(), generated_by: job.created_by, model_id: out.served_model, cost: out.usage.cost, error: null }, { onConflict: "rfp_id" });
  if (error) throw new Error(`Vocabulaire non enregistré : ${error.message}`);
  return { usage: out.usage, served_model: out.served_model, result: { terms: terms.length, proposed: parsed.terms.length } };
}

// ---------------------------------------------------------------------------
// transcript_fix (targeted corrections of a séance's transcript)
// ---------------------------------------------------------------------------

const fixPayload = z.object({ session_id: z.string().uuid(), supplier_id: z.string().uuid() });

const fixOutput = z.object({
  replacements: z.array(z.object({ i: z.number().int(), from: z.string(), to: z.string(), n: z.number().int().nullable().default(0) })),
});

const MAX_REPLACEMENTS_PER_CHUNK = 400;

async function runTranscriptFix(db: Db, job: AiJobRow): Promise<{ usage: Usage; served_model: string; result: Record<string, unknown> }> {
  const p = fixPayload.parse(job.payload);
  const { data: sessionRow, error: sError } = await db.from("soutenance_sessions").select("*").eq("id", p.session_id).maybeSingle();
  if (sError || !sessionRow) throw new Error(`Séance illisible : ${sError?.message ?? "introuvable"}`);
  const session = sessionRow as SoutenanceSessionRow;
  const raw: TranscriptSegment[] = Array.isArray(session.transcript_segments) ? session.transcript_segments : [];
  if (raw.length === 0) throw new Error("La séance n'a pas de transcript.");
  const agent = await agentFor(db, job.rfp_id, "vocabulaire", job.created_by);
  const organizationId = await organizationOf(db, job.rfp_id);
  const [terms, settings, { data: rfp }, { data: supplier }] = await Promise.all([
    loadGlossaryTerms(db, job.rfp_id),
    loadAiSettings(db, organizationId),
    db.from("rfps").select("title").eq("id", job.rfp_id).maybeSingle(),
    db.from("suppliers").select("name").eq("id", p.supplier_id).maybeSingle(),
  ]);
  // Hand edits survive a new pass; the previous glossary and agent corrections are redone.
  const previous = Array.isArray(session.transcript_corrections) ? session.transcript_corrections : [];
  const manual = previous.filter((c) => c.by === "manual");
  const fromGlossary = glossaryCorrections(raw, terms);
  const base = correctedSegments(raw, fromGlossary);
  const agentCorrections: TranscriptCorrection[] = [];
  const usage: Usage = { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0, cost: 0 };
  let served = agent.model_id;
  for (const piece of chunkSegments(base)) {
    const messages = buildTranscriptFixMessages({
      systemPrompt: agent.system_prompt,
      modelId: agent.model_id,
      terms,
      orgVocabulary: settings.vocabulary,
      supplierName: (supplier as { name: string } | null)?.name ?? "Fournisseur",
      consultationTitle: (rfp as { title: string } | null)?.title ?? "",
      segments: piece.segments,
      offset: piece.offset,
      voiceNames: session.voice_names ?? {},
    });
    const out = await complete({ model: agent.model_id, reasoning: agent.reasoning_effort, messages, jsonSchema: TRANSCRIPT_FIX_JSON_SCHEMA as unknown as Record<string, unknown> });
    usage.prompt_tokens += out.usage.prompt_tokens;
    usage.completion_tokens += out.usage.completion_tokens;
    usage.cached_tokens += out.usage.cached_tokens;
    usage.cost += out.usage.cost;
    served = out.served_model;
    const parsed = fixOutput.parse(extractJson(out.content));
    for (const r of parsed.replacements.slice(0, MAX_REPLACEMENTS_PER_CHUNK)) {
      const from = r.from;
      const to = r.to.trim();
      const seg = base[r.i];
      if (!seg || !from.trim() || !to || from === to) continue;
      if (r.i < piece.offset || r.i >= piece.offset + piece.segments.length) continue;
      if (!seg.text.includes(from)) continue;
      agentCorrections.push({ i: r.i, from, to, n: Math.max(0, r.n ?? 0), by: "agent" });
    }
  }
  const corrections: TranscriptCorrection[] = [...fromGlossary, ...agentCorrections, ...manual];
  const { error: uError } = await db.from("soutenance_sessions").update({ transcript_corrections: corrections }).eq("id", session.id);
  if (uError) throw new Error(`Corrections non enregistrées : ${uError.message}`);
  return { usage, served_model: served, result: { glossary: fromGlossary.length, agent: agentCorrections.length, manual: manual.length } };
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

async function settleJob(db: Db, job: AiJobRow, patch: Record<string, unknown>): Promise<void> {
  await db.from("ai_jobs").update(patch).eq("id", job.id);
}

/** What a job leaves behind when it fails, so the screens can say so. */
async function markFailure(db: Db, job: AiJobRow, message: string): Promise<void> {
  if (job.kind === "brief") {
    const id = (job.payload as { brief_id?: string }).brief_id;
    if (id) await db.from("soutenance_briefs").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() }).eq("id", id);
  } else if (job.kind === "synthese") {
    const p = job.payload as { synthese_id?: string; supplier_id?: string };
    if (p.synthese_id && p.supplier_id) {
      await db.rpc("set_synthese_supplier", { p_synthese_id: p.synthese_id, p_supplier_id: p.supplier_id, p_value: { domains: {}, generated_at: null, edited_at: null, error: message } });
      await refreshSyntheseStatus(db, p.synthese_id);
    }
  } else if (job.kind === "glossary") {
    await db.from("rfp_glossaries").upsert({ rfp_id: job.rfp_id, error: message }, { onConflict: "rfp_id" });
  }
}

export async function runJob(db: Db, job: AiJobRow): Promise<void> {
  try {
    const out =
      job.kind === "brief"
        ? await runBrief(db, job)
        : job.kind === "synthese"
          ? await runSynthese(db, job)
          : job.kind === "glossary"
            ? await runGlossary(db, job)
            : job.kind === "transcript_fix"
              ? await runTranscriptFix(db, job)
              : await runReport(db, job);
    await settleJob(db, job, {
      status: "completed",
      error: null,
      result: out.result,
      ...out.usage,
      served_model: out.served_model,
      completed_at: new Date().toISOString(),
    });
    if (job.kind === "synthese") await refreshSyntheseStatus(db, (job.payload as { synthese_id: string }).synthese_id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const retriable = (err instanceof OpenRouterError && RETRIABLE_HTTP.has(err.status)) || err instanceof CompletionTimeoutError;
    if (retriable && job.attempts < JOB_MAX_ATTEMPTS) {
      await settleJob(db, job, { status: "pending", error: `${message} Nouvelle tentative prévue.`, claimed_at: null });
      return;
    }
    await settleJob(db, job, { status: "failed", error: message, completed_at: new Date().toISOString() });
    await markFailure(db, job, message);
  }
}
