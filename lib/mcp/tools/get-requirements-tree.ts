/**
 * MCP Tool: get_requirements_tree
 * Get hierarchical requirements tree for an RFP (4-level structure)
 */

import { z } from "zod";
import {
  buildRequirementsTree,
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
  tree: RequirementNode;
  statistics: TreeStatistics;
}

/**
 * Get requirements tree tool handler
 */
export function handleGetRequirementsTree(
  input: GetRequirementsTreeInput
): GetRequirementsTreeOutput {
  const tree = buildRequirementsTree(input.rfp_id);
  const statistics = getTreeStatistics(tree);

  return {
    rfpId: input.rfp_id,
    tree,
    statistics,
  };
}
