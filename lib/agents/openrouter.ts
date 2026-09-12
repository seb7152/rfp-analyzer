/**
 * OpenRouter access: the model catalogue (cached a few hours in the server
 * process) and a streamed chat completion that returns the text, the usage
 * and the served model. No provider SDK: the organisation changes model
 * without changing code.
 */

import type { CatalogueModel, ReasoningEffort } from "./types";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const CATALOGUE_TTL_MS = 6 * 60 * 60 * 1000;

export const DEFAULT_MODEL_ID =
  process.env.OPENROUTER_DEFAULT_MODEL || "anthropic/claude-sonnet-5";

function attributionHeaders(): Record<string, string> {
  return {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://rfp-analyzer.app",
    "X-Title": "RFP Analyzer",
  };
}

function apiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("OPENROUTER_API_KEY n'est pas définie.");
  return key;
}

// ─── Catalogue ──────────────────────────────────────────────────────────────

interface RawModel {
  id: string;
  name: string;
  created?: number;
  context_length?: number | null;
  pricing?: { prompt?: string; completion?: string };
  supported_parameters?: string[];
  architecture?: { input_modalities?: string[] };
  top_provider?: { context_length?: number | null; max_completion_tokens?: number | null };
}

let catalogueCache: { fetchedAt: number; models: CatalogueModel[] } | null = null;
let catalogueInFlight: Promise<CatalogueModel[]> | null = null;

async function fetchCatalogue(): Promise<CatalogueModel[]> {
  const res = await fetch(`${OPENROUTER_BASE}/models`, {
    headers: { ...attributionHeaders() },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Catalogue OpenRouter indisponible (HTTP ${res.status}).`);
  }
  const json = (await res.json()) as { data?: RawModel[] };
  const models = (json.data ?? [])
    .filter((m) => m.id && !m.id.endsWith(":free"))
    .map<CatalogueModel>((m) => ({
      id: m.id,
      name: m.name || m.id,
      context_length: m.context_length ?? m.top_provider?.context_length ?? 0,
      max_completion_tokens: m.top_provider?.max_completion_tokens ?? null,
      prompt_price: Number(m.pricing?.prompt ?? 0),
      completion_price: Number(m.pricing?.completion ?? 0),
      structured_outputs: (m.supported_parameters ?? []).includes("structured_outputs"),
      reasoning: (m.supported_parameters ?? []).includes("reasoning"),
      audio_input: (m.architecture?.input_modalities ?? []).includes("audio"),
      created: m.created ?? 0,
    }));
  if (models.length === 0) throw new Error("Catalogue OpenRouter vide.");
  return models;
}

/**
 * The catalogue, served from memory for a few hours. Throws when OpenRouter
 * is unreachable and nothing is cached: callers decide what to show.
 */
export async function getCatalogue(): Promise<CatalogueModel[]> {
  if (catalogueCache && Date.now() - catalogueCache.fetchedAt < CATALOGUE_TTL_MS) {
    return catalogueCache.models;
  }
  if (!catalogueInFlight) {
    catalogueInFlight = fetchCatalogue()
      .then((models) => {
        catalogueCache = { fetchedAt: Date.now(), models };
        return models;
      })
      .finally(() => {
        catalogueInFlight = null;
      });
  }
  try {
    return await catalogueInFlight;
  } catch (err) {
    if (catalogueCache) return catalogueCache.models;
    throw err;
  }
}

/** Catalogue entry for one model, or null when unknown or catalogue down. */
export async function findCatalogueModel(modelId: string): Promise<CatalogueModel | null> {
  try {
    const models = await getCatalogue();
    return models.find((m) => m.id === modelId) ?? null;
  } catch {
    return null;
  }
}

// ─── Chat completion (streamed) ─────────────────────────────────────────────

export interface TextPart {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

/** Audio goes in base64; OpenRouter accepts no URL for it. */
export interface AudioPart {
  type: "input_audio";
  input_audio: { data: string; format: "wav" | "mp3" | "m4a" | "ogg" | "flac" | "webm" };
}

export type ContentPart = TextPart | AudioPart;

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

/** A web citation reported by an OpenRouter server tool (web_search, web_fetch). */
export interface UrlCitation {
  url: string;
  title: string | null;
  content: string | null;
}

export type ChatMessage =
  | { role: "system" | "user"; content: string | ContentPart[] }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: ToolCall[];
      /** Passed back unmodified so the model resumes its reasoning after a tool result. */
      reasoning_details?: unknown[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

export interface CompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cache_write_tokens: number;
  reasoning_tokens: number;
  /** USD: OpenRouter's charge plus the upstream provider's when the key is the organisation's own. */
  cost: number;
  byok: boolean;
  /** Server tool invocations OpenRouter ran inside this request. */
  web_search_requests: number;
}

export interface CompletionResult {
  id: string | null;
  model: string | null;
  content: string;
  finish_reason: string | null;
  usage: CompletionUsage;
  /** Client tools the model asks to run; empty when it answered. */
  tool_calls: ToolCall[];
  /** Reasoning blocks to pass back with the assistant message on the next turn. */
  reasoning_details: unknown[];
  /** Web pages the server tools cited. */
  citations: UrlCitation[];
}

export class OpenRouterError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenRouterError";
    this.status = status;
  }
}

export class CompletionTimeoutError extends Error {
  constructor(seconds: number) {
    super(`Délai dépassé : le modèle n'a pas terminé en ${seconds} s.`);
    this.name = "CompletionTimeoutError";
  }
}

export interface CompletionRequest {
  model: string;
  messages: ChatMessage[];
  /** null: nothing sent, the model decides (the helpers do not need reasoning). */
  reasoning: ReasoningEffort | null;
  jsonSchema: Record<string, unknown> | null;
  maxTokens: number;
  timeoutMs: number;
  /** Called with each piece of text as it arrives, for callers that relay the stream. */
  onDelta?: (text: string) => void;
  /** Client tool definitions (OpenAI shape) and OpenRouter server tools, as sent. */
  tools?: unknown[];
  toolChoice?: "auto" | "none";
}

function describeHttpError(status: number, body: string): string {
  let detail = body;
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string; code?: number; metadata?: { raw?: string; provider_name?: string } } };
    const e = parsed.error;
    if (e?.message) {
      detail = e.message;
      if (e.metadata?.provider_name) detail += ` (fournisseur : ${e.metadata.provider_name})`;
      if (e.metadata?.raw && typeof e.metadata.raw === "string") detail += ` — ${e.metadata.raw.slice(0, 300)}`;
    }
  } catch {
    // keep raw body
  }
  const kind =
    status === 429
      ? "Limite de débit atteinte"
      : status === 402
        ? "Crédits OpenRouter insuffisants"
        : status === 404
          ? "Modèle introuvable"
          : status === 413 || /context|too long|maximum.*tokens/i.test(detail)
            ? "Contexte trop long pour le modèle"
            : status === 502 || status === 503 || status === 529
              ? "Fournisseur indisponible"
              : status === 408 || status === 524
                ? "Délai dépassé côté fournisseur"
                : "Erreur OpenRouter";
  return `${kind} (HTTP ${status}) : ${detail.slice(0, 600)}`;
}

