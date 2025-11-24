"use client";

import { useQuery } from "@tanstack/react-query";
import type {
  Requirement,
  RequirementWithChildren,
} from "@/lib/supabase/types";

export interface TreeNode {
  id: string;
  type: "category" | "requirement";
  code: string;
  title: string;
  level: number;
  children?: TreeNode[];
}

/**
 * Hook for fetching combined tree structure (categories + requirements)
 * Returns hierarchical tree with categories as parent nodes
 */
export function useRequirementsTree(rfpId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["requirements-tree", rfpId],
    queryFn: async () => {
      if (!rfpId) {
        return [];
      }

      const response = await fetch(`/api/rfps/${rfpId}/tree`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tree: ${response.statusText}`);
      }

      return response.json() as Promise<TreeNode[]>;
    },
    enabled: !!rfpId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    tree: data || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching and managing requirements data with React Query
 * Handles caching, loading states, and error handling automatically
 */
export function useRequirements(rfpId: string | null, search?: string) {
  const queryKey = search
    ? ["requirements", rfpId, "search", search]
    : ["requirements", rfpId];

  const { data, isLoading, error, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!rfpId) {
        return [];
      }

      const url = new URL(
        `/api/rfps/${rfpId}/requirements`,
        window.location.origin
      );

      if (search) {
        url.searchParams.set("search", search);
      }

      const response = await fetch(url.toString(), {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch requirements: ${response.statusText}`);
      }

      return response.json() as Promise<RequirementWithChildren[]>;
    },
    enabled: !!rfpId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    requirements: data || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook for fetching a single requirement with breadcrumb
 */
export function useRequirement(requirementId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["requirement", requirementId],
    queryFn: async () => {
      if (!requirementId) {
        return null;
      }

      const response = await fetch(
        `/api/requirements/${requirementId}?includeBreadcrumb=true`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch requirement: ${response.statusText}`);
      }

      return response.json() as Promise<
        Requirement & { breadcrumb: Requirement[] }
      >;
    },
    enabled: !!requirementId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    requirement: data || null,
    breadcrumb: data?.breadcrumb || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Utility to flatten a hierarchical tree for easier iteration
 */
export function flattenRequirementTree(
  requirements: RequirementWithChildren[]
): Requirement[] {
  const result: Requirement[] = [];

  function traverse(nodes: RequirementWithChildren[]) {
    for (const node of nodes) {
      const { children, ...requirement } = node;
      result.push(requirement as Requirement);
      if (children && children.length > 0) {
        traverse(children);
      }
    }
  }

  traverse(requirements);
  return result;
}

/**
 * Hook for fetching requirements for a specific category with their status
 */
export function useCategoryRequirements(
  rfpId: string | null,
  categoryId: string | null
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["category-requirements", rfpId, categoryId],
    queryFn: async () => {
      if (!rfpId || !categoryId) {
        return [];
      }

      const response = await fetch(
        `/api/rfps/${rfpId}/categories/${categoryId}/requirements`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch category requirements: ${response.statusText}`
        );
      }

      return response.json() as Promise<
        Array<{
          id: string;
          requirement_id_external: string;
          title: string;
          description: string | null;
          status: "pass" | "partial" | "fail" | "pending";
        }>
      >;
    },
    enabled: !!rfpId && !!categoryId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    requirements: data || [],
    isLoading,
    error,
    refetch,
  };
}

/**
 * Utility to search within a hierarchical tree
 * Returns matching nodes while preserving parent hierarchy
 */
export function searchRequirementTree(
  requirements: RequirementWithChildren[],
  query: string
): RequirementWithChildren[] {
  if (!query || query.trim().length === 0) {
    return requirements;
  }

  const lowerQuery = query.toLowerCase();

  function traverse(
    nodes: RequirementWithChildren[]
  ): RequirementWithChildren[] {
    return nodes.reduce<RequirementWithChildren[]>((acc, node) => {
      const matches =
        node.requirement_id_external.toLowerCase().includes(lowerQuery) ||
        node.title.toLowerCase().includes(lowerQuery);

      const childrenResults = node.children ? traverse(node.children) : [];

      // Include node if it matches or has matching children
      if (matches || childrenResults.length > 0) {
        acc.push({
          ...node,
          children:
            childrenResults.length > 0 ? childrenResults : node.children,
        });
      }

      return acc;
    }, []);
  }

  return traverse(requirements);
}
