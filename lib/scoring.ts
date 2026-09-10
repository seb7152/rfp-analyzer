/**
 * Scoring semantics shared by the evaluation workspace, the pilot's tracking
 * and the decision view. One place, one rule.
 */

export type ResponseStatus = "pending" | "pass" | "partial" | "fail" | "roadmap";

export interface ScoreLike {
  manual_score: number | null;
  ai_score: number | null;
}

/** The score that counts: the expert's when there is one, else the AI's. */
export function finalScore(r: ScoreLike): number | null {
  return r.manual_score ?? r.ai_score ?? null;
}

/**
 * Status derived from a score (D-07). The expert's one gesture is the score;
 * the qualitative status follows. "roadmap" is the only explicit override.
 */
export function deriveStatus(score: number | null): ResponseStatus {
  if (score === null || Number.isNaN(score)) return "pending";
  if (score >= 4) return "pass";
  if (score >= 2) return "partial";
  return "fail";
}

export const STATUS_META: Record<
  ResponseStatus,
  { label: string; short: string; className: string; glyph: string }
> = {
  pass: { label: "Conforme", short: "C", className: "stamp-pass", glyph: "✓" },
  partial: { label: "Partiel", short: "P", className: "stamp-partial", glyph: "◐" },
  fail: { label: "Non conforme", short: "NC", className: "stamp-fail", glyph: "✕" },
  roadmap: { label: "Roadmap", short: "R", className: "stamp-roadmap", glyph: "→" },
  pending: { label: "À évaluer", short: "—", className: "stamp-pending", glyph: "·" },
};

export const STATUS_ORDER: ResponseStatus[] = ["pass", "partial", "fail", "roadmap", "pending"];

/** Tailwind background class for a 0–5 score on the sequential scale. */
const SCALE_CLASSES = [
  "bg-scale-0 text-foreground",
  "bg-scale-1 text-foreground",
  "bg-scale-2 text-foreground",
  "bg-scale-3 text-background",
  "bg-scale-4 text-background",
  "bg-scale-5 text-background",
];

export function scaleClass(score: number | null): string {
  if (score === null) return "bg-scale-0 text-muted-foreground";
  const step = Math.max(0, Math.min(5, Math.round(score)));
  return SCALE_CLASSES[step];
}

export interface WeightedNode {
  id: string;
  type: "category" | "requirement";
  code: string;
  title: string;
  level: number;
  children?: WeightedNode[];
}

export interface AggregatedScore {
  /** Weighted mean on 0–5, null when nothing is scored. */
  score: number | null;
  /** Sum of the weights that carried a score. */
  weight: number;
  scored: number;
  total: number;
}

/**
 * Weighted mean of a category over its leaf requirements for one supplier.
 * Requirements with weight 0 are excluded; unscored requirements do not count.
 */
export function aggregateNode(
  node: WeightedNode,
  scoreOf: (requirementId: string) => number | null,
  weightOf: (id: string) => number
): AggregatedScore {
  if (node.type === "requirement") {
    const w = weightOf(node.id);
    const s = scoreOf(node.id);
    if (w <= 0) return { score: null, weight: 0, scored: 0, total: 0 };
    return s === null
      ? { score: null, weight: 0, scored: 0, total: 1 }
      : { score: s, weight: w, scored: 1, total: 1 };
  }
  let sum = 0;
  let weight = 0;
  let scored = 0;
  let total = 0;
  for (const child of node.children ?? []) {
    const a = aggregateNode(child, scoreOf, weightOf);
    const cw = child.type === "category" ? weightOf(child.id) : 1;
    if (child.type === "category") {
      if (a.score !== null && cw > 0) {
        sum += a.score * cw;
        weight += cw;
      }
    } else if (a.score !== null) {
      sum += a.score * a.weight;
      weight += a.weight;
    }
    scored += a.scored;
    total += a.total;
  }
  return { score: weight > 0 ? sum / weight : null, weight, scored, total };
}
