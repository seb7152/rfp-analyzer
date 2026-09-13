/**
 * The corrections layer of a transcript: the raw segments stay as imported,
 * a list of replacements (from the glossary, the agent's targeted pass, or a
 * hand edit) is applied in order to give the text that is displayed,
 * searched and sent to the agents. Pure functions, shared by the worker and
 * the browser.
 */

import type { TranscriptSegment } from "@/lib/connectors/granola";

export type CorrectionSource = "glossary" | "agent" | "manual";

export interface TranscriptCorrection {
  /** Index of the segment in transcript_segments. */
  i: number;
  /** Text to replace, as it reads once the previous corrections are applied. */
  from: string;
  to: string;
  /** Which occurrence of `from` in the segment (0 by default). */
  n?: number;
  by: CorrectionSource;
}

/** A corrected passage, in the coordinates of the corrected segment text. */
export interface CorrectedSpan {
  start: number;
  end: number;
  /** What the raw transcript had there. */
  raw: string;
  by: CorrectionSource;
  /** Indexes, in the corrections list, of the corrections this span comes from. */
  indexes: number[];
}

export interface CorrectedSegment extends TranscriptSegment {
  raw: string;
  spans: CorrectedSpan[];
}

function nthIndexOf(text: string, needle: string, n: number): number {
  let from = 0;
  for (let k = 0; ; k++) {
    const at = text.indexOf(needle, from);
    if (at < 0) return -1;
    if (k === n) return at;
    from = at + Math.max(needle.length, 1);
  }
}

/**
 * Applies the corrections to the segments. A correction whose text is no
 * longer found (an earlier one was removed, the text changed) is skipped:
 * the list tolerates removals. Spans overlapped by a later correction merge
 * into it, keeping the earliest raw text when the chain is continuous.
 */
export function applyCorrections(segments: TranscriptSegment[], corrections: TranscriptCorrection[]): CorrectedSegment[] {
  const out: CorrectedSegment[] = segments.map((s) => ({ ...s, raw: s.text, spans: [] }));
  corrections.forEach((c, index) => {
    const seg = out[c.i];
    if (!seg || !c.from || c.to === c.from) return;
    const at = nthIndexOf(seg.text, c.from, c.n ?? 0);
    if (at < 0) return;
    const end = at + c.from.length;
    const delta = c.to.length - c.from.length;
    const overlapped = seg.spans.filter((sp) => sp.start < end && sp.end > at);
    const kept = seg.spans.filter((sp) => !(sp.start < end && sp.end > at));
    let raw = c.from;
    if (overlapped.length > 0) {
      const covers = overlapped.every((sp) => sp.start >= at && sp.end <= end);
      if (covers) {
        // Rebuild the raw text of the replaced range from the raw pieces and the untouched text between them.
        const sorted = [...overlapped].sort((a, b) => a.start - b.start);
        let cursor = at;
        raw = "";
        for (const sp of sorted) {
          raw += seg.text.slice(cursor, sp.start) + sp.raw;
          cursor = sp.end;
        }
        raw += seg.text.slice(cursor, end);
      }
    }
    for (const sp of kept) {
      if (sp.start >= end) {
        sp.start += delta;
        sp.end += delta;
      }
    }
    // Back to the raw text: no span left to show (a hand restore of the raw).
    if (c.to !== raw) kept.push({ start: at, end: at + c.to.length, raw, by: c.by, indexes: [...overlapped.flatMap((sp) => sp.indexes), index] });
    kept.sort((a, b) => a.start - b.start);
    seg.spans = kept;
    seg.text = seg.text.slice(0, at) + c.to + seg.text.slice(end);
  });
  return out;
}

/** The corrected segments without their bookkeeping: what the agents read. */
export function correctedSegments(segments: TranscriptSegment[], corrections: TranscriptCorrection[]): TranscriptSegment[] {
  return applyCorrections(segments, corrections).map(({ t, end, voice, text }) => ({ t, end, voice, text }));
}

/** Lower case, no diacritics, typographic apostrophes folded: how search compares. */
export function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[‘’‚‛′]/g, "'")
    .toLowerCase();
}

