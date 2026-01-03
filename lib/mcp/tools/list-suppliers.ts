/**
 * MCP Tool: list_suppliers
 * List suppliers for a specific RFP with pagination
 */

import { z } from "zod";
import { MOCK_SUPPLIERS } from "../utils/mock-data";
import {
  paginateArray,
  PaginatedResponse,
  validatePaginationParams,
} from "../utils/pagination";

export const ListSuppliersInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type ListSuppliersInput = z.infer<typeof ListSuppliersInputSchema>;

export interface SupplierItem {
  id: string;
  name: string;
  email: string;
  status: "invited" | "submitted" | "approved" | "rejected";
  submittedAt?: string;
}

export type ListSuppliersOutput = PaginatedResponse<SupplierItem>;

/**
 * List suppliers tool handler
 */
export function handleListSuppliers(
  input: ListSuppliersInput
): ListSuppliersOutput {
  // Validate pagination parameters
  const pagination = validatePaginationParams(input.limit, input.offset);

  // Filter suppliers for the specific RFP
  const suppliers: SupplierItem[] = MOCK_SUPPLIERS.filter(
    (sup) => sup.rfpId === input.rfp_id
  ).map((sup) => ({
    id: sup.id,
    name: sup.name,
    email: sup.email,
    status: sup.status,
    submittedAt: sup.submittedAt,
  }));

  // Apply pagination
  return paginateArray(suppliers, pagination.limit, pagination.offset);
}
