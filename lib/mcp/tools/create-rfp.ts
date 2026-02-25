/**
 * MCP Tool: create_rfp
 * Create a new RFP in the user's organization
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";

export const CreateRFPInputSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional().describe("Optional description"),
  status: z
    .enum(["in_progress", "completed", "archived"])
    .optional()
    .default("in_progress"),
});

export type CreateRFPInput = z.infer<typeof CreateRFPInputSchema>;

export interface CreateRFPOutput {
  id: string;
  title: string;
  description: string | null;
  status: string;
  organizationId: string;
  createdAt: string;
}

export async function handleCreateRFP(
  input: CreateRFPInput,
  authContext: MCPAuthContext
): Promise<CreateRFPOutput> {
  const supabase = createServiceClient();

  if (!authContext.organizationId) {
    throw new Error(
      "Organization context is required to create an RFP. Ensure your PAT is linked to an organization."
    );
  }

  const { data, error } = await supabase
    .from("rfps")
    .insert({
      title: input.title,
      description: input.description ?? null,
      status: input.status,
      organization_id: authContext.organizationId,
      created_by: authContext.userId,
    })
    .select("id, title, description, status, organization_id, created_at")
    .single();

  if (error) throw new Error(`Failed to create RFP: ${error.message}`);

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    status: data.status,
    organizationId: data.organization_id,
    createdAt: data.created_at,
  };
}
