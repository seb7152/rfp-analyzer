import { createClient as createServerClient } from "./server";
import type { Requirement } from "./types";

/**
 * Recursively fetch all requirements for an RFP with hierarchical structure
 * Returns a flat list of requirements organized by their hierarchical path
 *
 * Uses a recursive CTE to:
 * 1. Start with root requirements (level 1, parent_id IS NULL)
 * 2. Recursively fetch children at each level
 * 3. Maintain path ordering for proper tree structure
 */
export async function getRequirements(rfpId: string): Promise<Requirement[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("requirements")
    .select(
      `
      id,
      rfp_id,
      requirement_id_external,
      title,
      description,
      context,
      category_id,
      parent_id,
      level,
      weight,
      position_in_pdf,
      rf_document_id,
      created_at,
      updated_at,
      created_by
    `
    )
    .eq("rfp_id", rfpId)
    .order("level", { ascending: true })
    .order("requirement_id_external", { ascending: true });

  if (error) {
    console.error("Error fetching requirements:", error);
    throw new Error(`Failed to fetch requirements: ${error.message}`);
  }

  return (data || []) as Requirement[];
}

/**
 * Fetch all requirements for an RFP with their associated tags
 * This is useful for export operations where you want to include tag names
 *
 * Returns requirements with a tags field containing array of tag names
 */
export async function getRequirementsWithTags(
  rfpId: string
): Promise<Array<Requirement & { tags: string[] }>> {
  const supabase = await createServerClient();

  // First, fetch all requirements
  const { data: requirements, error: reqError } = await supabase
    .from("requirements")
    .select(
      `
      id,
      rfp_id,
      requirement_id_external,
      title,
      description,
      context,
      category_id,
      parent_id,
      level,
      weight,
      position_in_pdf,
      rf_document_id,
      created_at,
      updated_at,
      created_by
    `
    )
    .eq("rfp_id", rfpId)
    .order("level", { ascending: true })
    .order("requirement_id_external", { ascending: true });

  if (reqError) {
    console.error("Error fetching requirements:", reqError);
    throw new Error(`Failed to fetch requirements: ${reqError.message}`);
  }

  if (!requirements || requirements.length === 0) {
    return [];
  }

  // Fetch all tag associations for these requirements with tag details
  const requirementIds = requirements.map((r) => r.id);

  const { data: tagAssociations, error: tagError } = await supabase
    .from("requirement_tags")
    .select(
      `
      requirement_id,
      tag:tags(id, name)
    `
    )
    .in("requirement_id", requirementIds);

  if (tagError) {
    console.error("Error fetching requirement tags:", tagError);
    // Continue without tags rather than failing
  }

  // Build a map of requirement_id -> tag names
  const tagsByRequirement = new Map<string, string[]>();
  if (tagAssociations) {
    for (const assoc of tagAssociations) {
      const tags = tagsByRequirement.get(assoc.requirement_id) || [];
      // Handle both single object and array responses from Supabase
      const tagData = Array.isArray(assoc.tag) ? assoc.tag[0] : assoc.tag;
      if (tagData && tagData.name) {
        tags.push(tagData.name);
      }
      tagsByRequirement.set(assoc.requirement_id, tags);
    }
  }

  // Add tags to each requirement
  const requirementsWithTags = (requirements as Requirement[]).map((req) => ({
    ...req,
    tags: tagsByRequirement.get(req.id) || [],
  }));

  return requirementsWithTags;
}

/**
 * Fetch a single requirement with all its details
 */
export async function getRequirement(
  requirementId: string
): Promise<Requirement | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("requirements")
    .select(
      `
      id,
      rfp_id,
      requirement_id_external,
      title,
      description,
      context,
      category_id,
      parent_id,
      level,
      weight,
      position_in_pdf,
      rf_document_id,
      created_at,
      updated_at,
      created_by
    `
    )
    .eq("id", requirementId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching requirement:", error);
    throw new Error(`Failed to fetch requirement: ${error.message}`);
  }

  return (data as Requirement) || null;
}

/**
 * Build the breadcrumb path for a requirement
 * Returns array of requirements from root (Domain) to the selected requirement
 *
 * Example: [Domain-1, Category-1.1, Subcategory-1.1.1, Requirement-001]
 */
export async function getRequirementBreadcrumb(
  requirementId: string
): Promise<Requirement[]> {
  // First, get the target requirement to know the RFP ID
  const requirement = await getRequirement(requirementId);
  if (!requirement) {
    return [];
  }

  // Build breadcrumb by traversing up the parent chain
  const breadcrumb: Requirement[] = [];
  let currentId: string | null = requirementId;

  while (currentId) {
    const current = await getRequirement(currentId);
    if (!current) break;

    breadcrumb.unshift(current);
    currentId = current.parent_id;
  }

  return breadcrumb;
}

/**
 * Fetch all children of a specific requirement
 */
