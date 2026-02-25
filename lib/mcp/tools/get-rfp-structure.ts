/**
 * MCP Tool: get_rfp_structure
 * Lightweight structure-only view of an RFP: metadata, category tree (no requirements),
 * suppliers, and stats.
 *
 * Each category node exposes recursive aggregates so an LLM can quickly identify
 * the most important parts of the RFP:
 *   - aggregateWeight: recursive sum of all requirement weights in this subtree
 *   - requirementCount: recursive total of requirements in this subtree
 *   - mandatoryCount: recursive count of mandatory requirements in this subtree
 *   - weight: own weight from the categories table
 *
 * Use get_requirements_tree for the full tree with requirements embedded.
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";

export const GetRFPStructureInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  include_suppliers: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include suppliers list (default: true)"),
  include_stats: z
    .boolean()
    .optional()
    .default(true)
    .describe("Include response statistics (default: true)"),
});

export type GetRFPStructureInput = z.infer<typeof GetRFPStructureInputSchema>;

export interface CategoryNode {
  id: string;
  code: string;
  title: string;
  shortName: string;
  level: number;
  displayOrder: number | null;
  /** Own weight from the categories table */
  weight: number;
  /** Recursive sum of all requirement weights in this subtree */
  aggregateWeight: number;
  /** Recursive total of requirements in this subtree */
  requirementCount: number;
  /** Recursive count of mandatory requirements in this subtree */
  mandatoryCount: number;
  children: CategoryNode[];
}

export interface SupplierSummary {
  id: string;
  externalId: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
}

export interface RFPStats {
  totalCategories: number;
  totalRequirements: number;
  mandatoryRequirements: number;
  totalSuppliers: number;
  totalResponses: number;
  responseCompletionRate: number;
}

