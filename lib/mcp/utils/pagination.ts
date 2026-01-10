/**
 * MCP Pagination Utility
 * Standardized pagination for all MCP tools
 * Enforces limits and provides metadata for list operations
 */

import { z } from "zod";

/**
 * Pagination constraints
 */
export const PAGINATION_CONSTRAINTS = {
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_LIMIT: 50,
  MIN_OFFSET: 0,
  DEFAULT_OFFSET: 0,
} as const;

/**
 * Zod schema for pagination parameters
 */
export const PaginationParamsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(PAGINATION_CONSTRAINTS.MIN_LIMIT, "Limit must be at least 1")
    .max(PAGINATION_CONSTRAINTS.MAX_LIMIT, "Limit must be at most 100")
    .default(PAGINATION_CONSTRAINTS.DEFAULT_LIMIT),
  offset: z
    .number()
    .int()
    .min(PAGINATION_CONSTRAINTS.MIN_OFFSET, "Offset must be non-negative")
    .default(PAGINATION_CONSTRAINTS.DEFAULT_OFFSET),
});

export type PaginationParams = z.infer<typeof PaginationParamsSchema>;

/**
 * Pagination metadata for responses
 */
export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  _meta: PaginationMeta;
}

/**
 * Validates and normalizes pagination parameters
 */
export function validatePaginationParams(
  limit?: number,
  offset?: number
): PaginationParams {
  const params = PaginationParamsSchema.safeParse({ limit, offset });
  if (!params.success) {
    // Return defaults if validation fails
    return {
      limit: PAGINATION_CONSTRAINTS.DEFAULT_LIMIT,
      offset: PAGINATION_CONSTRAINTS.DEFAULT_OFFSET,
    };
  }
  return params.data;
}

/**
 * Creates pagination metadata for a list response
 */
export function createPaginationMeta(
  limit: number,
  offset: number,
  total: number
): PaginationMeta {
  const hasMore = offset + limit < total;
  return {
    limit,
    offset,
    total,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
  };
}

/**
 * Creates a paginated response wrapper
 */
export function createPaginatedResponse<T>(
  items: T[],
  limit: number,
  offset: number,
  total: number
): PaginatedResponse<T> {
  return {
    items,
    _meta: createPaginationMeta(limit, offset, total),
  };
}

/**
 * Helper to paginate a local array (for mock data)
 */
export function paginateArray<T>(
  array: T[],
  limit: number,
  offset: number
): PaginatedResponse<T> {
  const total = array.length;
  const items = array.slice(offset, offset + limit);
  return createPaginatedResponse(items, limit, offset, total);
}

/**
 * Convert string parameters to pagination params (for query strings)
 */
export function parsePaginationFromQuery(
  limitStr?: string | string[],
  offsetStr?: string | string[]
): PaginationParams {
  let limit: number | undefined;
  let offset: number | undefined;

  // Handle arrays (shouldn't happen in query params, but be defensive)
  if (Array.isArray(limitStr)) {
    limitStr = limitStr[0];
  }
  if (Array.isArray(offsetStr)) {
    offsetStr = offsetStr[0];
  }

  // Parse strings to numbers
  if (limitStr) {
    const parsed = parseInt(limitStr, 10);
    if (!isNaN(parsed)) {
      limit = parsed;
    }
  }

  if (offsetStr) {
    const parsed = parseInt(offsetStr, 10);
    if (!isNaN(parsed)) {
      offset = parsed;
    }
  }

  return validatePaginationParams(limit, offset);
}