export async function getRequirementChildren(
  parentId: string
): Promise<Requirement[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("requirements")
    .select(
      `
      id,
      rfp_id,
      requirement_id_external,
      title,
      description,
      context,
      parent_id,
      level,
      weight,
      position_in_pdf,
      rf_document_id,
      created_at,
      updated_at,
      created_by
    `
    )
    .eq("parent_id", parentId)
    .order("requirement_id_external", { ascending: true });

  if (error) {
    console.error("Error fetching requirement children:", error);
    throw new Error(`Failed to fetch requirement children: ${error.message}`);
  }

  return (data || []) as Requirement[];
}

/**
 * Build a nested hierarchical structure from flat requirement list
 * Used for tree rendering in the UI
 */
export function buildHierarchy<T extends Requirement>(
  requirements: T[]
): Array<T & { children?: Array<T & { children?: any }> }> {
  const map = new Map<
    string,
    T & { children?: Array<T & { children?: any }> }
  >();
  const roots: Array<T & { children?: Array<T & { children?: any }> }> = [];

  // First pass: create map of all requirements
  for (const req of requirements) {
    map.set(req.id, { ...req, children: [] });
  }

  // Second pass: build parent-child relationships
  for (const req of requirements) {
    const node = map.get(req.id)!;
    if (req.parent_id) {
      const parent = map.get(req.parent_id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      }
    } else {
      // Root node
      roots.push(node);
    }
  }

  // Sort children at each level by requirement_id_external
  function sortChildren(
    node: T & { children?: Array<T & { children?: any }> }
  ): void {
    if (node.children) {
      node.children.sort((a, b) =>
        a.requirement_id_external.localeCompare(b.requirement_id_external)
      );
      node.children.forEach(sortChildren);
    }
  }

  roots.forEach(sortChildren);

  return roots;
}

/**
 * Get all requirements at a specific level for an RFP
 * Useful for filtering by level (e.g., get all leaf requirements at level 4)
 */
export async function getRequirementsByLevel(
  rfpId: string,
  level: 1 | 2 | 3 | 4
): Promise<Requirement[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("requirements")
    .select(
      `
      id,
      rfp_id,
      requirement_id_external,
      title,
      description,
      context,
      parent_id,
      level,
      weight,
      position_in_pdf,
      rf_document_id,
      created_at,
      updated_at,
      created_by
    `
    )
    .eq("rfp_id", rfpId)
    .eq("level", level)
    .order("requirement_id_external", { ascending: true });

  if (error) {
    console.error("Error fetching requirements by level:", error);
    throw new Error(`Failed to fetch requirements by level: ${error.message}`);
  }

  return (data || []) as Requirement[];
}

/**
 * Search requirements by ID or title within an RFP
 * Case-insensitive text search
 */