export interface GetRFPStructureOutput {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: string;
  categories: CategoryNode[];
  suppliers: SupplierSummary[];
  stats: RFPStats | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal types
// ─────────────────────────────────────────────────────────────────────────────

type RawCategory = {
  id: string;
  code: string;
  title: string;
  short_name: string;
  level: number;
  parent_id: string | null;
  display_order: number | null;
  weight: number;
};

type RawRequirement = {
  category_id: string | null;
  weight: number | null;
  is_mandatory: boolean | null;
};

function buildCategoryTree(
  categories: RawCategory[],
  requirementsByCategory: Record<string, { weight: number; isMandatory: boolean }[]>
): CategoryNode[] {
  const nodeMap: Record<string, CategoryNode> = {};

  // Build leaf-to-root so we can propagate aggregates upward
  const sorted = [...categories].sort((a, b) => b.level - a.level);

  for (const cat of sorted) {
    const directReqs = requirementsByCategory[cat.id] ?? [];
    nodeMap[cat.id] = {
      id: cat.id,
      code: cat.code,
      title: cat.title,
      shortName: cat.short_name,
      level: cat.level,
      displayOrder: cat.display_order,
      weight: cat.weight ?? 1,
      aggregateWeight: directReqs.reduce((s, r) => s + r.weight, 0),
      requirementCount: directReqs.length,
      mandatoryCount: directReqs.filter((r) => r.isMandatory).length,
      children: [],
    };
  }

  // Wire children into parents and propagate aggregates upward
  for (const cat of sorted) {
    if (cat.parent_id && nodeMap[cat.parent_id] && nodeMap[cat.id]) {
      const child = nodeMap[cat.id];
      const parent = nodeMap[cat.parent_id];
      parent.children.unshift(child);
      parent.aggregateWeight += child.aggregateWeight;
      parent.requirementCount += child.requirementCount;
      parent.mandatoryCount += child.mandatoryCount;
    }
  }

  // Sort children within each node by display_order
  for (const node of Object.values(nodeMap)) {
    node.children.sort(
      (a, b) => (a.displayOrder ?? 9999) - (b.displayOrder ?? 9999)
    );
  }

  return categories
    .filter((c) => c.parent_id === null)
    .sort((a, b) => (a.display_order ?? 9999) - (b.display_order ?? 9999))
    .map((c) => nodeMap[c.id])
    .filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleGetRFPStructure(
  input: GetRFPStructureInput,
  authContext: MCPAuthContext
): Promise<GetRFPStructureOutput> {
  const supabase = createServiceClient();
  const { rfp_id, include_suppliers, include_stats } = input;

  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, title, description, status, organization_id, created_at")
    .eq("id", rfp_id)
    .single();

  if (rfpError || !rfp) throw new Error(`RFP not found: ${rfp_id}`);

  if (
    authContext.organizationId &&
    rfp.organization_id !== authContext.organizationId
  ) {
    const { data: assignment } = await supabase
      .from("rfp_user_assignments")
      .select("id")
      .eq("rfp_id", rfp_id)
      .eq("user_id", authContext.userId)
      .single();
    if (!assignment) throw new Error(`Access denied to RFP: ${rfp_id}`);
  }

  const [
    { data: categories, error: catError },
    { data: requirements, error: reqError },
    suppliersResult,
  ] = await Promise.all([
    supabase
      .from("categories")
      .select("id, code, title, short_name, level, parent_id, display_order, weight")
      .eq("rfp_id", rfp_id)
      .order("display_order", { ascending: true, nullsFirst: false }),
    supabase
      .from("requirements")
      .select("category_id, weight, is_mandatory")
      .eq("rfp_id", rfp_id),
    include_suppliers
      ? supabase
          .from("suppliers")
          .select("id, supplier_id_external, name, contact_name, contact_email")
          .eq("rfp_id", rfp_id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (catError) throw new Error(`Failed to fetch categories: ${catError.message}`);
  if (reqError) throw new Error(`Failed to fetch requirements: ${reqError.message}`);
  if (suppliersResult.error)
    throw new Error(`Failed to fetch suppliers: ${suppliersResult.error.message}`);

  // Group lightweight requirement data by category_id
  const requirementsByCategory: Record<string, { weight: number; isMandatory: boolean }[]> = {};
  for (const req of (requirements ?? []) as RawRequirement[]) {
    if (req.category_id) {
      if (!requirementsByCategory[req.category_id])
        requirementsByCategory[req.category_id] = [];
      requirementsByCategory[req.category_id].push({
        weight: req.weight ?? 1,
        isMandatory: req.is_mandatory ?? false,
      });
    }
  }

  const categoryTree = buildCategoryTree(
    (categories ?? []) as RawCategory[],
    requirementsByCategory
  );

  const suppliers: SupplierSummary[] = (suppliersResult.data ?? []).map((s: any) => ({
    id: s.id,
    externalId: s.supplier_id_external ?? "",
    name: s.name,
    contactName: s.contact_name,
    contactEmail: s.contact_email,
  }));

  let stats: RFPStats | null = null;
  if (include_stats) {
    const allReqs = (requirements ?? []) as RawRequirement[];
    const totalRequirements = allReqs.length;
    const mandatoryRequirements = allReqs.filter((r) => r.is_mandatory).length;
    const totalSuppliers = suppliers.length;

    const { count: totalResponses } = await supabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("rfp_id", rfp_id);

    const maxResponses = totalRequirements * totalSuppliers;
    const responseCompletionRate =
      maxResponses > 0
        ? Math.round(((totalResponses ?? 0) / maxResponses) * 100)
        : 0;

    stats = {
      totalCategories: (categories ?? []).length,
      totalRequirements,
      mandatoryRequirements,
      totalSuppliers,
      totalResponses: totalResponses ?? 0,
      responseCompletionRate,
    };
  }

  return {
    id: rfp.id,
    title: rfp.title,
    description: rfp.description,
    status: rfp.status,
    createdAt: rfp.created_at,
    categories: categoryTree,
    suppliers,
    stats,
  };
}
