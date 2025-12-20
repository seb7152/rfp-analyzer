"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Hook for fetching RFP completion percentage
 * Returns the percentage of responses marked as checked
 *
 * Note: Automatically refetches when a response is updated via useResponseMutation
 * The mutation hook invalidates rfp-completion cache on every response change
 */
export function useRFPCompletion(
  rfpId: string | null,
  versionId?: string | null
) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["rfp-completion", rfpId, versionId],
    queryFn: async () => {
      if (!rfpId) {
        return null;
      }

      let url = `/api/rfps/${rfpId}/completion`;
      if (versionId) {
        url += `?versionId=${versionId}`;
      }

      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch completion: ${response.statusText}`);
      }

      const data = await response.json();
      return data.percentage as number;
    },
    enabled: !!rfpId,
    staleTime: Infinity, // Never stale - only refetch when explicitly invalidated
  });

  return {
    percentage: data || 0,
    isLoading,
    error,
    refetch,
  };
}
