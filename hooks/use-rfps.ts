"use client";

import { useQuery } from "@tanstack/react-query";
import type { RFP } from "@/lib/supabase/types";

export function useRFPs(organizationId: string | null) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["rfps", organizationId],
    queryFn: async () => {
      if (!organizationId) {
        return [];
      }

      const response = await fetch(
        `/api/organizations/${organizationId}/rfps`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch RFPs: ${response.statusText}`);
      }

      const data = await response.json();
      return data.rfps as RFP[];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    rfps: data || [],
    isLoading,
    error,
    refetch,
  };
}
