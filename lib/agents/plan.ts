/**
 * Which analyses a launch produces, what they would cost, and their creation.
 * Deterministic: agents assigned × active suppliers of the active version,
 * each analysis cut into batches of BATCH_SIZE leaf requirements.
 */

import {
  chunk,
  describeDomain,
  loadActiveSuppliers,
  loadCategories,
  loadLeaves,
  loadResponses,
  subtreeIds,
  type CategoryRow,
  type Db,
  type ResponseRow,
  type SupplierRow,
} from "./context";
import { contextLength, estimateTokens, type DomainDescription } from "./prompt";
import type { CatalogueModel } from "./types";

export const BATCH_SIZE = 12;
/** Rough output per requirement (justification, quotes, questions, risks). */
const COMPLETION_TOKENS_PER_REQUIREMENT = 350;

export interface PlannedRun {
  agent: { id: string; name: string; model_id: string; current_version: number };
  agentVersionId: string;
  supplier: SupplierRow;
  category: CategoryRow;
  domain: DomainDescription;
  responses: Map<string, ResponseRow>;
  /** Requirement ids that have a response row on this version, batched. */
  batches: string[][];
  contextChars: number;
}

export interface AssignmentRow {
  id: string;
  agent_id: string;
  category_id: string;
  agents: { id: string; name: string; model_id: string; current_version: number; archived_at: string | null } | null;
}

export async function loadAssignments(db: Db, rfpId: string): Promise<AssignmentRow[]> {
  const { data, error } = await db
    .from("rfp_agent_assignments")
    .select("id, agent_id, category_id, agents(id, name, model_id, current_version, archived_at)")
    .eq("rfp_id", rfpId);
  if (error) throw new Error(`Affectations illisibles : ${error.message}`);
  return (data ?? []) as unknown as AssignmentRow[];
}

export async function planRuns(db: Db, rfpId: string, versionId: string): Promise<PlannedRun[]> {
  const [assignments, categories, suppliers] = await Promise.all([
    loadAssignments(db, rfpId),
    loadCategories(db, rfpId),
    loadActiveSuppliers(db, rfpId, versionId),
  ]);
  const active = assignments.filter((a) => a.agents && !a.agents.archived_at);
  if (active.length === 0 || suppliers.length === 0) return [];

  // Current version row of each agent.
  const agentIds = Array.from(new Set(active.map((a) => a.agent_id)));
  const { data: versions, error: vError } = await db
    .from("agent_versions")
    .select("id, agent_id, version_number, system_prompt")
    .in("agent_id", agentIds);
  if (vError) throw new Error(`Versions d'agent illisibles : ${vError.message}`);
  const versionOf = new Map<string, { id: string; system_prompt: string }>();
  for (const a of active) {
    const v = (versions ?? []).find(
      (row: { agent_id: string; version_number: number }) =>
        row.agent_id === a.agent_id && row.version_number === a.agents!.current_version
    );
    if (v) versionOf.set(a.agent_id, { id: v.id, system_prompt: v.system_prompt });
  }

  const runs: PlannedRun[] = [];
  for (const a of active) {
    const version = versionOf.get(a.agent_id);
    if (!version) continue;
    const category = categories.find((c) => c.id === a.category_id);
    if (!category) continue;
    const ids = subtreeIds(categories, category.id);
    const leaves = await loadLeaves(db, rfpId, ids);
    if (leaves.length === 0) continue;
    const domain = describeDomain(categories, category.id, leaves);
    for (const supplier of suppliers) {
      const responses = await loadResponses(
        db,
        versionId,
        supplier.id,
        domain.leaves.map((l) => l.id)
      );
      const withResponse = domain.leaves.map((l) => l.id).filter((id) => responses.has(id));
      if (withResponse.length === 0) continue;
      runs.push({
        agent: { id: a.agents!.id, name: a.agents!.name, model_id: a.agents!.model_id, current_version: a.agents!.current_version },
        agentVersionId: version.id,
        supplier,
        category,
        domain,
        responses,
        batches: chunk(withResponse, BATCH_SIZE),
        contextChars: contextLength({
          systemPrompt: version.system_prompt,
          domain,
          supplierName: supplier.name,
          responseText: (id) => responses.get(id)?.response_text ?? null,
        }),
      });
    }
  }
  return runs;
}

export interface RunEstimate {
  agent_id: string;
  agent_name: string;
  supplier_id: string;
  supplier_name: string;
  category_id: string;
  category_code: string;
  category_title: string;
  requirements: number;
  batches: number;
  prompt_tokens: number;
  completion_tokens: number;
  /** USD, null when the model is not in the catalogue. */
  cost: number | null;
  model_id: string;
  model_known: boolean;
}

