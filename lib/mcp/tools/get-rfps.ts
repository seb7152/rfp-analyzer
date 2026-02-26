/**
 * MCP Tool: get_rfps
 * List all RFPs accessible to the authenticated user
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";
import { PaginatedResponse, createPaginatedResponse } from "../utils/pagination";

export const GetRFPsInputSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type GetRFPsInput = z.infer<typeof GetRFPsInputSchema>;

export interface RFPItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  organizationId: string;
  createdAt: string;
}

export type GetRFPsOutput = PaginatedResponse<RFPItem>;

/**
 * Get RFPs tool handler — returns real data scoped to the user's organization
 */
export async function handleGetRFPs(
  input: GetRFPsInput,
  authContext: MCPAuthContext
): Promise<GetRFPsOutput> {
  const supabase = createServiceClient();
  const { limit, offset } = input;

  // Build base query scoped to the user's organization
  let query = supabase
    .from("rfps")
    .select("id, title, description, status, organization_id, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (authContext.organizationIds && authContext.organizationIds.length > 0) {
    query = query.in("organization_id", authContext.organizationIds);
  } else {
    // Fall back to RFPs directly assigned to the user
    const { data: assignments } = await supabase
      .from("rfp_user_assignments")
      .select("rfp_id")
      .eq("user_id", authContext.userId);

    const rfpIds = (assignments ?? []).map((a) => a.rfp_id);
    if (rfpIds.length === 0) {
      return createPaginatedResponse([], limit, offset, 0);
    }
    query = query.in("id", rfpIds);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch RFPs: ${error.message}`);
  }

  const items: RFPItem[] = (data ?? []).map((rfp) => ({
    id: rfp.id,
    title: rfp.title,
    description: rfp.description,
    status: rfp.status,
    organizationId: rfp.organization_id,
    createdAt: rfp.created_at,
  }));

  return createPaginatedResponse(items, limit, offset, count ?? items.length);
}
