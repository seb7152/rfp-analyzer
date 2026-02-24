/**
 * MCP Tool: get_requirements_tree
 * Get hierarchical requirements tree for an RFP (4-level structure)
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";
import {
  getTreeStatistics,
  RequirementNode,
  TreeStatistics,
} from "../utils/requirements-tree";

export const GetRequirementsTreeInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  flatten: z
    .boolean()
    .optional()
    .default(false)
    .describe("If true, return flattened list instead of tree"),
});

export type GetRequirementsTreeInput = z.infer<
  typeof GetRequirementsTreeInputSchema
>;

export interface GetRequirementsTreeOutput {
  rfpId: string;
  rfpTitle: string;
  tree: RequirementNode;
  statistics: TreeStatistics;
}

/**
 * Build a RequirementNode tree from real DB categories and requirements.
 */
function buildTreeFromData(
  rfpId: string,
  rfpTitle: string,
  categories: Array<{
    id: string;
    title: string;
    parent_id: string | null;
    level: number;
  }>,
  requirements: Array<{
    id: string;
    title: string;
    description: string | null;
    category_id: string | null;
    is_mandatory: boolean;
  }>
): RequirementNode {
  // Map each category to its child category list
  const catChildrenMap: Record<string, RequirementNode[]> = {};
  for (const cat of categories) {
    catChildrenMap[cat.id] = [];
  }

  // Group requirements by category_id
  const reqsByCategory: Record<string, RequirementNode[]> = {};
  for (const req of requirements) {
    const catId = req.category_id ?? "__none__";
    if (!reqsByCategory[catId]) reqsByCategory[catId] = [];
    reqsByCategory[catId].push({
      id: req.id,
      title: req.title,
      description: req.description ?? undefined,
      type: "requirement",
      mandatory: req.is_mandatory,
    });
  }

  // Build category nodes bottom-up (deepest levels first)
  const catNodeMap: Record<string, RequirementNode> = {};
  const sortedCats = [...categories].sort((a, b) => b.level - a.level);

  for (const cat of sortedCats) {
    const childCats = catChildrenMap[cat.id] ?? [];
    const childReqs = reqsByCategory[cat.id] ?? [];
    const children = [...childCats, ...childReqs];
    catNodeMap[cat.id] = {
      id: cat.id,
      title: cat.title,
      type: cat.level === 1 ? "domain" : "category",
      children,
      count: children.length,
    };
  }

  // Wire child categories into parent category children arrays
  for (const cat of sortedCats) {
    if (cat.parent_id && catChildrenMap[cat.parent_id]) {
      catChildrenMap[cat.parent_id].push(catNodeMap[cat.id]);
    }
  }

  // Collect root categories (no parent) — rebuild after wiring
  const rootCats = categories
    .filter((c) => c.parent_id === null)
    .sort((a, b) => a.level - b.level)
    .map((c) => catNodeMap[c.id])
    .filter(Boolean);

  // Requirements with no category
  const uncategorized = reqsByCategory["__none__"] ?? [];
  const allChildren = [...rootCats, ...uncategorized];

  return {
    id: `rfp-${rfpId}`,
    title: rfpTitle,
    type: "domain",
    children: allChildren,
    count: allChildren.reduce((s, n) => s + (n.count ?? 1), 0),
  };
}

/**
 * Get requirements tree tool handler — real Supabase data
 */
export async function handleGetRequirementsTree(
  input: GetRequirementsTreeInput,
  authContext: MCPAuthContext
): Promise<GetRequirementsTreeOutput> {
  const supabase = createServiceClient();
  const { rfp_id } = input;

  // Verify access and get RFP title
  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, title, organization_id")
    .eq("id", rfp_id)
    .single();

  if (rfpError || !rfp) {
    throw new Error(`RFP not found: ${rfp_id}`);
  }

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

    if (!assignment) {
      throw new Error(`Access denied to RFP: ${rfp_id}`);
    }
  }

  // Fetch categories and requirements in parallel
  const [{ data: categories, error: catError }, { data: requirements, error: reqError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, title, parent_id, level")
        .eq("rfp_id", rfp_id)
        .order("display_order", { ascending: true, nullsFirst: false }),
      supabase
        .from("requirements")
        .select("id, title, description, category_id, is_mandatory")
        .eq("rfp_id", rfp_id)
        .order("display_order", { ascending: true, nullsFirst: false }),
    ]);

  if (catError) throw new Error(`Failed to fetch categories: ${catError.message}`);
  if (reqError) throw new Error(`Failed to fetch requirements: ${reqError.message}`);

  const tree = buildTreeFromData(rfp_id, rfp.title, categories ?? [], requirements ?? []);
  const statistics = getTreeStatistics(tree);

  return { rfpId: rfp_id, rfpTitle: rfp.title, tree, statistics };
}
