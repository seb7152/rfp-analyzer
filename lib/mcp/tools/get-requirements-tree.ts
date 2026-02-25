/**
 * MCP Tool: get_requirements_tree
 * Get hierarchical requirements tree for an RFP.
 *
 * Each category node contains:
 *   - children: sub-categories
 *   - requirements: direct requirements attached to this category (all fields)
 *   - requirementCount: recursive total (direct + all sub-categories)
 *   - mandatoryCount: recursive mandatory requirement count
 *   - aggregateWeight: recursive sum of requirement weights in the subtree
 *
 * Use get_rfp_structure for a lightweight structure-only view (no requirements embedded).
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";

export const GetRequirementsTreeInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  flatten: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "If true, return a flat list of requirements with their category path instead of a tree"
    ),
});

export type GetRequirementsTreeInput = z.infer<
  typeof GetRequirementsTreeInputSchema
>;

export interface RequirementDetail {
  id: string;
  externalId: string;
  title: string;
  description: string | null;
  weight: number;
  isMandatory: boolean;
  displayOrder: number | null;
}

export interface CategoryTreeNode {
  id: string;
  code: string;
  title: string;
  shortName: string;
  level: number;
  displayOrder: number | null;
  /** Own weight from the categories table */
  weight: number;
  /** Recursive sum of all requirements weights in this subtree */
  aggregateWeight: number;
  /** Recursive total requirement count (direct + all sub-categories) */
  requirementCount: number;
  /** Recursive mandatory requirement count */
  mandatoryCount: number;
  children: CategoryTreeNode[];
  /** Requirements directly attached to this category */
  requirements: RequirementDetail[];
}

export interface FlatRequirement extends RequirementDetail {
  categoryId: string | null;
  categoryPath: string;
}

export interface RequirementsTreeStatistics {
  totalCategories: number;
  totalRequirements: number;
  mandatoryRequirements: number;
  totalWeight: number;
}

export interface GetRequirementsTreeOutput {
  rfpId: string;
  rfpTitle: string;
  /** Hierarchical tree (when flatten=false) */
  tree?: CategoryTreeNode[];
  /** Flat list of requirements with category path (when flatten=true) */
  flatList?: FlatRequirement[];
  /** Requirements not attached to any category */
  uncategorized: RequirementDetail[];
  statistics: RequirementsTreeStatistics;
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
  id: string;
  requirement_id_external: string | null;
  title: string;
  description: string | null;
  category_id: string | null;
  weight: number | null;
  is_mandatory: boolean | null;
  display_order: number | null;
};

function toDetail(r: RawRequirement): RequirementDetail {
  return {
    id: r.id,
    externalId: r.requirement_id_external ?? "",
    title: r.title,
    description: r.description,
    weight: r.weight ?? 1,
    isMandatory: r.is_mandatory ?? false,
    displayOrder: r.display_order,
  };
}

function buildTree(
  categories: RawCategory[],
  requirementsByCategory: Record<string, RequirementDetail[]>
): CategoryTreeNode[] {
  const nodeMap: Record<string, CategoryTreeNode> = {};

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
      requirements: directReqs,
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

function flattenTree(
  nodes: CategoryTreeNode[],
  pathParts: string[] = []
): FlatRequirement[] {
  const result: FlatRequirement[] = [];
  for (const node of nodes) {
    const currentPath = [...pathParts, node.title];
    for (const req of node.requirements) {
      result.push({ ...req, categoryId: node.id, categoryPath: currentPath.join(" > ") });
    }
    result.push(...flattenTree(node.children, currentPath));
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function handleGetRequirementsTree(
  input: GetRequirementsTreeInput,
  authContext: MCPAuthContext
): Promise<GetRequirementsTreeOutput> {
  const supabase = createServiceClient();
  const { rfp_id, flatten } = input;

  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, title, organization_id")
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

  const [{ data: categories, error: catError }, { data: requirements, error: reqError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, code, title, short_name, level, parent_id, display_order, weight")
        .eq("rfp_id", rfp_id)
        .order("display_order", { ascending: true, nullsFirst: false }),
      supabase
        .from("requirements")
        .select(
          "id, requirement_id_external, title, description, category_id, weight, is_mandatory, display_order"
        )
        .eq("rfp_id", rfp_id)
        .order("display_order", { ascending: true, nullsFirst: false }),
    ]);

  if (catError) throw new Error(`Failed to fetch categories: ${catError.message}`);
  if (reqError) throw new Error(`Failed to fetch requirements: ${reqError.message}`);

  const allReqs = (requirements ?? []) as RawRequirement[];

  const requirementsByCategory: Record<string, RequirementDetail[]> = {};
  const uncategorized: RequirementDetail[] = [];

  for (const req of allReqs) {
    const detail = toDetail(req);
    if (req.category_id) {
      if (!requirementsByCategory[req.category_id])
        requirementsByCategory[req.category_id] = [];
      requirementsByCategory[req.category_id].push(detail);
    } else {
      uncategorized.push(detail);
    }
  }

  const tree = buildTree((categories ?? []) as RawCategory[], requirementsByCategory);

  const statistics: RequirementsTreeStatistics = {
    totalCategories: (categories ?? []).length,
    totalRequirements: allReqs.length,
    mandatoryRequirements: allReqs.filter((r: RawRequirement) => r.is_mandatory).length,
    totalWeight: allReqs.reduce((s: number, r: RawRequirement) => s + (r.weight ?? 1), 0),
  };

  if (flatten) {
    return {
      rfpId: rfp_id,
      rfpTitle: rfp.title,
      flatList: [
        ...flattenTree(tree),
        ...uncategorized.map((r) => ({
          ...r,
          categoryId: null,
          categoryPath: "Uncategorized",
        })),
      ],
      uncategorized,
      statistics,
    };
  }

  return { rfpId: rfp_id, rfpTitle: rfp.title, tree, uncategorized, statistics };
}
