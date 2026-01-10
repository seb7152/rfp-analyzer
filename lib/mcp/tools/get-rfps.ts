/**
 * MCP Tool: get_rfps
 * List all RFPs with pagination support
 */

import { z } from "zod";
import { MOCK_RFPS } from "../utils/mock-data";
import {
  paginateArray,
  PaginatedResponse,
  validatePaginationParams,
} from "../utils/pagination";

export const GetRFPsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type GetRFPsInput = z.infer<typeof GetRFPsInputSchema>;

export interface RFPItem {
  id: string;
  title: string;
  description: string;
  status: "draft" | "active" | "closed";
  requirementCount: number;
  createdAt: string;
}

export type GetRFPsOutput = PaginatedResponse<RFPItem>;

/**
 * Get RFPs tool handler
 */
export function handleGetRFPs(input: GetRFPsInput): GetRFPsOutput {
  // Validate pagination parameters
  const pagination = validatePaginationParams(input.limit, input.offset);

  // Transform mock data to output format
  const rfps: RFPItem[] = MOCK_RFPS.map((rfp) => ({
    id: rfp.id,
    title: rfp.title,
    description: rfp.description,
    status: rfp.status,
    requirementCount: rfp.requirementCount,
    createdAt: rfp.createdAt,
  }));

  // Apply pagination
  return paginateArray(rfps, pagination.limit, pagination.offset);
}
