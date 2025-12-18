import { useQuery } from "@tanstack/react-query";
import type { ResponseWithSupplier } from "@/hooks/use-responses";

export interface GetAllResponsesResponse {
  responses: ResponseWithSupplier[];
}

/**
 * Hook to fetch all responses for a specific RFP
 * Note: Supplier filtering should be done in-memory after fetching
 */
export function useAllResponses(rfpId: string) {
  return useQuery<GetAllResponsesResponse>({
    queryKey: ["all-responses", rfpId] as const,
    queryFn: async () => {
      const response = await fetch(`/api/rfps/${rfpId}/responses`);

      if (!response.ok) {
        throw new Error("Failed to fetch all responses");
      }

      return await response.json();
    },
    enabled: !!rfpId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  } as any);
}
