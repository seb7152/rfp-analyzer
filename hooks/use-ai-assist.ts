"use client";

import type { AssistField } from "@/lib/ai/settings";

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? fallback;
}

/** Reads a plain-text stream and hands each piece to `onText`; returns the whole text. */
async function consume(res: Response, onText: (sofar: string) => void, signal?: AbortSignal): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = "";
  for (;;) {
    if (signal?.aborted) {
      await reader.cancel();
      break;
    }
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onText(text);
  }
  text += decoder.decode();
  onText(text);
  return text;
}

export interface AssistTarget {
  rfpId: string;
  supplierId?: string | null;
  field: AssistField;
}

/** Sends a WAV recording; the transcription streams into `onText` as it is produced. */
export async function transcribeRecording(
  target: AssistTarget,
  audio: Blob,
  onText: (sofar: string) => void,
  signal?: AbortSignal
): Promise<string> {
  const form = new FormData();
  form.append("audio", audio, "dictee.wav");
  form.append("rfpId", target.rfpId);
  form.append("field", target.field);
  if (target.supplierId) form.append("supplierId", target.supplierId);
  const res = await fetch("/api/ai/transcribe", { method: "POST", credentials: "include", body: form, signal });
  if (!res.ok) throw new Error(await readError(res, "La transcription a échoué."));
  return consume(res, onText, signal);
}

/** Sends a text; the rewritten version streams into `onText`. */
export async function rewriteText(target: AssistTarget, text: string, onText: (sofar: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await fetch("/api/ai/rewrite", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rfpId: target.rfpId, supplierId: target.supplierId ?? null, field: target.field, text }),
    signal,
  });
  if (!res.ok) throw new Error(await readError(res, "La remise en forme a échoué."));
  return consume(res, onText, signal);
}
