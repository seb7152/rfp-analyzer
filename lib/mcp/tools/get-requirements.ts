/**
 * MCP Tool: get_requirements
 * Get requirements for a specific RFP with pagination
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";
import { PaginatedResponse, createPaginatedResponse } from "../utils/pagination";

export const GetRequirementsInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  limit: z.number().int().min(1).max(100).optional().default(50),
  offset: z.number().int().min(0).optional().default(0),
});

export type GetRequirementsInput = z.infer<typeof GetRequirementsInputSchema>;

export interface RequirementItem {
  id: string;
  rfpId: string;
  title: string;
  description: string | null;
  level: number;
  parentId: string | null;
  isMandatory: boolean;
  isOptional: boolean;
  weight: number | null;
  createdAt: string;
}

export type GetRequirementsOutput = PaginatedResponse<RequirementItem>;

/**
 * Get requirements tool handler — returns real data for the specified RFP
 */
export async function handleGetRequirements(
  input: GetRequirementsInput,
  authContext: MCPAuthContext
): Promise<GetRequirementsOutput> {
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
    authContext.organizationIds &&
    authContext.organizationIds.length > 0 &&
    !authContext.organizationIds.includes(rfp.organization_id)
  ) {
    // Check if user has a direct assignment to this RFP
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
    .from("requirements")
    .select(
      "id, rfp_id, title, description, level, parent_id, is_mandatory, is_optional, weight, created_at",
      { count: "exact" }
    )
    .eq("rfp_id", rfp_id)
    .order("display_order", { ascending: true, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch requirements: ${error.message}`);
  }

  const items: RequirementItem[] = (data ?? []).map((req) => ({
    id: req.id,
    rfpId: req.rfp_id,
    title: req.title,
    description: req.description,
    level: req.level,
    parentId: req.parent_id,
    isMandatory: req.is_mandatory,
    isOptional: req.is_optional,
    weight: req.weight,
    createdAt: req.created_at,
  }));

  return createPaginatedResponse(items, limit, offset, count ?? items.length);
}
