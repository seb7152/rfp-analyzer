/**
 * MCP Tool: create_supplier
 * Add a single supplier to an RFP
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";

export const CreateSupplierInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  name: z.string().min(1, "Supplier name is required").max(255),
  supplier_id_external: z
    .string()
    .optional()
    .describe("Optional external reference ID (e.g. SUP-01)"),
  contact_name: z.string().optional().describe("Contact person name"),
  contact_email: z
    .string()
    .email()
    .optional()
    .describe("Contact email address"),
  contact_phone: z.string().optional().describe("Contact phone number"),
});

export type CreateSupplierInput = z.infer<typeof CreateSupplierInputSchema>;

export interface CreateSupplierOutput {
  id: string;
  rfpId: string;
  name: string;
  externalId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  createdAt: string;
}

export async function handleCreateSupplier(
  input: CreateSupplierInput,
  authContext: MCPAuthContext
): Promise<CreateSupplierOutput> {
  const supabase = createServiceClient();
  const { rfp_id } = input;

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

  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      rfp_id,
      name: input.name,
      supplier_id_external: input.supplier_id_external ?? null,
      contact_name: input.contact_name ?? null,
      contact_email: input.contact_email ?? null,
      contact_phone: input.contact_phone ?? null,
    })
    .select(
      "id, rfp_id, name, supplier_id_external, contact_name, contact_email, contact_phone, created_at"
    )
    .single();

  if (error) throw new Error(`Failed to create supplier: ${error.message}`);

  return {
    id: data.id,
    rfpId: data.rfp_id,
    name: data.name,
    externalId: data.supplier_id_external,
    contactName: data.contact_name,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    createdAt: data.created_at,
  };
}
