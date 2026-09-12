import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { EVALUATOR, PILOT, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { GranolaError, distinctVoices, durationSeconds, getNote, getTranscript, normaliseSegments, segmentsFromText, transcriptPlainText, wordCount, type TranscriptSegment } from "@/lib/connectors/granola";
import { granolaAccess } from "@/lib/soutenance/api";
import { ensureSession } from "@/lib/soutenance/sessions";
import type { TranscriptMeta } from "@/lib/soutenance/types";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const bodySchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("granola"), note_id: z.string().trim().min(1).max(80) }),
  z.object({ source: z.literal("pasted"), text: z.string().trim().min(20).max(2_000_000), title: z.string().trim().max(200).optional() }),
  /** Lines assembled in the browser from the transcribed pieces of a recording. */
  z.object({ source: z.literal("audio"), text: z.string().trim().min(20).max(2_000_000), title: z.string().trim().max(200).optional(), cost: z.number().min(0).optional() }),
]);

/**
 * POST /api/rfps/[rfpId]/soutenances/[supplierId]/transcript — loads the
 * transcript of the séance from Granola (the chosen meeting) or from a
 * pasted text. Replaces the previous one; the compte rendu and proposals
 * already produced stay until the next analysis.
 */
export async function POST(request: NextRequest, { params }: { params: { rfpId: string; supplierId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    // Pasting is a pilot's act; fetching from Granola follows the organisation's rule.
    const access = await requireRfpAccess(params.rfpId, user.id, parsed.data.source === "granola" ? EVALUATOR : PILOT);
    if (access.error) return access.error;
    const { data: rfp } = await supabase.from("rfps").select("organization_id").eq("id", params.rfpId).single();
    const organizationId = (rfp as { organization_id: string }).organization_id;

    let segments: TranscriptSegment[];
    const meta: TranscriptMeta = { imported_at: new Date().toISOString(), imported_by: user.id };
    if (parsed.data.source === "granola") {
      const granola = await granolaAccess(supabase, organizationId, user.id, access.access);
      if (granola.error) return granola.error;
      try {
        const [note, raw] = await Promise.all([getNote(granola.key.key, parsed.data.note_id), getTranscript(granola.key.key, parsed.data.note_id)]);
        segments = normaliseSegments(raw);
        meta.granola_note_id = note.id;
        meta.title = note.title ?? null;
      } catch (err) {
        if (err instanceof GranolaError) return NextResponse.json({ error: err.message }, { status: err.status === 404 ? 404 : 502 });
        throw err;
      }
      if (segments.length === 0) return NextResponse.json({ error: "Cette réunion n'a pas de transcript dans Granola." }, { status: 409 });
    } else {
      segments = segmentsFromText(parsed.data.text);
      meta.title = parsed.data.title ?? null;
      if (segments.length === 0) return NextResponse.json({ error: parsed.data.source === "audio" ? "L'enregistrement n'a rien donné." : "Le texte collé est vide." }, { status: 400 });
    }
    meta.duration_seconds = durationSeconds(segments);
    meta.words = wordCount(segments);
    meta.voices = distinctVoices(segments);

    // The row is the pilot's; an evaluator allowed to fetch writes through the service.
    const db: SupabaseClient = access.access === "evaluator" ? createServiceClient() : supabase;
    const session = await ensureSession(db, params.rfpId, params.supplierId, user.id);
    const { data: updated, error: uError } = await db
      .from("soutenance_sessions")
      .update({
        transcript_source: parsed.data.source,
        transcript_text: transcriptPlainText(segments),
        transcript_segments: segments,
        transcript_meta: meta,
        voice_names: {},
      })
      .eq("id", session.id)
      .select("id, transcript_source, transcript_meta, transcript_segments, voice_names")
      .single();
    if (uError) throw new Error(uError.message);
    return NextResponse.json({ session: updated });
  } catch (err) {
    return failure(err);
  }
}

/** DELETE — removes the transcript of the séance (pilots). */
export async function DELETE(_request: NextRequest, { params }: { params: { rfpId: string; supplierId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    const { error: uError } = await supabase
      .from("soutenance_sessions")
      .update({ transcript_source: null, transcript_text: null, transcript_segments: null, transcript_meta: {}, voice_names: {} })
      .eq("rfp_id", params.rfpId)
      .eq("supplier_id", params.supplierId);
    if (uError) throw new Error(uError.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return failure(err);
  }
}
