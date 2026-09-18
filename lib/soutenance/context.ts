/**
 * What the Soutenances chapter reads from a consultation on a version: the
 * referential with its top-level domains, every response with its
 * evaluation, the suppliers still in the version and those removed from it.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { loadCategories, type CategoryRow, type Db } from "@/lib/agents/context";

export type { Db };

export interface EvalRequirement {
  id: string;
  code: string;
  title: string;
  description: string | null;
  weight: number;
  is_mandatory: boolean;
  category_id: string | null;
  /** Top-level domain that holds the requirement. */
  domain_id: string | null;
  domain_code: string;
  domain_title: string;
  /** Codes from the domain down to the requirement's category. */
  path: string[];
  display_order: number;
}

export interface EvalResponse {
  id: string;
  requirement_id: string;
  supplier_id: string;
  response_text: string | null;
  manual_score: number | null;
  ai_score: number | null;
  status: "pending" | "pass" | "partial" | "fail" | "roadmap";
  is_checked: boolean;
  manual_comment: string | null;
  question: string | null;
  ai_comment: string | null;
  ai_question: string | null;
}

export interface SupplierInfo {
  id: string;
  name: string;
  supplier_id_external: string | null;
  removed: { reason: string | null; removed_at: string | null } | null;
}

export interface RfpEvalContext {
  rfp: { id: string; title: string; organization_id: string };
  version: { id: string; version_number: number; version_name: string } | null;
  categories: CategoryRow[];
  domains: CategoryRow[];
  requirements: EvalRequirement[];
  suppliers: SupplierInfo[];
  responses: EvalResponse[];
}

function domainOf(categories: CategoryRow[], categoryId: string | null): { domain: CategoryRow | null; path: string[] } {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const path: string[] = [];
  let current = categoryId ? byId.get(categoryId) ?? null : null;
  let domain: CategoryRow | null = null;
  let guard = 0;
  while (current && guard++ < 20) {
    path.unshift(current.code);
    domain = current;
    current = current.parent_id ? byId.get(current.parent_id) ?? null : null;
  }
  return { domain, path };
}

export async function loadRfpEvalContext(db: Db | SupabaseClient, rfpId: string, versionId: string): Promise<RfpEvalContext> {
  const [{ data: rfp, error: rfpError }, categories, { data: reqs, error: reqError }, { data: version }, { data: suppliers, error: supError }, { data: statuses }, { data: responses, error: respError }] =
    await Promise.all([
      db.from("rfps").select("id, title, organization_id").eq("id", rfpId).maybeSingle(),
      loadCategories(db as Db, rfpId),
      db
        .from("requirements")
        .select("id, requirement_id_external, title, description, weight, is_mandatory, category_id, display_order")
        .eq("rfp_id", rfpId)
        .order("display_order", { ascending: true }),
      db.from("evaluation_versions").select("id, version_number, version_name").eq("id", versionId).maybeSingle(),
      db.from("suppliers").select("id, name, supplier_id_external").eq("rfp_id", rfpId).order("name"),
      db.from("version_supplier_status").select("supplier_id, shortlist_status, removal_reason, removed_at").eq("version_id", versionId),
      db
        .from("responses")
        .select("id, requirement_id, supplier_id, response_text, manual_score, ai_score, status, is_checked, manual_comment, question, ai_comment, ai_question")
        .eq("rfp_id", rfpId)
        .eq("version_id", versionId),
    ]);
  if (rfpError) throw new Error(`Consultation illisible : ${rfpError.message}`);
  if (!rfp) throw new Error("Consultation introuvable.");
  if (reqError) throw new Error(`Exigences illisibles : ${reqError.message}`);
  if (supError) throw new Error(`Fournisseurs illisibles : ${supError.message}`);
  if (respError) throw new Error(`Réponses illisibles : ${respError.message}`);

  const domains = categories.filter((c) => c.parent_id === null);
  const requirements: EvalRequirement[] = ((reqs ?? []) as Array<{
    id: string;
    requirement_id_external: string;
    title: string;
    description: string | null;
    weight: number | null;
    is_mandatory: boolean | null;
    category_id: string | null;
    display_order: number | null;
  }>).map((r) => {
    const { domain, path } = domainOf(categories, r.category_id);
    return {
      id: r.id,
      code: r.requirement_id_external,
      title: r.title,
      description: r.description,
      weight: r.weight ?? 1,
      is_mandatory: !!r.is_mandatory,
      category_id: r.category_id,
      domain_id: domain?.id ?? null,
      domain_code: domain?.code ?? "",
      domain_title: domain?.title ?? "Sans domaine",
      path,
      display_order: r.display_order ?? 0,
    };
  });
  const removed = new Map<string, { reason: string | null; removed_at: string | null }>();
  for (const s of (statuses ?? []) as Array<{ supplier_id: string; shortlist_status: string; removal_reason: string | null; removed_at: string | null }>) {
    if (s.shortlist_status === "removed") removed.set(s.supplier_id, { reason: s.removal_reason, removed_at: s.removed_at });
  }
  return {
    rfp: rfp as RfpEvalContext["rfp"],
    version: (version as RfpEvalContext["version"]) ?? null,
    categories,
    domains,
    requirements,
    suppliers: ((suppliers ?? []) as Array<{ id: string; name: string; supplier_id_external: string | null }>).map((s) => ({
      ...s,
      removed: removed.get(s.id) ?? null,
    })),
    responses: (responses ?? []) as EvalResponse[],
  };
}

export function finalScoreOf(r: EvalResponse | undefined | null): number | null {
  if (!r) return null;
  return r.manual_score ?? r.ai_score ?? null;
}

/** Mean of the scores of the other retained suppliers on one requirement. */
export function othersMean(ctx: RfpEvalContext, requirementId: string, supplierId: string): number | null {
  const retained = new Set(ctx.suppliers.filter((s) => !s.removed).map((s) => s.id));
  const scores = ctx.responses
    .filter((r) => r.requirement_id === requirementId && r.supplier_id !== supplierId && retained.has(r.supplier_id))
    .map(finalScoreOf)
    .filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function responseOf(ctx: RfpEvalContext, requirementId: string, supplierId: string): EvalResponse | undefined {
  return ctx.responses.find((r) => r.requirement_id === requirementId && r.supplier_id === supplierId);
}

/** Truncates a text for a prompt, on a word boundary, with a marker. */
export function excerpt(text: string | null | undefined, max: number): string {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 40))} […]`;
}

export const STATUS_LABEL: Record<EvalResponse["status"], string> = {
  pending: "à évaluer",
  pass: "conforme",
  partial: "partiel",
  fail: "non conforme",
  roadmap: "roadmap",
};

/** Codes as models return them ("R-15") against codes as written ("R - 15"): same key. */
export function normaliseCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export function fmtScore(s: number | null): string {
  return s === null ? "—" : s.toFixed(1).replace(".", ",");
}
