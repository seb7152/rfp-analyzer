/**
 * MCP Tool: create_requirement
 * Add a single requirement to an RFP
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";

export const CreateRequirementInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional().describe("Full requirement text / description"),
  requirement_id_external: z
    .string()
    .optional()
    .describe("External reference code (e.g. 'R - 1')"),
  category_id: z
    .string()
    .optional()
    .describe("UUID of the category this requirement belongs to"),
  category_name: z
    .string()
    .optional()
    .describe(
      "Category title to look up (used if category_id is not provided — matches by exact title)"
    ),
  weight: z
    .number()
    .min(0)
    .max(10)
    .optional()
    .default(1)
    .describe("Relative weight of this requirement (default: 1)"),
  is_mandatory: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether this requirement is mandatory"),
  display_order: z
    .number()
    .int()
    .optional()
    .describe("Display order within its category"),
});

export type CreateRequirementInput = z.infer<typeof CreateRequirementInputSchema>;

export interface CreateRequirementOutput {
  id: string;
  rfpId: string;
  externalId: string | null;
  title: string;
  description: string | null;
  categoryId: string | null;
  weight: number;
  isMandatory: boolean;
  createdAt: string;
}

export async function handleCreateRequirement(
  input: CreateRequirementInput,
  authContext: MCPAuthContext
): Promise<CreateRequirementOutput> {
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

  // Resolve category
  let resolvedCategoryId: string | null = input.category_id ?? null;

  if (!resolvedCategoryId && input.category_name) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("rfp_id", rfp_id)
      .ilike("title", input.category_name.trim())
      .limit(1)
      .single();

    if (cat) {
      resolvedCategoryId = cat.id;
    }
  }

  const { data, error } = await supabase
    .from("requirements")
    .insert({
      rfp_id,
      title: input.title,
      description: input.description ?? null,
      requirement_id_external: input.requirement_id_external ?? null,
      category_id: resolvedCategoryId,
      weight: input.weight,
      is_mandatory: input.is_mandatory,
      display_order: input.display_order ?? null,
      created_by: authContext.userId,
    })
    .select(
      "id, rfp_id, requirement_id_external, title, description, category_id, weight, is_mandatory, created_at"
    )
    .single();

  if (error) throw new Error(`Failed to create requirement: ${error.message}`);

  return {
    id: data.id,
    rfpId: data.rfp_id,
    externalId: data.requirement_id_external,
    title: data.title,
    description: data.description,
    categoryId: data.category_id,
    weight: data.weight,
    isMandatory: data.is_mandatory,
    createdAt: data.created_at,
  };
}
