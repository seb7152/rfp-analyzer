/**
 * MCP Tool: list_suppliers
 * List suppliers for a specific RFP with pagination
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";
import { PaginatedResponse, createPaginatedResponse } from "../utils/pagination";

export const ListSuppliersInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type ListSuppliersInput = z.infer<typeof ListSuppliersInputSchema>;

export interface SupplierItem {
  id: string;
  rfpId: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  createdAt: string;
}

export type ListSuppliersOutput = PaginatedResponse<SupplierItem>;

/**
 * List suppliers tool handler — returns real data for the specified RFP
 */
export async function handleListSuppliers(
  input: ListSuppliersInput,
  authContext: MCPAuthContext
): Promise<ListSuppliersOutput> {
  const supabase = createServiceClient();
  const { rfp_id, limit, offset } = input;

  // Verify the user has access to this RFP via their organization
  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, organization_id")
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

  const { data, error, count } = await supabase
    .from("suppliers")
    .select("id, rfp_id, name, contact_name, contact_email, created_at", {
      count: "exact",
    })
    .eq("rfp_id", rfp_id)
    .order("name", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch suppliers: ${error.message}`);
  }

  const items: SupplierItem[] = (data ?? []).map((sup) => ({
    id: sup.id,
    rfpId: sup.rfp_id,
    name: sup.name,
    contactName: sup.contact_name,
    contactEmail: sup.contact_email,
    createdAt: sup.created_at,
  }));

  return createPaginatedResponse(items, limit, offset, count ?? items.length);
}
