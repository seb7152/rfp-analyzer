"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  RequirementReviewStatus,
  UpdateReviewStatusRequest,
} from "@/types/peer-review";

// ─── Query key factory ──────────────────────────────────────────────────────

export const peerReviewKeys = {
  statuses: (rfpId: string, versionId: string) =>
    ["peer-review", "statuses", rfpId, versionId] as const,
};

// ─── usePeerReviewStatuses ──────────────────────────────────────────────────

interface UsePeerReviewStatusesResult {
  statuses: Map<string, RequirementReviewStatus>;
  isLoading: boolean;
  error: Error | null;
}

export function usePeerReviewStatuses(
  rfpId: string | undefined,
  versionId: string | undefined
): UsePeerReviewStatusesResult {
  const { data, isLoading, error } = useQuery({
    queryKey: peerReviewKeys.statuses(rfpId ?? "", versionId ?? ""),
    queryFn: async () => {
      const url = `/api/rfps/${rfpId}/review-statuses?versionId=${versionId}`;
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error ??
            `Failed to fetch review statuses: ${response.statusText}`
        );
      }

      const json = await response.json();
      return json.statuses as RequirementReviewStatus[];
    },
    enabled: !!rfpId && !!versionId,
    staleTime: 1000 * 30, // 30 seconds — statuses change frequently during reviews
  });

  const statuses = new Map<string, RequirementReviewStatus>(
    (data ?? []).map((s) => [s.requirement_id, s])
  );

  return { statuses, isLoading, error: error as Error | null };
}

// ─── usePeerReviewMutation ──────────────────────────────────────────────────

interface PeerReviewMutationInput extends UpdateReviewStatusRequest {
  requirementId: string;
}

interface UsePeerReviewMutationOptions {
  rfpId: string;
  versionId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function usePeerReviewMutation({
  rfpId,
  versionId,
  onSuccess,
  onError,
}: UsePeerReviewMutationOptions) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requirementId, ...body }: PeerReviewMutationInput) => {
      const url = `/api/rfps/${rfpId}/requirements/${requirementId}/review-status`;
      const response = await fetch(url, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(
          json.error ?? `Failed to update review status: ${response.statusText}`
        );
      }

      const json = await response.json();
      return json.review_status as RequirementReviewStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: peerReviewKeys.statuses(rfpId, versionId),
      });
      onSuccess?.();
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });
}
