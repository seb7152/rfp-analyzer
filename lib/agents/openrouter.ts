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
  process.env.OPENROUTER_DEFAULT_MODEL || "anthropic/claude-opus-5";

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
  top_provider?: { context_length?: number | null };
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
      prompt_price: Number(m.pricing?.prompt ?? 0),
      completion_price: Number(m.pricing?.completion ?? 0),
      structured_outputs: (m.supported_parameters ?? []).includes("structured_outputs"),
      reasoning: (m.supported_parameters ?? []).includes("reasoning"),
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

export interface ContentPart {
  type: "text";
  text: string;
  cache_control?: { type: "ephemeral" };
}

export interface ChatMessage {
  role: "system" | "user";
  content: string | ContentPart[];
}

export interface CompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cache_write_tokens: number;
  reasoning_tokens: number;
  cost: number;
}

export interface CompletionResult {
  id: string | null;
  model: string | null;
  content: string;
  finish_reason: string | null;
  usage: CompletionUsage;
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
  reasoning: ReasoningEffort;
  jsonSchema: Record<string, unknown> | null;
  maxTokens: number;
  timeoutMs: number;
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs);

  const body: Record<string, unknown> = {
    model: req.model,
    messages: req.messages,
    stream: true,
    max_tokens: req.maxTokens,
    usage: { include: true },
  };
  if (req.reasoning !== "none") {
    body.reasoning = { effort: req.reasoning };
  } else {
    body.reasoning = { effort: "none" };
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
    usage: { prompt_tokens: 0, completion_tokens: 0, cached_tokens: 0, cache_write_tokens: 0, reasoning_tokens: 0, cost: 0 },
  };

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
      choices?: Array<{ delta?: { content?: string | null }; finish_reason?: string | null; error?: { message?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        cost?: number;
        prompt_tokens_details?: { cached_tokens?: number; cache_write_tokens?: number };
        completion_tokens_details?: { reasoning_tokens?: number };
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
    if (choice?.delta?.content) result.content += choice.delta.content;
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
        cost: u.cost ?? 0,
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
  return result;
}
