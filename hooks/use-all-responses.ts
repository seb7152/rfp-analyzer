import { useQuery } from "@tanstack/react-query";
import type { ResponseWithSupplier } from "@/hooks/use-responses";

export interface GetAllResponsesResponse {
  responses: ResponseWithSupplier[];
}

/**
 * Hook to fetch all responses for a specific RFP
 * Note: Supplier filtering should be done in-memory after fetching
 */
export function useAllResponses(rfpId: string, versionId?: string) {
  return useQuery<GetAllResponsesResponse>({
    queryKey: ["all-responses", rfpId, versionId] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (versionId) {
        params.append("versionId", versionId);
      }
      const url = `/api/rfps/${rfpId}/responses${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await fetch(url);

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