export async function searchRequirements(
  rfpId: string,
  query: string
): Promise<Requirement[]> {
  if (!query || query.trim().length === 0) {
    // Return all requirements if query is empty
    return getRequirements(rfpId);
  }

  const supabase = await createServerClient();
  const searchQuery = `%${query}%`;

  const { data, error } = await supabase
    .from("requirements")
    .select(
      `
      id,
      rfp_id,
      requirement_id_external,
      title,
      description,
      context,
      parent_id,
      level,
      weight,
      position_in_pdf,
      rf_document_id,
      created_at,
      updated_at,
      created_by
    `
    )
    .eq("rfp_id", rfpId)
    .or(
      `requirement_id_external.ilike.${searchQuery},title.ilike.${searchQuery}`
    )
    .order("level", { ascending: true })
    .order("requirement_id_external", { ascending: true });

  if (error) {
    console.error("Error searching requirements:", error);
    throw new Error(`Failed to search requirements: ${error.message}`);
  }

  return (data || []) as Requirement[];
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Import categories for an RFP
 * Uses UPSERT to replace existing categories with the same rfp_id and code
 */
export async function importCategories(
  rfpId: string,
  categories: Array<{
    id: string;
    code: string;
    title: string;
    short_name: string;
    level: number;
    parent_id?: string;
    order?: number;
  }>,
  userId: string
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createServerClient();

  // Map external IDs to database IDs
  const idMapping: Record<string, string> = {};

  try {
    // Sort categories by level to ensure parents are created first
    const sorted = [...categories].sort((a, b) => a.level - b.level);

    // Auto-increment order for categories without explicit order
    let currentOrder = 1;

    for (const category of sorted) {
      let parentId: string | null = null;

      if (category.parent_id && idMapping[category.parent_id]) {
        parentId = idMapping[category.parent_id];
      }

      // Use explicit order if provided, otherwise auto-increment
      const displayOrder =
        category.order !== undefined ? category.order : currentOrder;

      const { data, error } = await supabase
        .from("categories")
        .upsert(
          [
            {
              rfp_id: rfpId,
              code: category.code,
              title: category.title,
              short_name: category.short_name,
              level: category.level,
              parent_id: parentId,
              display_order: displayOrder,
              created_by: userId,
            },
          ],
          {
            onConflict: "rfp_id,code",
          }
        )
        .select("id")
        .single();

      if (error) {
        throw new Error(
          `Failed to upsert category ${category.id}: ${error.message}`
        );
      }

      idMapping[category.id] = data.id;

      // Only increment if using auto-increment
      if (category.order === undefined) {
        currentOrder++;
      }
    }

    return { success: true, count: categories.length };
  } catch (error) {
    return {
      success: false,
      count: Object.keys(idMapping).length,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get all categories for an RFP
 */
export async function getCategories(rfpId: string): Promise<Requirement[]> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("rfp_id", rfpId)
    .order("level", { ascending: true })
    .order("code", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error);
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data || []) as unknown as Requirement[];
}

// ============================================================================
// TAG MANAGEMENT HELPERS FOR IMPORT
// ============================================================================

/**
 * Color palette for automatically creating new tags during import
 * Colors are applied sequentially and cycle through the palette
 */
const TAG_COLOR_PALETTE = [
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Green
  "#06B6D4", // Cyan
  "#EF4444", // Red
  "#6366F1", // Indigo
];

/**
 * Get or create tags by name. If a tag doesn't exist, create it with a color from the palette.
 * Returns a Map of tag names to tag IDs for efficient lookup during import.
 *
 * @param supabase - Supabase client
 * @param rfpId - RFP ID
 * @param tagNames - Array of tag names to get or create
 * @param userId - User ID for audit trail
 * @returns Map of tag name to tag ID
 */
async function getOrCreateTags(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  rfpId: string,
  tagNames: string[],
  userId: string
): Promise<Map<string, string>> {
  const tagMap = new Map<string, string>();

  if (tagNames.length === 0) {
    return tagMap;
  }

  try {
    // Step 1: Fetch existing tags
    const { data: existingTags, error: existingError } = await supabase
      .from("tags")
      .select("id, name")
      .eq("rfp_id", rfpId)
      .in(
        "name",
        tagNames.map((t) => t.trim())
      );

    if (existingError) {
      console.error("Error fetching existing tags:", existingError);
      throw existingError;
    }

    // Map existing tags
    const existingTagNames = new Set<string>();
    if (existingTags) {
      for (const tag of existingTags) {
        tagMap.set(tag.name, tag.id);
        existingTagNames.add(tag.name);
      }
    }

    // Step 2: Identify tags that need to be created
    const tagsToCreate = tagNames.filter(
      (name) => !existingTagNames.has(name.trim())
    );

    // Step 3: Create missing tags with colors from palette
    if (tagsToCreate.length > 0) {
      const newTags = tagsToCreate.map((name, index) => ({
        rfp_id: rfpId,
        name: name.trim(),
        color: TAG_COLOR_PALETTE[index % TAG_COLOR_PALETTE.length],
        created_by: userId,
      }));

      const { data: createdTags, error: createError } = await supabase
        .from("tags")
        .insert(newTags)
        .select("id, name");

      if (createError) {
        if ((createError as { code?: string }).code === "23505") {
          console.warn(
            "Tag creation race condition detected, re-fetching tags..."
          );
          const { data: refetchedTags, error: refetchError } = await supabase
            .from("tags")
            .select("id, name")
            .eq("rfp_id", rfpId)
            .in(
              "name",
              tagsToCreate.map((t) => t.trim())
            );

          if (refetchError) {
            throw refetchError;
          }

          if (refetchedTags) {
            for (const tag of refetchedTags) {
              if (!tagMap.has(tag.name)) {
                tagMap.set(tag.name, tag.id);
              }
            }
          }
        } else {
          console.error("Error creating tags:", createError);
          throw createError;
        }
      }

      if (createdTags) {
        for (const tag of createdTags) {
          tagMap.set(tag.name, tag.id);
        }
      }
    }

    return tagMap;
  } catch (error) {
    console.error("Error in getOrCreateTags:", error);
    throw error;
  }
}

/**
 * Import requirements for an RFP
 * Uses UPSERT to replace existing requirements with the same rfp_id and requirement_id_external
 * Links requirements to existing categories by name
 * Also handles tag creation and linking if tags are provided
 */
export async function importRequirements(
  rfpId: string,
  requirements: Array<{
    id?: string;
    code: string;
    title: string;
    description: string;
    weight?: number; // Optional, defaults to 0
    category_name: string;
    is_mandatory?: boolean;
    is_optional?: boolean;
    order?: number;
    page_number?: number;
    rf_document_id?: string;
    context?: string;
    tags?: string[]; // Optional: array of tag names
  }>,
  userId: string,
  options?: {
    importCode?: boolean;
    importTitle?: boolean;
    importContent?: boolean;
    importContexts?: boolean;
  }
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createServerClient();

  // Default options
  const {
    importCode = true,
    importTitle = true,
    importContent = true,
    importContexts = true,
  } = options || {};

  try {
    // STEP 0: Collect all unique tag names and get/create tags
    const allTagNames = new Set<string>();
    for (const req of requirements) {
      if (req.tags && Array.isArray(req.tags)) {
        req.tags.forEach((tagName) => {
          const normalized = tagName.trim();
          if (normalized.length > 0) {
            allTagNames.add(normalized);
          }
        });
      }
    }

    // Get or create all tags in one batch operation
    let tagNameToIdMap = new Map<string, string>();
    if (allTagNames.size > 0) {
      try {
        tagNameToIdMap = await getOrCreateTags(
          supabase,
          rfpId,
          Array.from(allTagNames),
          userId
        );
      } catch (error) {
        console.warn("Failed to process tags, continuing without tags:", error);
        tagNameToIdMap = new Map<string, string>();
      }
    }
    // First, fetch all categories to map names/codes to IDs
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, title, code")
      .eq("rfp_id", rfpId);

    if (catError) {
      throw new Error(`Failed to fetch categories: ${catError.message}`);
    }

    // Create maps for both title and code lookups
    const categoryTitleToId = new Map(
      (categories || []).map((c) => [c.title, c.id])
    );
    const categoryCodeToId = new Map(
      (categories || []).map((c) => [c.code, c.id])
    );

    // Auto-increment order for requirements without explicit order
    let currentOrder = 1;
    let upsertedCount = 0;
    const tagRequests: Array<{ code: string; tags: string[] }> = [];

    // If we are NOT importing codes (Update Only mode), we need to know which codes exist
    let existingCodes = new Set<string>();
    let existingRequirementsMap = new Map<string, any>();

    if (!importCode || !importTitle || !importContent || !importContexts) {
      // Fetch existing requirements to check existence and/or merge data
      const { data: existingReqs, error: existError } = await supabase
        .from("requirements")
        .select(
          "requirement_id_external, title, description, context, category_id"
        )
        .eq("rfp_id", rfpId);

      if (existError) {
        throw new Error(
          `Failed to fetch existing requirements: ${existError.message}`
        );
      }

      if (existingReqs) {
        existingReqs.forEach((r) => {
          existingCodes.add(r.requirement_id_external);
          existingRequirementsMap.set(r.requirement_id_external, r);
        });
      }
    }

    for (const req of requirements) {
      // If Update Only mode and code doesn't exist, skip
      if (!importCode && !existingCodes.has(req.code)) {
        continue;
      }

      // Use explicit order if provided, otherwise auto-increment
      const displayOrder = req.order !== undefined ? req.order : currentOrder;

      const positionInPdf = req.page_number
        ? {
            page_number: req.page_number,
          }
        : null;

      // Handle partial updates / merging
      const existing = existingRequirementsMap.get(req.code);

      // Determine category_id: preserve existing if in Update Only mode
      let categoryId: string;
      if (!importCode && existing && existing.category_id) {
        // Update Only mode: preserve existing category
        categoryId = existing.category_id;
      } else {
        // New requirement or normal import mode: use provided category
        const newCategoryId =
          categoryTitleToId.get(req.category_name) ||
          categoryCodeToId.get(req.category_name);

        if (!newCategoryId) {
          console.warn(
            `Skipping requirement ${req.code}: category "${req.category_name}" not found (searched by title and code)`
          );
          continue;
        }
        categoryId = newCategoryId;
      }

      // Prepare payload with selective fields
      const payload: any = {
        rfp_id: rfpId,
        requirement_id_external: req.code,
        weight: req.weight ?? 0, // Default to 0 if not provided
        category_id: categoryId,
        level: 4, // Requirements are always level 4
        is_mandatory: req.is_mandatory ?? false,
        is_optional: req.is_optional ?? false,
        display_order: displayOrder,
        position_in_pdf: positionInPdf,
        rf_document_id: req.rf_document_id || null,
        created_by: userId,
      };

      // Title
      if (importTitle) {
        payload.title = req.title;
      } else if (existing) {
        payload.title = existing.title;
      } else {
        // New record but title not imported? Use code or empty
        payload.title = req.code;
      }

      // Description (Content)
      if (importContent) {
        payload.description = req.description;
      } else if (existing) {
        payload.description = existing.description;
      } else {
        payload.description = "";
      }

      // Context
      // Note: The input 'req' object currently has 'description' which might contain context if it was concatenated before.
      // But if we want to support 'importContexts' separately, we should ideally receive it separately.
      // For now, let's assume 'req.description' contains the content we want to import if importContent is true.
      // If we have a separate context field in the input, we should use it.
      // The current caller (import-docx) concatenates context into description.
      // We should probably update the caller to pass context separately if possible,
      // but 'importRequirements' signature expects 'description'.
      //
      // Let's assume for now that if importContent is true, we update description.
      // If importContexts is true, we update context column (if we add it to input).
      //
      // Since the input type doesn't have 'context', we'll stick to 'description' for now.
      // If the user wants to toggle "Content" vs "Contexts", and both map to "description" in the current logic,
      // we need to be careful.
      //
      // However, the user asked for "Contexts" column in the preview.
      // And the backend route concatenates them.
      //
      // To properly support this, we should really update the input type to include 'context'.
      // But to avoid breaking changes, we'll assume the caller handles the separation if needed.
      //
      // WAIT: The caller (import-docx/route.ts) constructs the object.
      // I will update the caller to pass 'context' separately.
      // So I'll add 'context' to the input type of this function implicitly (by casting or extending).

      if (importContexts) {
        // @ts-ignore
        payload.context = req.context || null;
      } else if (existing) {
        payload.context = existing.context;
      } else {
        payload.context = null;
      }

      const { error } = await supabase.from("requirements").upsert([payload], {
        onConflict: "rfp_id,requirement_id_external",
      });

      if (error) {
        console.warn(
          `Failed to upsert requirement ${req.code}: ${error.message}`
        );
        continue;
      }

      upsertedCount++;

      if (req.tags && Array.isArray(req.tags) && req.tags.length > 0) {
        const normalizedTags = Array.from(
          new Set(
            req.tags
              .map((tagName) => tagName.trim())
              .filter((tagName) => tagName.length > 0)
          )
        );

        if (normalizedTags.length > 0) {
          tagRequests.push({ code: req.code, tags: normalizedTags });
        }
      }

      // Only increment if using auto-increment
      if (req.order === undefined) {
        currentOrder++;
      }
    }

    if (tagRequests.length > 0 && tagNameToIdMap.size > 0) {
      try {
        const codes = Array.from(new Set(tagRequests.map((req) => req.code)));
        const { data: taggedRequirements, error: taggedReqError } =
          await supabase
            .from("requirements")
            .select("id, requirement_id_external")
            .eq("rfp_id", rfpId)
            .in("requirement_id_external", codes);

        if (taggedReqError) {
          console.warn(
            "Failed to fetch requirements for tag linking:",
            taggedReqError
          );
        } else {
          const requirementIdByCode = new Map<string, string>();
          for (const requirement of taggedRequirements || []) {
            requirementIdByCode.set(
              requirement.requirement_id_external,
              requirement.id
            );
          }

          const associations: Array<{
            requirement_id: string;
            tag_id: string;
            created_by: string;
          }> = [];
          const associationKeys = new Set<string>();

          for (const request of tagRequests) {
            const requirementId = requirementIdByCode.get(request.code);
            if (!requirementId) continue;

            for (const tagName of request.tags) {
              const tagId = tagNameToIdMap.get(tagName);
              if (!tagId) continue;
              const key = `${requirementId}:${tagId}`;
              if (associationKeys.has(key)) continue;
              associationKeys.add(key);
              associations.push({
                requirement_id: requirementId,
                tag_id: tagId,
                created_by: userId,
              });
            }
          }

          if (associations.length > 0) {
            const { error: linkError } = await supabase
              .from("requirement_tags")
              .upsert(associations, {
                onConflict: "requirement_id,tag_id",
                ignoreDuplicates: true,
              });

            if (linkError) {
              console.warn("Failed to link tags in bulk:", linkError);
            }
          }
        }
      } catch (tagError) {
        console.warn("Failed to link tags in bulk:", tagError);
      }
    }

    return { success: true, count: upsertedCount };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Import suppliers for an RFP
 */
export async function importSuppliers(
  rfpId: string,
  suppliers: Array<{
    id: string;
    name: string;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
  }>
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createServerClient();

  try {
    let insertedCount = 0;

    for (const supplier of suppliers) {
      const { error } = await supabase.from("suppliers").insert([
        {
          rfp_id: rfpId,
          supplier_id_external: supplier.id,
          name: supplier.name,
          contact_name: supplier.contact_name || null,
          contact_email: supplier.contact_email || null,
          contact_phone: supplier.contact_phone || null,
        },
      ]);

      if (error) {
        console.warn(
          `Failed to insert supplier ${supplier.id}: ${error.message}`
        );
        continue;
      }

      insertedCount++;
    }

    return { success: true, count: insertedCount };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Calculate RFP completion percentage
 * Returns percentage of responses marked as checked (is_checked = true)
 * Only counts responses for leaf requirements (requirements without children)
 */
export async function getRFPCompletionPercentage(
  rfpId: string,
  versionId?: string
): Promise<number> {
  const supabase = await createServerClient();

  // If no versionId provided, use the active version for this RFP
  let resolvedVersionId = versionId;
  if (!resolvedVersionId) {
    const { data: activeVersion } = await supabase
      .from("evaluation_versions")
      .select("id")
      .eq("rfp_id", rfpId)
      .eq("is_active", true)
      .single();
    if (activeVersion) {
      resolvedVersionId = activeVersion.id;
    }
  }

  // Get all responses for leaf requirements only (level 4)
  let query = supabase
    .from("responses")
    .select("id, is_checked, requirement_id, supplier_id")
    .eq("rfp_id", rfpId);

  if (resolvedVersionId) {
    query = query.eq("version_id", resolvedVersionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching responses for completion:", error);
    throw new Error(
      `Failed to fetch responses for completion: ${error.message}`
    );
  }

  let responses = (data || []) as Array<{
    id: string;
    is_checked: boolean;
    requirement_id: string;
    supplier_id: string;
  }>;

  // Filter responses to only include active suppliers of the version
  if (resolvedVersionId) {
    const { getVersionSupplierStatuses, getActiveSupplierIds } = await import(
      "@/lib/suppliers/status-cache"
    );
    const statuses = await getVersionSupplierStatuses(supabase, resolvedVersionId);
    const activeSupplierIds = getActiveSupplierIds(statuses);
    responses = responses.filter((r) => activeSupplierIds.has(r.supplier_id));
  }

  // Get all requirements to identify leaf nodes (requirements without children)
  const { data: requirements, error: reqError } = await supabase
    .from("requirements")
    .select("id, parent_id")
    .eq("rfp_id", rfpId);

  if (reqError) {
    console.error("Error fetching requirements:", reqError);
    throw new Error(
      `Failed to fetch requirements for completion: ${reqError.message}`
    );
  }

  const allRequirements = (requirements || []) as Array<{
    id: string;
    parent_id: string | null;
  }>;

  // Identify leaf requirements (those that are not parents of other requirements)
  const parentIds = new Set(
    allRequirements.filter((r) => r.parent_id !== null).map((r) => r.parent_id)
  );

  const leafReqIds = new Set(
    allRequirements.filter((r) => !parentIds.has(r.id)).map((r) => r.id)
  );

  // Debug logging
  console.log(
    `[Completion] RFP ${rfpId}${resolvedVersionId ? ` (v${resolvedVersionId})` : ""}:`
  );
  console.log(`  Total responses: ${responses.length}`);
  console.log(`  Total requirements: ${allRequirements.length}`);
  console.log(`  Leaf requirements: ${leafReqIds.size}`);
  console.log(`  Parent IDs: ${parentIds.size}`);

  // Filter responses to only those for leaf requirements
  const leafResponses = responses.filter((r) =>
    leafReqIds.has(r.requirement_id)
  );

  console.log(`  Leaf responses: ${leafResponses.length}`);
  console.log(
    `  Checked responses: ${leafResponses.filter((r) => r.is_checked).length}`
  );

  const total = leafResponses.length;

  if (total === 0) {
    console.log(`  Result: 0% (no responses for leaf requirements)`);
    return 0; // No responses = 0% complete
  }

  const checked = leafResponses.filter((r) => r.is_checked).length;
  const percentage = Math.round((checked / total) * 100);

  console.log(
    `  Result: ${percentage}%${resolvedVersionId ? " (filtered by version)" : ""}`
  );
  return percentage;
}

/**
 * Fetch all responses for a specific requirement with supplier information
 * Includes supplier details joined with response data
 */
export async function getResponsesForRequirement(
  requirementId: string
): Promise<
  Array<{
    id: string;
    rfp_id: string;
    requirement_id: string;
    supplier_id: string;
    response_text: string | null;
    ai_score: number | null;
    ai_comment: string | null;
    manual_score: number | null;
    status: "pending" | "pass" | "partial" | "fail" | "roadmap";
    is_checked: boolean;
    manual_comment: string | null;
    question: string | null;
    last_modified_by: string | null;
    created_at: string;
    updated_at: string;
    supplier: {
      id: string;
      rfp_id: string;
      supplier_id_external: string;
      name: string;
      contact_name: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      created_at: string;
    };
  }>
> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("responses")
    .select(
      `
      id,
      rfp_id,
      requirement_id,
      supplier_id,
      response_text,
      ai_score,
      ai_comment,
      manual_score,
      status,
      is_checked,
      manual_comment,
      question,
      last_modified_by,
      created_at,
      updated_at,
      supplier:suppliers (
        id,
        rfp_id,
        supplier_id_external,
        name,
        contact_name,
        contact_email,
        contact_phone,
        created_at
      )
    `
    )
    .eq("requirement_id", requirementId);

  if (error) {
    console.error("Error fetching responses for requirement:", error);
    throw new Error(
      `Failed to fetch responses for requirement: ${error.message}`
    );
  }

  // Sort responses by supplier name to maintain consistent order
  const sortedData = (data || []).sort((a, b) => {
    const supplierA = Array.isArray(a.supplier) ? a.supplier[0] : a.supplier;
    const supplierB = Array.isArray(b.supplier) ? b.supplier[0] : b.supplier;
    const nameA = supplierA?.name || "";
    const nameB = supplierB?.name || "";
    return nameA.localeCompare(nameB);
  });

  return sortedData as any;
}

/**
 * Fetch all responses for an RFP, optionally filtered by requirement and version
 */
export async function getResponsesForRFP(
  rfpId: string,
  requirementId?: string,
  versionId?: string,
  supplierId?: string
): Promise<
  Array<{
    id: string;
    rfp_id: string;
    requirement_id: string;
    supplier_id: string;
    version_id: string | null;
    response_text: string | null;
    ai_score: number | null;
    ai_comment: string | null;
    manual_score: number | null;
    status: "pending" | "pass" | "partial" | "fail" | "roadmap";
    is_checked: boolean;
    manual_comment: string | null;
    question: string | null;
    last_modified_by: string | null;
    created_at: string;
    updated_at: string;
    supplier: {
      id: string;
      rfp_id: string;
      supplier_id_external: string;
      name: string;
      contact_name: string | null;
      contact_email: string | null;
      contact_phone: string | null;
      created_at: string;
    };
  }>
> {
  const supabase = await createServerClient();

  let query = supabase.from("responses").select(
    `
    id,
    rfp_id,
    requirement_id,
    supplier_id,
    version_id,
    response_text,
    ai_score,
    ai_comment,
    manual_score,
    status,
    is_checked,
    manual_comment,
    question,
    last_modified_by,
    created_at,
    updated_at,
    supplier:suppliers (
      id,
      rfp_id,
      supplier_id_external,
      name,
      contact_name,
      contact_email,
      contact_phone,
      created_at
    )
  `
  );

  query = query.eq("rfp_id", rfpId);

  if (requirementId) {
    query = query.eq("requirement_id", requirementId);
  }

  if (versionId) {
    query = query.eq("version_id", versionId);
  }

  if (supplierId) {
    query = query.eq("supplier_id", supplierId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching responses for RFP:", error);
    throw new Error(`Failed to fetch responses for RFP: ${error.message}`);
  }

  // Sort responses by supplier name to maintain consistent order
  const sortedData = (data || []).sort((a, b) => {
    const supplierA = Array.isArray(a.supplier) ? a.supplier[0] : a.supplier;
    const supplierB = Array.isArray(b.supplier) ? b.supplier[0] : b.supplier;
    const nameA = supplierA?.name || "";
    const nameB = supplierB?.name || "";
    return nameA.localeCompare(nameB);
  });

  return sortedData as any;
}

/**
 * Fetch a single response with supplier details
 */
export async function getResponse(responseId: string): Promise<{
  id: string;
  rfp_id: string;
  requirement_id: string;
  supplier_id: string;
  response_text: string | null;
  ai_score: number | null;
  ai_comment: string | null;
  manual_score: number | null;
  status: "pending" | "pass" | "partial" | "fail" | "roadmap";
  is_checked: boolean;
  manual_comment: string | null;
  question: string | null;
  last_modified_by: string | null;
  created_at: string;
  updated_at: string;
  supplier: {
    id: string;
    rfp_id: string;
    supplier_id_external: string;
    name: string;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    created_at: string;
  };
} | null> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("responses")
    .select(
      `
      id,
      rfp_id,
      requirement_id,
      supplier_id,
      response_text,
      ai_score,
      ai_comment,
      manual_score,
      status,
      is_checked,
      manual_comment,
      question,
      last_modified_by,
      created_at,
      updated_at,
      supplier:suppliers (
        id,
        rfp_id,
        supplier_id_external,
        name,
        contact_name,
        contact_email,
        contact_phone,
        created_at
      )
    `
    )
    .eq("id", responseId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching response:", error);
    throw new Error(`Failed to fetch response: ${error.message}`);
  }

  return (data || null) as any;
}

/**
 * Import responses for an RFP with MERGE logic (optimized for performance)
 * Creates new response records or updates existing ones (UPSERT pattern)
 * Only updates provided fields; preserves existing values for fields not provided
 * Batch operations to avoid Vercel timeout issues
 */
export async function importResponses(
  rfpId: string,
  responses: Array<{
    requirement_id_external: string;
    supplier_id_external: string;
    response_text?: string;
    ai_score?: number;
    ai_comment?: string;
    manual_score?: number;
    manual_comment?: string;
    question?: string;
    status?: string;
    is_checked?: boolean;
  }>
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createServerClient();

  try {
    // Get the active version for this RFP
    const { data: activeVersion, error: versionError } = await supabase
      .from("evaluation_versions")
      .select("id")
      .eq("rfp_id", rfpId)
      .eq("is_active", true)
      .maybeSingle();

    if (versionError || !activeVersion) {
      return {
        success: false,
        count: 0,
        error:
          "No active version found for this RFP. Please create a version first.",
      };
    }

    // Optimize: Fetch ALL requirements and suppliers in bulk (not per-item)
    const { data: allRequirements, error: reqsError } = await supabase
      .from("requirements")
      .select("id, requirement_id_external")
      .eq("rfp_id", rfpId);

    if (reqsError) {
      return {
        success: false,
        count: 0,
        error: `Failed to fetch requirements: ${reqsError.message}`,
      };
    }

    const { data: allSuppliers, error: supsError } = await supabase
      .from("suppliers")
      .select("id, supplier_id_external")
      .eq("rfp_id", rfpId);

    if (supsError) {
      return {
        success: false,
        count: 0,
        error: `Failed to fetch suppliers: ${supsError.message}`,
      };
    }

    // Create lookup maps
    const requirementMap = new Map(
      (allRequirements || []).map((r) => [r.requirement_id_external, r.id])
    );
    const supplierMap = new Map(
      (allSuppliers || []).map((s) => [s.supplier_id_external, s.id])
    );

    // Fetch all existing responses for this RFP and version
    const { data: existingResponses, error: existingError } = await supabase
      .from("responses")
      .select(
        "id, requirement_id, supplier_id, version_id, response_text, ai_score, ai_comment, manual_score, manual_comment, question, status, is_checked"
      )
      .eq("rfp_id", rfpId)
      .eq("version_id", activeVersion.id);

    if (existingError) {
      console.warn(
        `Failed to fetch existing responses: ${existingError.message}`
      );
    }

    // Create map for quick lookups
    const existingResponsesMap = new Map<string, any>();
    if (existingResponses) {
      for (const resp of existingResponses) {
        const key = `${resp.requirement_id}|${resp.supplier_id}|${resp.version_id}`;
        existingResponsesMap.set(key, resp);
      }
    }

    // Separate responses into UPDATE and INSERT operations
    const toUpdate: Array<{ id: string; payload: any }> = [];
    const toInsert: any[] = [];
    let processedCount = 0;

    for (const response of responses) {
      const requirementId = requirementMap.get(
        response.requirement_id_external
      );
      const supplierId = supplierMap.get(response.supplier_id_external);

      if (!requirementId) {
        console.warn(
          `Requirement ${response.requirement_id_external} not found for RFP ${rfpId}`
        );
        continue;
      }

      if (!supplierId) {
        console.warn(
          `Supplier ${response.supplier_id_external} not found for RFP ${rfpId}`
        );
        continue;
      }

      const lookupKey = `${requirementId}|${supplierId}|${activeVersion.id}`;
      const existing = existingResponsesMap.get(lookupKey);

      if (existing) {
        // Build update payload with only provided fields
        const updatePayload: any = {};

        if (response.response_text !== undefined)
          updatePayload.response_text = response.response_text;
        if (response.ai_score !== undefined)
          updatePayload.ai_score = response.ai_score;
        if (response.ai_comment !== undefined)
          updatePayload.ai_comment = response.ai_comment;
        if (response.manual_score !== undefined)
          updatePayload.manual_score = response.manual_score;
        if (response.manual_comment !== undefined)
          updatePayload.manual_comment = response.manual_comment;
        if (response.question !== undefined)
          updatePayload.question = response.question;
        if (response.status !== undefined)
          updatePayload.status = response.status;
        if (response.is_checked !== undefined)
          updatePayload.is_checked = response.is_checked;

        if (Object.keys(updatePayload).length > 0) {
          toUpdate.push({
            id: existing.id,
            payload: updatePayload,
          });
        }
      } else {
        // Build insert payload
        toInsert.push({
          rfp_id: rfpId,
          requirement_id: requirementId,
          supplier_id: supplierId,
          response_text: response.response_text || null,
          ai_score: response.ai_score || null,
          ai_comment: response.ai_comment || null,
          manual_score: response.manual_score || null,
          manual_comment: response.manual_comment || null,
          question: response.question || null,
          status: response.status || "pending",
          is_checked: response.is_checked || false,
          version_id: activeVersion.id,
        });
      }

      processedCount++;
    }

    // Execute batch INSERT
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("responses")
        .insert(toInsert);

      if (insertError) {
        console.warn(`Failed to insert responses: ${insertError.message}`);
      }
    }

    // Execute batch UPDATEs in parallel
    let updateCount = 0;
    if (toUpdate.length > 0) {
      // Process updates in parallel batches to avoid overwhelming Supabase
      const updatePromises = toUpdate.map((update) =>
        supabase
          .from("responses")
          .update(update.payload)
          .eq("id", update.id)
          .then((result) => {
            if (!result.error) updateCount++;
            return result;
          })
      );

      await Promise.all(updatePromises);
    }

    const totalProcessed = toInsert.length + updateCount;

    return { success: true, count: totalProcessed };
  } catch (error) {
    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
