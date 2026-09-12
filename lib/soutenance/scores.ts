/**
 * Domain scores per supplier on a version, computed here with the rule of
 * lib/scoring (the same the decision view applies in the browser), so that
 * the chapter and its exports read one figure.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { aggregateNode, finalScore, type WeightedNode } from "@/lib/scoring";
import type { RfpEvalContext } from "./context";

export interface DomainScoreRow {
  id: string;
  code: string;
  title: string;
  weight: number;
  requirementCount: number;
  /** Per supplier id. */
  cells: Record<string, { score: number | null; scored: number; total: number }>;
  /** Mean of the retained suppliers' scores, null when none is scored. */
  mean: number | null;
}

export interface SupplierOverall {
  supplierId: string;
  score: number | null;
  scored: number;
  total: number;
  rank: number | null;
}

export interface DomainScores {
  rows: DomainScoreRow[];
  overall: SupplierOverall[];
  overallMean: number | null;
}

interface CategoryWeightRow {
  id: string;
  weight: number | null;
}

export async function loadCategoryWeights(db: SupabaseClient, rfpId: string): Promise<Map<string, number>> {
  const { data, error } = await db.from("categories").select("id, weight").eq("rfp_id", rfpId);
  if (error) throw new Error(`Pondérations illisibles : ${error.message}`);
  return new Map(((data ?? []) as CategoryWeightRow[]).map((c) => [c.id, c.weight ?? 1]));
}

function buildTree(ctx: RfpEvalContext): WeightedNode[] {
  const byParent = new Map<string | null, typeof ctx.categories>();
  for (const c of ctx.categories) {
    const list = byParent.get(c.parent_id) ?? [];
    list.push(c);
    byParent.set(c.parent_id, list);
  }
  const reqsByCategory = new Map<string | null, typeof ctx.requirements>();
  for (const r of ctx.requirements) {
    const list = reqsByCategory.get(r.category_id) ?? [];
    list.push(r);
    reqsByCategory.set(r.category_id, list);
  }
  const node = (c: (typeof ctx.categories)[number]): WeightedNode => ({
    id: c.id,
    type: "category",
    code: c.code,
    title: c.title,
    level: c.level,
    children: [
      ...(byParent.get(c.id) ?? []).map(node),
      ...(reqsByCategory.get(c.id) ?? []).map((r) => ({ id: r.id, type: "requirement" as const, code: r.code, title: r.title, level: c.level + 1 })),
    ],
  });
  return (byParent.get(null) ?? []).map(node);
}

function mean(values: Array<number | null>): number | null {
  const v = values.filter((x): x is number => x !== null);
  return v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length;
}

export function computeDomainScores(ctx: RfpEvalContext, categoryWeights: Map<string, number>): DomainScores {
  const tree = buildTree(ctx);
  const requirementWeight = new Map(ctx.requirements.map((r) => [r.id, r.weight]));
  const weightOf = (id: string) => requirementWeight.get(id) ?? categoryWeights.get(id) ?? 1;
  const bySupplier = new Map<string, Map<string, { manual_score: number | null; ai_score: number | null }>>();
  for (const r of ctx.responses) {
    let m = bySupplier.get(r.supplier_id);
    if (!m) {
      m = new Map();
      bySupplier.set(r.supplier_id, m);
    }
    m.set(r.requirement_id, r);
  }
  const retained = ctx.suppliers.filter((s) => !s.removed).map((s) => s.id);
  const scoreOfFor = (supplierId: string) => {
    const m = bySupplier.get(supplierId) ?? new Map();
    return (id: string) => {
      const r = m.get(id);
      return r ? finalScore(r) : null;
    };
  };
  const rows: DomainScoreRow[] = tree.map((d) => {
    const cells: DomainScoreRow["cells"] = {};
    for (const s of ctx.suppliers) {
      const a = aggregateNode(d, scoreOfFor(s.id), weightOf);
      cells[s.id] = { score: a.score, scored: a.scored, total: a.total };
    }
    return {
      id: d.id,
      code: d.code,
      title: d.title,
      weight: categoryWeights.get(d.id) ?? 1,
      requirementCount: ctx.requirements.filter((r) => r.domain_id === d.id).length,
      cells,
      mean: mean(retained.map((id) => cells[id]?.score ?? null)),
    };
  });
  const root: WeightedNode = { id: "root", type: "category", code: "", title: "", level: 0, children: tree };
  const overall: SupplierOverall[] = ctx.suppliers.map((s) => {
    const a = aggregateNode(root, scoreOfFor(s.id), weightOf);
    return { supplierId: s.id, score: a.score, scored: a.scored, total: a.total, rank: null };
  });
  const ranked = overall.filter((o) => retained.includes(o.supplierId) && o.score !== null).sort((a, b) => b.score! - a.score!);
  ranked.forEach((o, i) => (o.rank = i + 1));
  return { rows, overall, overallMean: mean(retained.map((id) => overall.find((o) => o.supplierId === id)?.score ?? null)) };
}
