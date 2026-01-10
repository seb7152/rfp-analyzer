"use client";

import { useQuery } from "@tanstack/react-query";
import type { RFP } from "@/lib/supabase/types";
import { useOrganization } from "./use-organization";

export function useRFPs() {
  const { currentOrgId } = useOrganization();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["rfps", currentOrgId],
    queryFn: async () => {
      if (!currentOrgId) {
        return [];
      }

      const response = await fetch(`/api/organizations/${currentOrgId}/rfps`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch RFPs: ${response.statusText}`);
      }

      const data = await response.json();
      return data.rfps as RFP[];
    },
    enabled: !!currentOrgId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    rfps: data || [],
    isLoading,
    error,
    refetch,
  };
}
