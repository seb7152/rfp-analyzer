/**
 * MCP Tool: import_structure
 * Bulk import categories (structure) for an RFP from a JSON payload.
 *
 * Accepts the same format as /imports/test-categories.json:
 * [
 *   { "id": "CAT-01", "code": "REQ-SOL", "title": "...", "short_name": "...", "level": 1, "parent_id": null }
 * ]
 *
 * The "id" field is an external reference used only for resolving parent_id relationships
 * within this import batch — it is NOT stored as the database UUID.
 *
 * mode "append" (default): inserts new categories without touching existing ones.
 * mode "replace": deletes all existing categories for this RFP then re-imports.
 * WARNING: "replace" also cascades to requirements if they reference categories.
 */

import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import type { MCPAuthContext } from "@/lib/mcp/auth";
import { resolveImportData } from "@/lib/mcp/utils/file-import";

const CategoryInputSchema = z.object({
  id: z.string().describe("External reference ID used for parent_id linking within this batch"),
  code: z.string().min(1),
  title: z.string().min(1),
  short_name: z.string().optional(),
  level: z.number().int().min(1).max(4),
  parent_id: z.string().nullable().optional().describe("External reference ID of the parent category"),
  weight: z.number().optional().default(1),
  display_order: z.number().int().optional(),
});

export const ImportStructureInputSchema = z
  .object({
    rfp_id: z.string().min(1, "RFP ID is required"),
    categories: z
      .array(CategoryInputSchema)
      .optional()
      .describe("Inline array of category objects. Omit when using file_url or file_content."),
    file_url: z
      .string()
      .url()
      .optional()
      .describe(
        "HTTPS URL to a JSON file containing the categories array. The server fetches and parses the file — the agent does not need to read the file content."
      ),
    file_content: z
      .string()
      .optional()
      .describe(
        "Raw JSON text of the categories array (alternative to file_url). Avoids the server making an outbound HTTP request."
      ),
    mode: z
      .enum(["append", "replace"])
      .optional()
      .default("append")
      .describe(
        "'append' (default): add categories without deleting existing ones. 'replace': delete all existing categories first."
      ),
  })
  .refine(
    (d) =>
      (d.categories && d.categories.length > 0) ||
      d.file_url ||
      d.file_content,
    {
      message:
        "Provide one of: categories (inline array), file_url (HTTPS URL), or file_content (raw JSON text).",
    }
  );

export type ImportStructureInput = z.infer<typeof ImportStructureInputSchema>;

export interface ImportStructureOutput {
  created: number;
  skipped: number;
  errors: Array<{ index: number; externalId: string; message: string }>;
  categoryIdMap: Record<string, string>;
}

export async function handleImportStructure(
  input: ImportStructureInput,
  authContext: MCPAuthContext
): Promise<ImportStructureOutput> {
  const supabase = createServiceClient();
  const { rfp_id, mode } = input;

  // Resolve categories from inline data, file_url, or file_content
  const rawData = await resolveImportData({
    inlineData: input.categories,
    file_url: input.file_url,
    file_content: input.file_content,
  });
  const categories = z.array(CategoryInputSchema).parse(rawData);

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

  // Replace mode: delete all existing categories
  if (mode === "replace") {
    const { error: deleteError } = await supabase
      .from("categories")
      .delete()
      .eq("rfp_id", rfp_id);
    if (deleteError)
      throw new Error(`Failed to delete existing categories: ${deleteError.message}`);
  }

  /**
   * We need to insert in level order (parents before children) so that
   * we can resolve parent_id (external) → real DB UUID.
   */
  const sortedCategories = [...categories].sort((a, b) => a.level - b.level);

  // Map: external_id → real DB UUID
  const externalToDbId: Record<string, string> = {};
  const errors: ImportStructureOutput["errors"] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < sortedCategories.length; i++) {
    const cat = sortedCategories[i];
    const originalIndex = categories.indexOf(cat);

    // Resolve parent DB UUID
    let parentDbId: string | null = null;
    if (cat.parent_id) {
      parentDbId = externalToDbId[cat.parent_id] ?? null;
      if (!parentDbId) {
        errors.push({
          index: originalIndex,
          externalId: cat.id,
          message: `Parent category '${cat.parent_id}' not found — ensure it appears before this entry or has been imported previously`,
        });
        skipped++;
        continue;
      }
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        rfp_id,
        code: cat.code,
        title: cat.title,
        short_name: cat.short_name ?? cat.title.substring(0, 50),
        level: cat.level,
        parent_id: parentDbId,
        weight: cat.weight,
        display_order: cat.display_order ?? i + 1,
        created_by: authContext.userId,
      })
      .select("id")
      .single();

    if (error) {
      errors.push({
        index: originalIndex,
        externalId: cat.id,
        message: error.message,
      });
      skipped++;
    } else {
      externalToDbId[cat.id] = data.id;
      created++;
    }
  }

  return {
    created,
    skipped,
    errors,
    categoryIdMap: externalToDbId,
  };
}
