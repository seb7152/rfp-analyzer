import { useQuery } from "@tanstack/react-query";
import type { ResponseWithSupplier } from "@/hooks/use-responses";

export interface GetAllResponsesResponse {
  responses: ResponseWithSupplier[];
}

/**
 * Hook to fetch all responses for a specific RFP and optionally filter by supplier
 */
export function useAllResponses(rfpId: string, supplierId?: string) {
  return useQuery<GetAllResponsesResponse>({
    queryKey: ["all-responses", rfpId, supplierId] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (supplierId) {
        params.append("supplierId", supplierId);
      }

      const response = await fetch(
        `/api/rfps/${rfpId}/responses${params.toString() ? "?" + params.toString() : ""}`
      );

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
