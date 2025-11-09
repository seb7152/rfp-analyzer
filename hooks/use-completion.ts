"use client";

import { useQuery } from "@tanstack/react-query";

/**
 * Hook for fetching RFP completion percentage
 * Returns the percentage of responses marked as checked
 */
export function useRFPCompletion(rfpId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["rfp-completion", rfpId],
    queryFn: async () => {
      if (!rfpId) {
        return null;
      }

      const response = await fetch(`/api/rfps/${rfpId}/completion`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch completion: ${response.statusText}`);
      }

      const data = await response.json();
      return data.percentage as number;
    },
    enabled: !!rfpId,
    staleTime: 1000 * 60, // 1 minute
    refetchInterval: 5000, // Refetch every 5 seconds to keep updated
  });

  return {
    percentage: data || 0,
    isLoading,
    error,
    refetch,
  };
}
