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
 * Inserts categories maintaining the parent-child hierarchy
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
  }>,
  userId: string,
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createServerClient();

  // Map external IDs to database IDs
  const idMapping: Record<string, string> = {};

  try {
    // Sort categories by level to ensure parents are created first
    const sorted = [...categories].sort((a, b) => a.level - b.level);

    for (const category of sorted) {
      let parentId: string | null = null;

      if (category.parent_id && idMapping[category.parent_id]) {
        parentId = idMapping[category.parent_id];
      }

      const { data, error } = await supabase
        .from("categories")
        .insert([
          {
            rfp_id: rfpId,
            code: category.code,
            title: category.title,
            short_name: category.short_name,
            level: category.level,
            parent_id: parentId,
            created_by: userId,
          },
        ])
        .select("id")
        .single();

      if (error) {
        throw new Error(
          `Failed to insert category ${category.id}: ${error.message}`,
        );
      }

      idMapping[category.id] = data.id;
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

    let insertedCount = 0;

    for (const req of requirements) {
      const categoryId = categoryNameToId.get(req.category_name);

      if (!categoryId) {
        console.warn(
          `Skipping requirement ${req.id}: category "${req.category_name}" not found`,
        );
        continue;
      }

      const { error } = await supabase.from("requirements").insert([
        {
          rfp_id: rfpId,
          requirement_id_external: req.id,
          title: req.title,
          description: req.description || null,
          weight: req.weight,
          category_id: categoryId,
          level: 4, // Requirements are always level 4
          created_by: userId,
        },
      ]);

      if (error) {
        console.warn(
          `Failed to insert requirement ${req.id}: ${error.message}`,
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
