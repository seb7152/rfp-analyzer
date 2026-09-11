/**
 * Verbatim quote verification: the guarantee the product sells. A quote is
 * "verified" when it exists word for word in the response text once
 * whitespace and typographic apostrophes/quotes have been normalised.
 *
 * Pure functions, usable both by the worker and by the browser (to highlight
 * the quoted passage in the response).
 */

const APOSTROPHES = new Set(["‘", "’", "‚", "‛", "′"]);
const DOUBLE_QUOTES = new Set(["“", "”", "„", "‟", "″", "«", "»"]);

function normaliseChar(ch: string): string {
  if (/\s/.test(ch)) return " ";
  if (APOSTROPHES.has(ch)) return "'";
  if (DOUBLE_QUOTES.has(ch)) return '"';
  return ch;
}

/**
 * Normalises a text and keeps, for every character of the result, the index
 * of the source character it came from. Runs of whitespace collapse to one
 * space; leading and trailing whitespace is dropped.
 */
function normaliseWithMap(text: string): { normalised: string; map: number[] } {
  const nfc = text.normalize("NFC");
  const out: string[] = [];
  const map: number[] = [];
  let pendingSpace = false;
  for (let i = 0; i < nfc.length; i++) {
    const ch = normaliseChar(nfc[i]);
    if (ch === " ") {
      pendingSpace = out.length > 0;
      continue;
    }
    if (pendingSpace) {
      out.push(" ");
      map.push(i - 1);
      pendingSpace = false;
    }
    out.push(ch);
    map.push(i);
  }
  return { normalised: out.join(""), map };
}

export function normaliseQuote(text: string): string {
  return normaliseWithMap(text).normalised;
}

/**
 * Finds a quote in a text. Returns the [start, end) range in the original
 * text, or null when the quote is not found verbatim.
 */
export function findQuoteRange(text: string, quote: string): { start: number; end: number } | null {
  const q = normaliseQuote(quote);
  if (!q) return null;
  const { normalised, map } = normaliseWithMap(text);
  const at = normalised.indexOf(q);
  if (at < 0) return null;
  const start = map[at];
  const end = map[at + q.length - 1] + 1;
  return { start, end };
}

export function verifyQuote(text: string | null | undefined, quote: string): boolean {
  if (!text) return false;
  return findQuoteRange(text, quote) !== null;
}
