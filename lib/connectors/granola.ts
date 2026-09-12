/**
 * Granola's public API (https://docs.granola.ai): the meetings a key can see
 * and their transcripts. A transcript is a list of timed segments whose
 * voices are distinguished (me / them / a diarization label) but not named.
 */

const BASE_URL = "https://public-api.granola.ai/v1";
/** The API allows 5 requests per second; transcripts come in pages of 50 segments. */
const PAGE_DELAY_MS = 250;
const MAX_TRANSCRIPT_PAGES = 400;

export class GranolaError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "GranolaError";
  }
}

export interface GranolaNote {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  owner?: { name?: string | null; email?: string | null } | null;
  attendees?: Array<{ name?: string | null; email?: string | null }> | null;
  web_url?: string | null;
}

export interface GranolaSegment {
  text: string;
  start_time: string;
  end_time: string;
  speaker?: { source?: string; attribution?: string; diarization_label?: string } | null;
}

async function call<T>(key: string, path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message =
      res.status === 401 || res.status === 403
        ? "Clé Granola refusée."
        : res.status === 404
          ? "Réunion introuvable dans Granola."
          : res.status === 429
            ? "Granola limite les appels ; réessayez dans quelques secondes."
            : `Granola a répondu ${res.status}${text ? ` : ${text.slice(0, 200)}` : ""}.`;
    throw new GranolaError(res.status, message);
  }
  return (await res.json()) as T;
}

/** Checks a key and tells who it belongs to and how many notes it sees on 30 days. */
export async function verifyKey(key: string): Promise<{ owner_name: string | null; owner_email: string | null; notes_30d: number }> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const page = await call<{ notes: GranolaNote[]; hasMore: boolean }>(key, `/notes?created_after=${encodeURIComponent(since)}`);
  const owner = page.notes[0]?.owner ?? null;
  return { owner_name: owner?.name ?? null, owner_email: owner?.email ?? null, notes_30d: page.notes.length + (page.hasMore ? 1 : 0) };
}

/**
 * Meetings created in a window around a date (a soutenance is looked up from
 * its scheduled date), newest first. A few pages at most.
 */
export async function listNotesAround(key: string, around: Date, days = 10): Promise<GranolaNote[]> {
  const from = new Date(around.getTime() - days * 86_400_000);
  const to = new Date(around.getTime() + days * 86_400_000);
  const notes: GranolaNote[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 6; page++) {
    const query = new URLSearchParams({ created_after: from.toISOString() });
    if (cursor) query.set("cursor", cursor);
    const res = await call<{ notes: GranolaNote[]; hasMore: boolean; cursor?: string }>(key, `/notes?${query}`);
    notes.push(...res.notes);
    if (!res.hasMore || !res.cursor) break;
    cursor = res.cursor;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }
  return notes
    .filter((n) => new Date(n.created_at).getTime() <= to.getTime())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getNote(key: string, noteId: string): Promise<GranolaNote> {
  return call<GranolaNote>(key, `/notes/${encodeURIComponent(noteId)}`);
}

/** The whole transcript, page after page. */
export async function getTranscript(key: string, noteId: string): Promise<GranolaSegment[]> {
  const segments: GranolaSegment[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_TRANSCRIPT_PAGES; page++) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    const res = await call<{ transcript: GranolaSegment[]; hasMore: boolean; cursor?: string }>(key, `/notes/${encodeURIComponent(noteId)}/transcript${query}`);
    segments.push(...(res.transcript ?? []));
    if (!res.hasMore || !res.cursor) break;
    cursor = res.cursor;
    await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
  }
  return segments;
}

/**
 * A segment as the product stores it: seconds from the start of the
 * meeting, a voice code, the text. Consecutive segments of the same voice
 * are merged so that a quote can span what one person said in one go.
 */
export interface TranscriptSegment {
  t: number;
  end: number;
  voice: string;
  text: string;
}

function voiceOf(s: GranolaSegment): string {
  const label = s.speaker?.diarization_label?.trim();
  if (label) return label.replace(/^speaker\s+/i, "").trim() || "them";
  const attribution = s.speaker?.attribution?.trim().toLowerCase();
  if (attribution === "me" || s.speaker?.source === "microphone") return "me";
  return "them";
}

export function normaliseSegments(raw: GranolaSegment[]): TranscriptSegment[] {
  const timed = raw
    .map((s) => ({ ...s, startMs: Date.parse(s.start_time), endMs: Date.parse(s.end_time) }))
    .filter((s) => Number.isFinite(s.startMs) && s.text?.trim());
  if (timed.length === 0) return [];
  timed.sort((a, b) => a.startMs - b.startMs);
  const origin = timed[0].startMs;
  const out: TranscriptSegment[] = [];
  for (const s of timed) {
    const voice = voiceOf(s);
    const t = Math.max(0, Math.round((s.startMs - origin) / 1000));
    const end = Number.isFinite(s.endMs) ? Math.max(t, Math.round((s.endMs - origin) / 1000)) : t;
    const last = out[out.length - 1];
    // Same voice within 8 s: one turn of speech.
    if (last && last.voice === voice && t - last.end <= 8) {
      last.text = `${last.text} ${s.text.trim()}`;
      last.end = end;
    } else {
      out.push({ t, end, voice, text: s.text.trim() });
    }
  }
  return out;
}

/** Segments from a pasted text: one per line, no timing, one voice. */
export function segmentsFromText(text: string): TranscriptSegment[] {
  return text
    .split(/\n{2,}|\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // "[00:12:34] Nom : texte" or "Nom : texte" are recognised when present.
      const m = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(?:[-–]\s*)?(?:([^:]{1,40}):\s*)?(.*)$/);
      if (m) {
        const parts = m[1].split(":").map(Number);
        const t = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
        return { t, end: t, voice: m[2]?.trim() || "them", text: m[3].trim() };
      }
      const named = line.match(/^([^:]{1,40}):\s+(.+)$/);
      if (named) return { t: 0, end: 0, voice: named[1].trim(), text: named[2].trim() };
      return { t: 0, end: 0, voice: "them", text: line };
    });
}

export function formatAt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${String(h).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

export type VoiceNames = Record<string, string>;

/** How a voice is shown: the name given to it, or Granola's own distinction. */
export function voiceLabel(voice: string, names: VoiceNames): string {
  const named = names[voice]?.trim();
  if (named) return named;
  if (voice === "me") return "Moi";
  if (voice === "them") return "Intervenant";
  if (/^[A-Z]$/.test(voice)) return `Intervenant ${voice}`;
  return voice;
}

export function distinctVoices(segments: TranscriptSegment[]): string[] {
  const seen: string[] = [];
  for (const s of segments) if (!seen.includes(s.voice)) seen.push(s.voice);
  return seen;
}

/** The transcript as the model reads it: one line per turn, timed and voiced. */
export function renderTranscript(segments: TranscriptSegment[], names: VoiceNames, timed: boolean): string {
  return segments.map((s) => `${timed ? `[${formatAt(s.t)}] ` : ""}${voiceLabel(s.voice, names)} : ${s.text}`).join("\n");
}

/** The words the quotes are verified against: the turns, without labels. */
export function transcriptPlainText(segments: TranscriptSegment[]): string {
  return segments.map((s) => s.text).join("\n");
}

export function wordCount(segments: TranscriptSegment[]): number {
  return segments.reduce((n, s) => n + s.text.split(/\s+/).filter(Boolean).length, 0);
}

export function durationSeconds(segments: TranscriptSegment[]): number {
  return segments.length === 0 ? 0 : Math.max(...segments.map((s) => s.end));
}
