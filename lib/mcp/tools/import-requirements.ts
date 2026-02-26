/**
 * MCP Tool: import_requirements
 * Bulk import requirements for an RFP from a JSON payload.
 *
 * Accepts the same format as /imports/test-requirements.json:
 * {
 *   "requirements": [
 *     { "code": "R - 1", "title": "...", "description": "...", "weight": 1, "category_name": "..." }
 *   ]
 * }
 *
 * Also accepts the alternate French-key format:
 *   { "numéro": "R-1", "titre": "...", "exigence": "...", "catégorie": "..." }
 *
 * Categories are matched by title (case-insensitive). If category_id is provided it takes precedence.
 *
 * mode "append" (default): inserts without touching existing requirements.
 * mode "replace": deletes all existing requirements for this RFP first.
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";

// Flexible schema accepting both English and French field names
const RequirementInputSchema = z
  .object({
    // English keys
    code: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    category_name: z.string().optional(),
    category_id: z.string().optional(),
    weight: z.number().optional().default(1),
    is_mandatory: z.boolean().optional().default(false),
    display_order: z.number().int().optional(),
    // French keys (alternate format)
    numéro: z.string().optional(),
    titre: z.string().optional(),
    exigence: z.string().optional(),
    catégorie: z.string().optional(),
  })
  .passthrough();

export const ImportRequirementsInputSchema = z.object({
  rfp_id: z.string().min(1, "RFP ID is required"),
  requirements: z
    .array(RequirementInputSchema)
    .min(1, "At least one requirement is required"),
  mode: z
    .enum(["append", "replace"])
    .optional()
    .default("append")
    .describe(
      "'append' (default): add requirements without deleting existing ones. 'replace': delete all existing requirements for this RFP first."
    ),
});

export type ImportRequirementsInput = z.infer<typeof ImportRequirementsInputSchema>;

export interface ImportRequirementsOutput {
  created: number;
  skipped: number;
  errors: Array<{ index: number; code: string; message: string }>;
}

export async function handleImportRequirements(
  input: ImportRequirementsInput,
  authContext: MCPAuthContext
): Promise<ImportRequirementsOutput> {
  const supabase = createServiceClient();
  const { rfp_id, requirements, mode } = input;

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

  // Replace mode
  if (mode === "replace") {
    const { error: deleteError } = await supabase
      .from("requirements")
      .delete()
      .eq("rfp_id", rfp_id);
    if (deleteError)
      throw new Error(`Failed to delete existing requirements: ${deleteError.message}`);
  }

  // Pre-load all categories for this RFP (for name→id resolution)
  const { data: categories } = await supabase
    .from("categories")
    .select("id, title")
    .eq("rfp_id", rfp_id);

  // Build a normalized title map for quick lookup
  const categoryByTitle: Record<string, string> = {};
  for (const cat of categories ?? []) {
    categoryByTitle[cat.title.trim().toLowerCase()] = cat.id;
  }

  const errors: ImportRequirementsOutput["errors"] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < requirements.length; i++) {
    const raw = requirements[i] as any;

    // Normalize field names (French → English)
    const code: string =
      raw.code ?? raw["numéro"] ?? raw["numero"] ?? `REQ-${i + 1}`;
    const title: string | undefined =
      raw.title ?? raw["titre"];
    const description: string | undefined =
      raw.description ?? raw["exigence"];
    const categoryName: string | undefined =
      raw.category_name ?? raw["catégorie"] ?? raw["categorie"];
    const weight: number = typeof raw.weight === "number" ? raw.weight : 1;
    const isMandatory: boolean = raw.is_mandatory ?? false;

    if (!title) {
      errors.push({ index: i, code, message: "Missing required field: title (or 'titre')" });
      skipped++;
      continue;
    }

    // Resolve category
    let resolvedCategoryId: string | null = raw.category_id ?? null;
    if (!resolvedCategoryId && categoryName) {
      resolvedCategoryId =
        categoryByTitle[categoryName.trim().toLowerCase()] ?? null;
    }

    const { error } = await supabase.from("requirements").insert({
      rfp_id,
      requirement_id_external: code,
      title,
      description: description ?? null,
      category_id: resolvedCategoryId,
      weight,
      is_mandatory: isMandatory,
      display_order: raw.display_order ?? i + 1,
      created_by: authContext.userId,
    });

    if (error) {
      errors.push({ index: i, code, message: error.message });
      skipped++;
    } else {
      created++;
    }
  }

  return { created, skipped, errors };
}
