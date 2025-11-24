import { useQuery, UseQueryResult } from "@tanstack/react-query";

export interface ResponseWithSupplier {
  id: string;
  rfp_id: string;
  requirement_id: string;
  supplier_id: string;
  response_text: string | null;
  ai_score: number | null;
  ai_comment: string | null;
  manual_score: number | null;
  status: "pending" | "pass" | "partial" | "fail";
  is_checked: boolean;
  manual_comment: string | null;
  question: string | null;
  last_modified_by: string | null;
  created_at: string;
  updated_at: string;
  supplier: {
    id: string;
    rfp_id: string;
    supplier_id_external: string;
    name: string;
    contact_name: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    created_at: string;
    has_documents?: boolean;
  };
}

export interface GetResponsesResponse {
  responses: ResponseWithSupplier[];
  meta: {
    total: number;
    byStatus: {
      pending: number;
      pass: number;
      partial: number;
      fail: number;
    };
  };
}

/**
 * Hook to fetch all responses for a specific RFP
 * Optionally filters by requirement ID
 */
export function useResponses(rfpId: string, requirementId?: string) {
  return useQuery<GetResponsesResponse>({
    queryKey: ["responses", rfpId, requirementId] as const,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (requirementId) {
        params.append("requirementId", requirementId);
      }

      const response = await fetch(
        `/api/rfps/${rfpId}/responses?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch responses");
      }

      return await response.json();
    },
    enabled: !!rfpId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  } as any);
}

/**
 * Hook to fetch all responses for a specific requirement
 */
export function useRequirementResponses(
  rfpId: string,
  requirementId: string
): UseQueryResult<GetResponsesResponse> {
  return useResponses(rfpId, requirementId);
}

/**
 * Hook to fetch a single response by ID
 */
export function useResponse(responseId: string) {
  return useQuery<{ response: ResponseWithSupplier }>({
    queryKey: ["response", responseId] as const,
    queryFn: async () => {
      const response = await fetch(`/api/responses/${responseId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch response");
      }

      return await response.json();
    },
    enabled: !!responseId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
  } as any);
}
