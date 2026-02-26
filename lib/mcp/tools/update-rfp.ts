/**
 * MCP Tool: update_rfp
 * Update metadata of an existing RFP (title, description, status)
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";

export const UpdateRFPInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  title: z.string().min(1).max(255).optional().describe("New title"),
  description: z.string().nullable().optional().describe("New description (null to clear)"),
  status: z
    .enum(["in_progress", "completed", "archived"])
    .optional()
    .describe("New status"),
});

export type UpdateRFPInput = z.infer<typeof UpdateRFPInputSchema>;

export interface UpdateRFPOutput {
  id: string;
  title: string;
  description: string | null;
  status: string;
  updatedAt: string;
}

export async function handleUpdateRFP(
  input: UpdateRFPInput,
  authContext: MCPAuthContext
): Promise<UpdateRFPOutput> {
  const supabase = createServiceClient();
  const { rfp_id, title, description, status } = input;

  // Verify access
  const { data: rfp, error: rfpError } = await supabase
    .from("rfps")
    .select("id, organization_id")
    .eq("id", rfp_id)
    .single();

  if (rfpError || !rfp) throw new Error(`RFP not found: ${rfp_id}`);

  if (
    authContext.organizationIds &&
    authContext.organizationIds.length > 0 &&
    !authContext.organizationIds.includes(rfp.organization_id)
  ) {
    const { data: assignment } = await supabase
      .from("rfp_user_assignments")
      .select("id")
      .eq("rfp_id", rfp_id)
      .eq("user_id", authContext.userId)
      .single();
    if (!assignment) throw new Error(`Access denied to RFP: ${rfp_id}`);
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length === 1) {
    throw new Error("No fields to update. Provide at least title, description, or status.");
  }

  const { data, error } = await supabase
    .from("rfps")
    .update(updates)
    .eq("id", rfp_id)
    .select("id, title, description, status, updated_at")
    .single();

  if (error) throw new Error(`Failed to update RFP: ${error.message}`);

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    updatedAt: data.updated_at,
  };
}