/** Ranges of `query` in `text`, compared folded; diacritics keep the lengths so offsets map one to one. */
export function findMatches(text: string, query: string): Array<{ start: number; end: number }> {
  const q = fold(query.trim());
  if (!q) return [];
  const t = fold(text);
  if (t.length !== text.length) return findMatchesSlow(text, q);
  const out: Array<{ start: number; end: number }> = [];
  let from = 0;
  for (;;) {
    const at = t.indexOf(q, from);
    if (at < 0) break;
    out.push({ start: at, end: at + q.length });
    from = at + q.length;
  }
  return out;
}

/** When folding changed the length (rare ligatures), match character by character. */
function findMatchesSlow(text: string, q: string): Array<{ start: number; end: number }> {
  const chars = Array.from(text);
  const folded = chars.map((ch) => fold(ch));
  const out: Array<{ start: number; end: number }> = [];
  let offset = 0;
  const offsets = chars.map((ch) => {
    const o = offset;
    offset += ch.length;
    return o;
  });
  for (let i = 0; i < chars.length; i++) {
    let acc = "";
    for (let j = i; j < chars.length && acc.length < q.length; j++) {
      acc += folded[j];
      if (acc === q) {
        out.push({ start: offsets[i], end: offsets[j] + chars[j].length });
        i = j;
        break;
      }
      if (!q.startsWith(acc)) break;
    }
  }
  return out;
}

export interface GlossaryTermLike {
  term: string;
  aliases: string[];
}

const WORD = "\\p{L}\\p{N}";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * The deterministic pass: every alias of a term, and the term itself when
 * written with another case or accents, as a whole word and regardless of
 * case or accents, becomes the term. Produces corrections (one per
 * occurrence) rather than a new text, so they show and undo like the others.
 */
export function glossaryCorrections(segments: TranscriptSegment[], terms: GlossaryTermLike[]): TranscriptCorrection[] {
  const out: TranscriptCorrection[] = [];
  const rules: Array<{ alias: string; term: string }> = [];
  const seen = new Set<string>();
  for (const t of terms) {
    const term = t.term.trim();
    if (!term) continue;
    const termKey = fold(term);
    for (const a of [term, ...t.aliases]) {
      const alias = a.trim();
      const key = fold(alias);
      if (alias.length < 2 || seen.has(key)) continue;
      // A form contained in the term ("Mauritius" for "Mauritius Delivery Center") would expand every plain mention: left to the agent.
      if (key !== termKey && termKey.includes(key)) continue;
      seen.add(key);
      rules.push({ alias, term });
    }
  }
  if (rules.length === 0) return out;
  // Longest aliases first, so "Beeldi Pro" wins over "Beeldi" when both are aliases.
  rules.sort((a, b) => b.alias.length - a.alias.length);
  const patterns = rules.map((r) => ({
    ...r,
    re: new RegExp(`(?<![${WORD}])${escapeRegExp(fold(r.alias))}(?![${WORD}])`, "gu"),
  }));
  segments.forEach((s, i) => {
    const folded = fold(s.text);
    if (folded.length !== s.text.length) return; // offsets would not map: leave the segment to the agent
    const taken: Array<[number, number]> = [];
    const hits: Array<{ start: number; end: number; term: string }> = [];
    for (const p of patterns) {
      p.re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = p.re.exec(folded))) {
        const start = m.index;
        const end = start + m[0].length;
        if (taken.some(([a, b]) => start < b && end > a)) continue;
        const original = s.text.slice(start, end);
        if (original === p.term) continue;
        taken.push([start, end]);
        hits.push({ start, end, term: p.term });
      }
    }
    hits.sort((a, b) => a.start - b.start);
    // Corrections apply in order, each on the text the previous ones left: the occurrence
    // number is counted on that intermediate text, replayed here.
    let working = s.text;
    let shift = 0;
    for (const h of hits) {
      const original = s.text.slice(h.start, h.end);
      const start = h.start + shift;
      out.push({ i, from: original, to: h.term, n: countOccurrences(working.slice(0, start), original), by: "glossary" });
      working = working.slice(0, start) + h.term + working.slice(start + original.length);
      shift += h.term.length - original.length;
    }
  });
  return out;
}

function countOccurrences(text: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  let from = 0;
  for (;;) {
    const at = text.indexOf(needle, from);
    if (at < 0) return n;
    n++;
    from = at + needle.length;
  }
}

/** The occurrence number of `needle` at `offset` in `text`, for a hand edit. */
export function occurrenceAt(text: string, needle: string, offset: number): number {
  return countOccurrences(text.slice(0, offset), needle);
}
