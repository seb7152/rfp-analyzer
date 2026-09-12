/**
 * Browser side of the audio import of a séance: the recording is decoded to
 * 16 kHz mono, cut into two-minute pieces (the API refuses larger bodies),
 * each piece transcribed verbatim with timed lines, then the lines are
 * re-timed from the piece's offset and assembled into one pasted-style text.
 */

import { DICTATION_SAMPLE_RATE, decodeToMono, encodeWav } from "@/lib/audio/wav";

export const PIECE_SECONDS = 120;

export interface AudioImportProgress {
  piece: number;
  pieces: number;
  seconds: number;
}

function parseAt(raw: string): number | null {
  const m = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  return m[3] ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : Number(m[1]) * 60 + Number(m[2]);
}

function formatAt(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${String(h).padStart(2, "0")}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Re-times the lines of one piece from the start of the recording. */
export function retimeLines(text: string, offsetSeconds: number): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.*)$/);
      if (!m) return `[${formatAt(offsetSeconds)}] ${line}`;
      const at = parseAt(m[1]);
      return `[${formatAt(offsetSeconds + (at ?? 0))}] ${m[2]}`;
    });
}

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? fallback;
}

/**
 * Transcribes a recording piece by piece. Returns the assembled text and the
 * cost the provider reported. Stops on the first failure or on abort.
 */
export async function transcribeRecording(
  rfpId: string,
  supplierId: string,
  file: Blob,
  onProgress: (p: AudioImportProgress) => void,
  signal?: AbortSignal
): Promise<{ text: string; cost: number; seconds: number }> {
  const samples = await decodeToMono(file);
  const total = samples.length / DICTATION_SAMPLE_RATE;
  const pieceLength = PIECE_SECONDS * DICTATION_SAMPLE_RATE;
  const pieces = Math.max(1, Math.ceil(samples.length / pieceLength));
  const lines: string[] = [];
  let cost = 0;
  for (let i = 0; i < pieces; i++) {
    if (signal?.aborted) throw new Error("Import interrompu.");
    onProgress({ piece: i + 1, pieces, seconds: total });
    const slice = samples.subarray(i * pieceLength, Math.min(samples.length, (i + 1) * pieceLength));
    const form = new FormData();
    form.append("audio", encodeWav(slice), `morceau-${i + 1}.wav`);
    const res = await fetch(`/api/rfps/${rfpId}/soutenances/${supplierId}/transcript/audio`, { method: "POST", credentials: "include", body: form, signal });
    if (!res.ok) throw new Error(await readError(res, `La transcription du morceau ${i + 1} a échoué.`));
    const body = (await res.json()) as { text: string; cost: number };
    lines.push(...retimeLines(body.text, i * PIECE_SECONDS));
    cost += body.cost ?? 0;
  }
  return { text: lines.join("\n"), cost, seconds: total };
}