/**
 * Runs one chat completion in streaming mode and collects the whole answer.
 * Streaming keeps the connection alive during long generations; usage and
 * cost arrive in the last event.
 */
export async function streamChatCompletion(req: CompletionRequest): Promise<CompletionResult> {
  try {
    return await runCompletion(req);
  } catch (err) {
    // Some models refuse to have their reasoning switched off (Gemini Flash):
    // once more without the parameter, the model reasons as it likes.
    if (err instanceof OpenRouterError && err.status === 400 && req.reasoning !== null && /reasoning/i.test(err.message) && /mandatory|cannot be disabled|not supported/i.test(err.message)) {
      return runCompletion({ ...req, reasoning: null });
    }
    throw err;
  }
}

async function runCompletion(req: CompletionRequest): Promise<CompletionResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs);

  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    stream: true,
    max_tokens: req.maxTokens,
    usage: { include: true },
  };
  // Models that do not reason ignore this parameter without error.
  if (req.reasoning !== null) body.reasoning = req.reasoning === "none" ? { enabled: false } : { effort: req.reasoning };
  if (req.tools && req.tools.length > 0) {
    body.tools = req.tools;
    body.tool_choice = req.toolChoice ?? "auto";
  }
  if (req.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: "agent_findings", strict: true, schema: req.jsonSchema },
    };
  }

  let res: Response;
  try {
    res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey()}`,
        "Content-Type": "application/json",
        ...attributionHeaders(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error).name === "AbortError") throw new CompletionTimeoutError(Math.round(req.timeoutMs / 1000));
    throw err;
  }

  if (!res.ok || !res.body) {
    clearTimeout(timer);
    const text = await res.text().catch(() => "");
    throw new OpenRouterError(describeHttpError(res.status, text), res.status);
  }

  const result: CompletionResult = {
    id: null,
    model: null,
    content: "",
    finish_reason: null,
    usage: { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0, cache_write_tokens: 0, reasoning_tokens: 0, cost: 0, byok: false, web_search_requests: 0 },
    tool_calls: [],
    reasoning_details: [],
    citations: [],
  };
  // Streamed tool calls arrive in pieces keyed by index; reasoning details too.
  const toolCallsByIndex = new Map<number, ToolCall>();
  const reasoningByIndex = new Map<number, Record<string, unknown>>();
  const citationUrls = new Set<string>();

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let streamError: string | null = null;

  const handleEvent = (data: string) => {
    if (data === "[DONE]") return;
    let chunk: {
      id?: string;
      model?: string;
      error?: { message?: string; code?: number };
      choices?: Array<{
        delta?: {
          content?: string | null;
          tool_calls?: Array<{ index?: number; id?: string; type?: string; function?: { name?: string; arguments?: string } }>;
          reasoning_details?: Array<Record<string, unknown>>;
          annotations?: Array<{ type?: string; url_citation?: { url?: string; title?: string; content?: string } }>;
        };
        message?: { annotations?: Array<{ type?: string; url_citation?: { url?: string; title?: string; content?: string } }> };
        finish_reason?: string | null;
        error?: { message?: string };
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        cost?: number;
        is_byok?: boolean;
        prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
        completion_tokens_details?: { reasoning_tokens?: number };
        cost_details?: { upstream_inference_cost?: number | null };
        server_tool_use?: { web_search_requests?: number };
      };
    };
    try {
      chunk = JSON.parse(data);
    } catch {
      return;
    }
    if (chunk.error?.message) {
      streamError = chunk.error.message;
    }
    if (chunk.id) result.id = chunk.id;
    if (chunk.model) result.model = chunk.model;
    const choice = chunk.choices?.[0];
    if (choice?.delta?.content) {
      result.content += choice.delta.content;
      req.onDelta?.(choice.delta.content);
    }
    for (const tc of choice?.delta?.tool_calls ?? []) {
      const index = tc.index ?? toolCallsByIndex.size;
      const current = toolCallsByIndex.get(index) ?? { id: "", type: "function" as const, function: { name: "", arguments: "" } };
      if (tc.id) current.id = tc.id;
      if (tc.function?.name) current.function.name += tc.function.name;
      if (tc.function?.arguments) current.function.arguments += tc.function.arguments;
      toolCallsByIndex.set(index, current);
    }
    for (const rd of choice?.delta?.reasoning_details ?? []) {
      const index = typeof rd.index === "number" ? rd.index : reasoningByIndex.size;
      const current = reasoningByIndex.get(index);
      if (!current) {
        reasoningByIndex.set(index, { ...rd });
        continue;
      }
      // Text and summaries stream in pieces; encrypted data and signatures arrive whole.
      for (const [k, v] of Object.entries(rd)) {
        if ((k === "text" || k === "summary") && typeof v === "string") current[k] = `${(current[k] as string) ?? ""}${v}`;
        else if (v !== null && v !== undefined) current[k] = v;
      }
    }
    for (const a of [...(choice?.delta?.annotations ?? []), ...(choice?.message?.annotations ?? [])]) {
      const c = a.url_citation;
      if (a.type === "url_citation" && c?.url && !citationUrls.has(c.url)) {
        citationUrls.add(c.url);
        result.citations.push({ url: c.url, title: c.title ?? null, content: c.content ?? null });
      }
    }
    if (choice?.finish_reason) result.finish_reason = choice.finish_reason;
    if (choice?.error?.message) streamError = choice.error.message;
    if (chunk.usage) {
      const u = chunk.usage;
      result.usage = {
        prompt_tokens: u.prompt_tokens ?? 0,
        completion_tokens: u.completion_tokens ?? 0,
        cached_tokens: u.prompt_tokens_details?.cached_tokens ?? 0,
        cache_write_tokens: u.prompt_tokens_details?.cache_write_tokens ?? 0,
        reasoning_tokens: u.completion_tokens_details?.reasoning_tokens ?? 0,
        // With a provider key of the organisation's own (BYOK), OpenRouter's
        // `cost` is only its fee; what the provider charges is reported apart.
        cost: (u.cost ?? 0) + (u.cost_details?.upstream_inference_cost ?? 0),
        byok: u.is_byok ?? false,
        web_search_requests: u.server_tool_use?.web_search_requests ?? 0,
      };
    }
  };

  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).replace(/\r$/, "");
        buffer = buffer.slice(nl + 1);
        if (!line || line.startsWith(":")) continue; // keep-alive comments
        if (line.startsWith("data:")) handleEvent(line.slice(5).trim());
      }
    }
    if (buffer.startsWith("data:")) handleEvent(buffer.slice(5).trim());
  } catch (err) {
    if ((err as Error).name === "AbortError") throw new CompletionTimeoutError(Math.round(req.timeoutMs / 1000));
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (streamError) throw new OpenRouterError(`Erreur du fournisseur pendant la génération : ${streamError}`, 502);
  result.tool_calls = Array.from(toolCallsByIndex.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, tc]) => tc)
    .filter((tc) => tc.function.name);
  result.reasoning_details = Array.from(reasoningByIndex.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, rd]) => rd);
  return result;
}
