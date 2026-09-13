/**
 * Server side of the dictation and rewriting helpers: who may use them on a
 * consultation, what the prompt knows about it, and the streamed answer.
 */

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EVALUATOR, requireRfpAccess } from "@/lib/agents/auth";
import { CompletionTimeoutError, OpenRouterError, streamChatCompletion, type ContentPart } from "@/lib/agents/openrouter";
import { loadGlossaryTerms } from "@/lib/soutenance/glossary";
import type { GlossaryTerm } from "@/lib/soutenance/types";
import { loadAiSettings, renderPrompt, type AiSettings, type AssistField } from "./settings";

export interface AssistContext {
  settings: AiSettings;
  consultationTitle: string;
  supplierNames: string[];
  /** The consultation's own vocabulary, spelt right by the dictation too. */
  terms: GlossaryTerm[];
}

/**
 * Access check (evaluators and above on the consultation), then the
 * organisation's settings and the names the prompt must spell right.
 */
export async function resolveAssistContext(
  db: SupabaseClient,
  userId: string,
  rfpId: string,
  supplierId: string | null
): Promise<{ ctx: AssistContext; error: null } | { ctx: null; error: NextResponse }> {
  const access = await requireRfpAccess(rfpId, userId, EVALUATOR);
  if (access.error) return { ctx: null, error: access.error };

  const [{ data: rfp, error: rfpError }, { data: suppliers, error: supError }] = await Promise.all([
    db.from("rfps").select("id, title, organization_id").eq("id", rfpId).maybeSingle(),
    db.from("suppliers").select("id, name").eq("rfp_id", rfpId).order("name"),
  ]);
  if (rfpError) throw new Error(rfpError.message);
  if (supError) throw new Error(supError.message);
  if (!rfp) return { ctx: null, error: NextResponse.json({ error: "Consultation introuvable." }, { status: 404 }) };

  const names = ((suppliers ?? []) as Array<{ id: string; name: string }>).map((s) => s.name);
  const current = ((suppliers ?? []) as Array<{ id: string; name: string }>).find((s) => s.id === supplierId)?.name;
  const supplierNames = current ? [current, ...names.filter((n) => n !== current)] : names;
  const [settings, terms] = await Promise.all([loadAiSettings(db, (rfp as { organization_id: string }).organization_id), loadGlossaryTerms(db, rfpId)]);
  return { ctx: { settings, consultationTitle: (rfp as { title: string }).title ?? "", supplierNames, terms }, error: null };
}

export function systemPromptFor(kind: "transcription" | "rewrite", ctx: AssistContext, field: AssistField): string {
  const template = kind === "transcription" ? ctx.settings.transcription_prompt : ctx.settings.rewrite_prompt;
  return renderPrompt(template, {
    field,
    consultationTitle: ctx.consultationTitle,
    supplierNames: ctx.supplierNames,
    vocabulary: ctx.settings.vocabulary,
    terms: ctx.terms,
  });
}

/**
 * Runs the completion and relays its text as it arrives, as a plain-text
 * stream. An error before the first byte is a JSON error response; after,
 * the stream simply ends and the client keeps what it received.
 */
export async function streamTextResponse(params: {
  model: string;
  system: string;
  user: ContentPart[];
  maxTokens: number;
  timeoutMs: number;
}): Promise<Response> {
  const encoder = new TextEncoder();
  let started = false;
  let resolveFirst: (r: Response) => void = () => {};
  const first = new Promise<Response>((resolve) => {
    resolveFirst = resolve;
  });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const result = await streamChatCompletion({
          model: params.model,
          messages: [
            { role: "system", content: params.system },
            { role: "user", content: params.user },
          ],
          reasoning: null,
          jsonSchema: null,
          maxTokens: params.maxTokens,
          timeoutMs: params.timeoutMs,
          onDelta: (text) => {
            if (!started) {
              started = true;
              resolveFirst(
                new Response(stream, {
                  status: 200,
                  headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
                })
              );
            }
            controller.enqueue(encoder.encode(text));
          },
        });
        if (!started) {
          // The model answered without streaming pieces, or with nothing.
          started = true;
          const text = result.content.trim();
          resolveFirst(
            text
              ? new Response(text, { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } })
              : NextResponse.json({ error: "Le modèle n'a rien renvoyé." }, { status: 502 })
          );
          controller.close();
          return;
        }
        controller.close();
      } catch (err) {
        if (!started) {
          started = true;
          const message = err instanceof Error ? err.message : "Erreur du modèle.";
          const status = err instanceof OpenRouterError ? 502 : err instanceof CompletionTimeoutError ? 504 : 500;
          resolveFirst(NextResponse.json({ error: message }, { status }));
          controller.close();
          return;
        }
        controller.error(err);
      }
    },
  });

  // `start` runs at construction: the first piece of text, or the error
  // before it, decides which response goes out.
  return first;
}
