/**
 * MCP Tool: get_requirements
 * Get requirements for a specific RFP with pagination
 */

import { z } from "zod";
import { MOCK_REQUIREMENTS } from "../utils/mock-data";
import {
  paginateArray,
  PaginatedResponse,
  validatePaginationParams,
} from "../utils/pagination";

export const GetRequirementsInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type GetRequirementsInput = z.infer<typeof GetRequirementsInputSchema>;

export interface RequirementItem {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  mandatory: boolean;
  createdAt: string;
}

export type GetRequirementsOutput = PaginatedResponse<RequirementItem>;

/**
 * Get requirements tool handler
 */
export function handleGetRequirements(
  input: GetRequirementsInput
): GetRequirementsOutput {
  // Validate pagination parameters
  const pagination = validatePaginationParams(input.limit, input.offset);

  // Filter requirements for the specific RFP
  const requirements: RequirementItem[] = MOCK_REQUIREMENTS.filter(
    (req) => req.rfpId === input.rfp_id
  ).map((req) => ({
    id: req.id,
    title: req.title,
    description: req.description,
    category: req.category,
    priority: req.priority,
    mandatory: req.mandatory,
    createdAt: req.createdAt,
  }));

  // Apply pagination
  return paginateArray(requirements, pagination.limit, pagination.offset);
}