export interface LaunchEstimate {
  runs: RunEstimate[];
  totals: { runs: number; requirements: number; prompt_tokens: number; completion_tokens: number; cost: number | null };
  approximate: true;
}

export function estimateRuns(planned: PlannedRun[], catalogue: CatalogueModel[] | null): LaunchEstimate {
  const runs: RunEstimate[] = planned.map((r) => {
    const model = catalogue?.find((m) => m.id === r.agent.model_id) ?? null;
    const requirements = r.batches.reduce((n, b) => n + b.length, 0);
    const contextTokens = estimateTokens(r.contextChars);
    const prompt_tokens = contextTokens * r.batches.length;
    const completion_tokens = requirements * COMPLETION_TOKENS_PER_REQUIREMENT;
    const cost = model ? prompt_tokens * model.prompt_price + completion_tokens * model.completion_price : null;
    return {
      agent_id: r.agent.id,
      agent_name: r.agent.name,
      supplier_id: r.supplier.id,
      supplier_name: r.supplier.name,
      category_id: r.category.id,
      category_code: r.category.code,
      category_title: r.category.title,
      requirements,
      batches: r.batches.length,
      prompt_tokens,
      completion_tokens,
      cost,
      model_id: r.agent.model_id,
      model_known: !!model,
    };
  });
  const allKnown = runs.every((r) => r.cost !== null);
  return {
    runs,
    totals: {
      runs: runs.length,
      requirements: runs.reduce((n, r) => n + r.requirements, 0),
      prompt_tokens: runs.reduce((n, r) => n + r.prompt_tokens, 0),
      completion_tokens: runs.reduce((n, r) => n + r.completion_tokens, 0),
      cost: allKnown && runs.length > 0 ? runs.reduce((n, r) => n + (r.cost ?? 0), 0) : null,
    },
    approximate: true,
  };
}

/**
 * Creates the analyses and their pending batches. Proposals still `proposed`
 * from an earlier analysis of the same perimeter, or from another evaluation
 * version, become `obsolete`; accepted and rejected ones are kept as they are.
 */
export async function createRuns(
  db: Db,
  rfpId: string,
  versionId: string,
  userId: string,
  planned: PlannedRun[]
): Promise<string[]> {
  const { data: previous, error: prevError } = await db
    .from("agent_runs")
    .select("id, version_id, supplier_id, category_id, agent_versions(agent_id)")
    .eq("rfp_id", rfpId);
  if (prevError) throw new Error(`Analyses précédentes illisibles : ${prevError.message}`);
  const key = (agentId: string, supplierId: string, categoryId: string) => `${agentId}|${supplierId}|${categoryId}`;
  const newKeys = new Set(planned.map((r) => key(r.agent.id, r.supplier.id, r.category.id)));
  const obsoleteRunIds = ((previous ?? []) as unknown as Array<{
    id: string;
    version_id: string;
    supplier_id: string;
    category_id: string;
    agent_versions: { agent_id: string } | null;
  }>)
    .filter((r) => r.version_id !== versionId || newKeys.has(key(r.agent_versions?.agent_id ?? "", r.supplier_id, r.category_id)))
    .map((r) => r.id);
  if (obsoleteRunIds.length > 0) {
    const { error } = await db
      .from("agent_findings")
      .update({ status: "obsolete" })
      .in("run_id", obsoleteRunIds)
      .eq("status", "proposed");
    if (error) throw new Error(`Propositions antérieures non marquées obsolètes : ${error.message}`);
  }

  const { data: runs, error: runError } = await db
    .from("agent_runs")
    .insert(
      planned.map((r) => ({
        rfp_id: rfpId,
        version_id: versionId,
        agent_version_id: r.agentVersionId,
        supplier_id: r.supplier.id,
        category_id: r.category.id,
        status: "pending",
        launched_by: userId,
      }))
    )
    .select("id, supplier_id, category_id, agent_version_id");
  if (runError || !runs) throw new Error(`Lancement impossible : ${runError?.message ?? "aucune analyse créée"}`);

  const batches: Array<{ run_id: string; batch_index: number; requirement_ids: string[]; status: "pending" }> = [];
  for (const r of planned) {
    const created = (runs as Array<{ id: string; supplier_id: string; category_id: string; agent_version_id: string }>).find(
      (x) => x.supplier_id === r.supplier.id && x.category_id === r.category.id && x.agent_version_id === r.agentVersionId
    );
    if (!created) continue;
    r.batches.forEach((ids, i) => batches.push({ run_id: created.id, batch_index: i, requirement_ids: ids, status: "pending" }));
  }
  const { error: batchError } = await db.from("agent_run_batches").insert(batches);
  if (batchError) throw new Error(`Lots non créés : ${batchError.message}`);
  return (runs as Array<{ id: string }>).map((r) => r.id);
}
