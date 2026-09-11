import { NextRequest, NextResponse } from "next/server";
import { failure, requireUser } from "@/lib/agents/auth";
import { resolveAssistContext, streamTextResponse, systemPromptFor } from "@/lib/ai/assist";
import type { AssistField } from "@/lib/ai/settings";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Vercel refuses bodies above 4,5 Mo; WAV 16 kHz mono is 1,9 Mo per minute. */
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const FORMATS: Record<string, "wav" | "mp3" | "m4a" | "ogg" | "flac" | "webm"> = {
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "audio/webm": "webm",
};

/**
 * POST /api/ai/transcribe — multipart: audio, rfpId, field, supplierId?.
 * Streams the cleaned-up transcription as plain text.
 */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const form = await request.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Formulaire illisible." }, { status: 400 });
    const audio = form.get("audio");
    const rfpId = String(form.get("rfpId") ?? "");
    const field = String(form.get("field") ?? "comment") as AssistField;
    const supplierId = form.get("supplierId") ? String(form.get("supplierId")) : null;
    if (!(audio instanceof Blob) || audio.size === 0) return NextResponse.json({ error: "Aucun enregistrement reçu." }, { status: 400 });
    if (audio.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "Enregistrement trop long (4 Mo au plus)." }, { status: 413 });
    if (!rfpId) return NextResponse.json({ error: "rfpId est requis." }, { status: 400 });
    if (field !== "comment" && field !== "question") return NextResponse.json({ error: "Champ inconnu." }, { status: 400 });
    const format = FORMATS[audio.type.split(";")[0]];
    if (!format) return NextResponse.json({ error: `Format audio non pris en charge : ${audio.type || "inconnu"}.` }, { status: 415 });

    const resolved = await resolveAssistContext(supabase, user.id, rfpId, supplierId);
    if (resolved.error) return resolved.error;
    const { ctx } = resolved;
    const data = Buffer.from(await audio.arrayBuffer()).toString("base64");

    return streamTextResponse({
      model: ctx.settings.transcription_model_id,
      system: systemPromptFor("transcription", ctx, field),
      user: [
        { type: "input_audio", input_audio: { data, format } },
        { type: "text", text: "Transcris cet enregistrement." },
      ],
      maxTokens: 4_000,
      timeoutMs: 110_000,
    });
  } catch (err) {
    return failure(err, "La transcription a échoué.");
  }
}
