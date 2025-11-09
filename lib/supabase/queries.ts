import { createClient as createServerClient } from "./server";
import type { Requirement, RequirementWithChildren } from "./types";

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
      parent_id,
      level,
      weight,
      position_in_pdf,
      pdf_url,
      created_at,
      updated_at,
      created_by
    `,
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
 * Fetch a single requirement with all its details
 */
export async function getRequirement(
  requirementId: string,
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
      parent_id,
      level,
      weight,
      position_in_pdf,
      pdf_url,
      created_at,
      updated_at,
      created_by
    `,
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
  requirementId: string,
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
  parentId: string,
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
      pdf_url,
      created_at,
      updated_at,
      created_by
    `,
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
export function buildHierarchy(
  requirements: Requirement[],
): RequirementWithChildren[] {
  const map = new Map<string, RequirementWithChildren>();
  const roots: RequirementWithChildren[] = [];

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
  function sortChildren(node: RequirementWithChildren): void {
    if (node.children) {
      node.children.sort((a, b) =>
        a.requirement_id_external.localeCompare(b.requirement_id_external),
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
  level: 1 | 2 | 3 | 4,
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
      pdf_url,
      created_at,
      updated_at,
      created_by
    `,
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
  query: string,
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
      pdf_url,
      created_at,
      updated_at,
      created_by
    `,
    )
    .eq("rfp_id", rfpId)
    .or(
      `requirement_id_external.ilike.${searchQuery},title.ilike.${searchQuery}`,
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
  userId: string,
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
          },
        )
        .select("id")
        .single();

      if (error) {
        throw new Error(
          `Failed to upsert category ${category.id}: ${error.message}`,
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

/**
 * Import requirements for an RFP
 * Uses UPSERT to replace existing requirements with the same rfp_id and requirement_id_external
 * Links requirements to existing categories by name
 */
export async function importRequirements(
  rfpId: string,
  requirements: Array<{
    id: string;
    code?: string;
    title: string;
    description?: string;
    weight: number;
    category_name: string;
    order?: number;
  }>,
  userId: string,
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createServerClient();

  try {
    // First, fetch all categories to map names to IDs
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, title")
      .eq("rfp_id", rfpId);

    if (catError) {
      throw new Error(`Failed to fetch categories: ${catError.message}`);
    }

    const categoryNameToId = new Map(
      (categories || []).map((c) => [c.title, c.id]),
    );

    // Auto-increment order for requirements without explicit order
    let currentOrder = 1;
    let upsertedCount = 0;

    for (const req of requirements) {
      const categoryId = categoryNameToId.get(req.category_name);

      if (!categoryId) {
        console.warn(
          `Skipping requirement ${req.code}: category "${req.category_name}" not found`,
        );
        continue;
      }

      // Use explicit order if provided, otherwise auto-increment
      const displayOrder = req.order !== undefined ? req.order : currentOrder;

      const { error } = await supabase.from("requirements").upsert(
        [
          {
            rfp_id: rfpId,
            requirement_id_external: req.code,
            title: req.title,
            description: req.description || null,
            weight: req.weight,
            category_id: categoryId,
            level: 4, // Requirements are always level 4
            display_order: displayOrder,
            created_by: userId,
          },
        ],
        {
          onConflict: "rfp_id,requirement_id_external",
        },
      );

      if (error) {
        console.warn(
          `Failed to upsert requirement ${req.code}: ${error.message}`,
        );
        continue;
      }

      upsertedCount++;

      // Only increment if using auto-increment
      if (req.order === undefined) {
        currentOrder++;
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
  }>,
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
          `Failed to insert supplier ${supplier.id}: ${error.message}`,
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
): Promise<number> {
  const supabase = await createServerClient();

  // Get all responses for leaf requirements only (level 4)
  const { data, error } = await supabase
    .from("responses")
    .select("id, is_checked, requirement_id")
    .eq("rfp_id", rfpId);

  if (error) {
    console.error("Error fetching responses for completion:", error);
    throw new Error(
      `Failed to fetch responses for completion: ${error.message}`,
    );
  }

  const responses = (data || []) as Array<{
    id: string;
    is_checked: boolean;
    requirement_id: string;
  }>;

  // Get all requirements to identify leaf nodes (requirements without children)
  const { data: requirements, error: reqError } = await supabase
    .from("requirements")
    .select("id, parent_id")
    .eq("rfp_id", rfpId);

  if (reqError) {
    console.error("Error fetching requirements:", reqError);
    throw new Error(
      `Failed to fetch requirements for completion: ${reqError.message}`,
    );
  }

  const allRequirements = (requirements || []) as Array<{
    id: string;
    parent_id: string | null;
  }>;

  // Identify leaf requirements (those that are not parents of other requirements)
  const parentIds = new Set(
    allRequirements.filter((r) => r.parent_id !== null).map((r) => r.parent_id),
  );

  const leafReqIds = new Set(
    allRequirements.filter((r) => !parentIds.has(r.id)).map((r) => r.id),
  );

  // Debug logging
  console.log(`[Completion] RFP ${rfpId}:`);
  console.log(`  Total responses: ${responses.length}`);
  console.log(`  Total requirements: ${allRequirements.length}`);
  console.log(`  Leaf requirements: ${leafReqIds.size}`);
  console.log(`  Parent IDs: ${parentIds.size}`);

  // Filter responses to only those for leaf requirements
  const leafResponses = responses.filter((r) =>
    leafReqIds.has(r.requirement_id),
  );

  console.log(`  Leaf responses: ${leafResponses.length}`);
  console.log(
    `  Checked responses: ${leafResponses.filter((r) => r.is_checked).length}`,
  );

  const total = leafResponses.length;

  if (total === 0) {
    console.log(`  Result: 0% (no responses for leaf requirements)`);
    return 0; // No responses = 0% complete
  }

  const checked = leafResponses.filter((r) => r.is_checked).length;
  const percentage = Math.round((checked / total) * 100);

  console.log(`  Result: ${percentage}%`);
  return percentage;
}

/**
 * Fetch all responses for a specific requirement with supplier information
 * Includes supplier details joined with response data
 */
export async function getResponsesForRequirement(
  requirementId: string,
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
    status: "pending" | "pass" | "partial" | "fail";
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
    `,
    )
    .eq("requirement_id", requirementId);

  if (error) {
    console.error("Error fetching responses for requirement:", error);
    throw new Error(
      `Failed to fetch responses for requirement: ${error.message}`,
    );
  }

  return data || [];
}

