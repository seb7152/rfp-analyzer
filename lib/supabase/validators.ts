/**
 * Validators for import JSON formats
 */

import type {
  ImportCategoriesRequest,
  ImportRequirementsRequest,
  ImportCategoryPayload,
  ImportRequirementPayload,
} from "./types";

// ============================================================================
// CATEGORY VALIDATORS
// ============================================================================

export function validateCategoryPayload(
  category: unknown
): category is ImportCategoryPayload {
  if (!category || typeof category !== "object") return false;

  const cat = category as Record<string, unknown>;

  return (
    typeof cat.id === "string" &&
    cat.id.trim().length > 0 &&
    typeof cat.code === "string" &&
    cat.code.trim().length > 0 &&
    typeof cat.title === "string" &&
    cat.title.trim().length > 0 &&
    typeof cat.short_name === "string" &&
    cat.short_name.trim().length > 0 &&
    typeof cat.level === "number" &&
    cat.level >= 1 &&
    cat.level <= 4 &&
    (cat.parent_id === undefined ||
      cat.parent_id === null ||
      typeof cat.parent_id === "string")
  );
}

export function validateCategoriesRequest(
  data: unknown
): data is ImportCategoriesRequest {
  if (!data || typeof data !== "object") return false;

  const req = data as Record<string, unknown>;

  // Accept either direct array or wrapped in categories object
  const categoriesArray = Array.isArray(req)
    ? (req as unknown[])
    : Array.isArray(req.categories)
      ? req.categories
      : null;

  return (
    categoriesArray !== null && categoriesArray.every(validateCategoryPayload)
  );
}

export function validateCategoriesJSON(jsonString: string): {
  valid: boolean;
  data?: ImportCategoriesRequest;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);

    // Normalize to { categories: [...] } format
    const normalizedData: ImportCategoriesRequest = Array.isArray(data)
      ? { categories: data }
      : data;

    if (!validateCategoriesRequest(normalizedData)) {
      return {
        valid: false,
        error:
          "Invalid categories format. Check required fields: id, code, title, short_name, level, optional parent_id",
      };
    }

    // Additional validation: check parent_id references
    const categoryIds = new Set(normalizedData.categories.map((c) => c.id));

    for (const category of normalizedData.categories) {
      if (category.parent_id && !categoryIds.has(category.parent_id)) {
        return {
          valid: false,
          error: `Category "${category.id}" references non-existent parent "${category.parent_id}"`,
        };
      }

      // Check level constraints
      if (category.level === 1 && category.parent_id) {
        return {
          valid: false,
          error: `Category "${category.id}" (level 1) cannot have a parent`,
        };
      }

      if (category.level > 1 && !category.parent_id) {
        return {
          valid: false,
          error: `Category "${category.id}" (level ${category.level}) must have a parent`,
        };
      }
    }

    return { valid: true, data: normalizedData };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

// ============================================================================
// REQUIREMENT VALIDATORS
// ============================================================================

export function validateRequirementPayload(
  requirement: unknown
): requirement is ImportRequirementPayload {
  if (!requirement || typeof requirement !== "object") return false;

  const req = requirement as Record<string, unknown>;

  return (
    (req.id === undefined ||
      (typeof req.id === "string" && req.id.trim().length > 0)) &&
    typeof req.code === "string" &&
    req.code.trim().length > 0 &&
    typeof req.title === "string" &&
    req.title.trim().length > 0 &&
    typeof req.description === "string" &&
    req.description.trim().length > 0 &&
    typeof req.weight === "number" &&
    req.weight >= 0 &&
    req.weight <= 1 &&
    typeof req.category_name === "string" &&
    req.category_name.trim().length > 0 &&
    (req.is_mandatory === undefined || typeof req.is_mandatory === "boolean") &&
    (req.is_optional === undefined || typeof req.is_optional === "boolean") &&
    (req.page_number === undefined ||
      (typeof req.page_number === "number" && req.page_number > 0)) &&
    (req.rf_document_id === undefined ||
      (typeof req.rf_document_id === "string" &&
        req.rf_document_id.trim().length > 0))
  );
}

export function validateSupplierPayload(supplier: unknown): boolean {
  if (!supplier || typeof supplier !== "object") return false;

  const supp = supplier as Record<string, unknown>;

  return (
    typeof supp.id === "string" &&
    supp.id.trim().length > 0 &&
    typeof supp.name === "string" &&
    supp.name.trim().length > 0 &&
    (supp.contact_name === undefined ||
      typeof supp.contact_name === "string") &&
    (supp.contact_email === undefined ||
      typeof supp.contact_email === "string") &&
    (supp.contact_phone === undefined || typeof supp.contact_phone === "string")
  );
}

export function validateRequirementsRequest(
  data: unknown
): data is ImportRequirementsRequest {
  if (!data || typeof data !== "object") return false;

  const req = data as Record<string, unknown>;

  // Accept either direct array or wrapped in requirements object
  const requirementsArray = Array.isArray(req)
    ? (req as unknown[])
    : Array.isArray(req.requirements)
      ? req.requirements
      : null;

  const hasValidRequirements =
    requirementsArray !== null &&
    requirementsArray.every(validateRequirementPayload);

  const hasValidSuppliers =
    req.suppliers === undefined ||
    (Array.isArray(req.suppliers) &&
      req.suppliers.every(validateSupplierPayload));

  return hasValidRequirements && hasValidSuppliers;
}

export function validateRequirementsJSON(
  jsonString: string,
  availableCategories: string[],
  availableCategoryCodes?: string[]
): {
  valid: boolean;
  data?: ImportRequirementsRequest;
  error?: string;
} {
  try {
    const data = JSON.parse(jsonString);

    // Normalize to { requirements: [...] } format
    const normalizedData: ImportRequirementsRequest = Array.isArray(data)
      ? { requirements: data }
      : data;

    if (!validateRequirementsRequest(normalizedData)) {
      return {
        valid: false,
        error:
          "Invalid requirements format. Check required fields: code, title, description, weight (0-1), category_name. Optional: id, is_mandatory, is_optional, page_number, rf_document_id",
      };
    }

    // Check that all referenced categories exist (by title or code)
    const categorySet = new Set(availableCategories);
    const categoryCodeSet = new Set(availableCategoryCodes || []);

    for (const requirement of normalizedData.requirements) {
      const categoryExists =
        categorySet.has(requirement.category_name) ||
        categoryCodeSet.has(requirement.category_name);

      if (!categoryExists) {
        return {
          valid: false,
          error: `Requirement "${requirement.code}" references non-existent category "${requirement.category_name}"`,
        };
      }
    }

    return { valid: true, data: normalizedData };
  } catch (error) {
    return {
      valid: false,
      error: `Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