/**
 * Fetch all responses for an RFP, optionally filtered by requirement
 */
export async function getResponsesForRFP(
  rfpId: string,
  requirementId?: string,
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
    status: "pending" | "pass" | "partial" | "fail";
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
  `,
  );

  query = query.eq("rfp_id", rfpId);

  if (requirementId) {
    query = query.eq("requirement_id", requirementId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching responses for RFP:", error);
    throw new Error(`Failed to fetch responses for RFP: ${error.message}`);
  }

  return data || [];
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
  status: "pending" | "pass" | "partial" | "fail";
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
    `,
    )
    .eq("id", responseId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching response:", error);
    throw new Error(`Failed to fetch response: ${error.message}`);
  }

  return data || null;
}

/**
 * Import responses for an RFP
 * Creates response records linking requirements to suppliers with AI analysis
 */
export async function importResponses(
  rfpId: string,
  responses: Array<{
    requirement_id_external: string;
    supplier_id_external: string;
    response_text: string;
    ai_score?: number;
    ai_comment?: string;
  }>,
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createServerClient();

  try {
    let insertedCount = 0;

    for (const response of responses) {
      // Get the requirement ID from external ID
      const { data: requirement, error: reqError } = await supabase
        .from("requirements")
        .select("id")
        .eq("rfp_id", rfpId)
        .eq("requirement_id_external", response.requirement_id_external)
        .maybeSingle();

      if (reqError || !requirement) {
        console.warn(
          `Requirement ${response.requirement_id_external} not found for RFP ${rfpId}`,
        );
        continue;
      }

      // Get the supplier ID from external ID
      const { data: supplier, error: supError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("rfp_id", rfpId)
        .eq("supplier_id_external", response.supplier_id_external)
        .maybeSingle();

      if (supError || !supplier) {
        console.warn(
          `Supplier ${response.supplier_id_external} not found for RFP ${rfpId}`,
        );
        continue;
      }

      // Insert the response
      const { error: insertError } = await supabase.from("responses").insert([
        {
          rfp_id: rfpId,
          requirement_id: requirement.id,
          supplier_id: supplier.id,
          response_text: response.response_text,
          ai_score: response.ai_score || null,
          ai_comment: response.ai_comment || null,
          status: "pending",
          is_checked: false,
        },
      ]);

      if (insertError) {
        console.warn(`Failed to insert response: ${insertError.message}`);
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
