"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export type SoutenanceStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface SoutenanceBrief {
  id: string;
  supplier_id: string;
  status: SoutenanceStatus;
  report_markdown: string | null;
  target_statuses: string[];
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
}

interface GenerateBriefParams {
  supplierId: string;
  versionId?: string;
  targetStatuses?: string[];
}

const soutenanceKeys = {
  latest: (rfpId: string, supplierId?: string) =>
    ["soutenance", rfpId, "latest", supplierId] as const,
};

/**
 * Fetches the latest soutenance brief for a given RFP and optionally a supplier.
 */
export function useLatestSoutenanceBriefs(rfpId: string, supplierId?: string) {
  return useQuery({
    queryKey: soutenanceKeys.latest(rfpId, supplierId),
    queryFn: async (): Promise<SoutenanceBrief[]> => {
      const url = new URL(
        `/api/rfps/${rfpId}/soutenance`,
        window.location.origin
      );
      if (supplierId) {
        url.searchParams.set("supplierId", supplierId);
      }

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error("Failed to fetch soutenance briefs");
      }

      const data = await response.json();
      return data.briefs ?? [];
    },
    staleTime: 5000,
    enabled: !!rfpId,
  });
}

/**
 * Mutation to generate a new soutenance brief for a supplier.
 */
export function useGenerateSoutenanceBrief(rfpId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      supplierId,
      versionId,
      targetStatuses,
    }: GenerateBriefParams) => {
      const response = await fetch(`/api/rfps/${rfpId}/soutenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, versionId, targetStatuses }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to generate soutenance brief");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: soutenanceKeys.latest(rfpId, variables.supplierId),
      });
      queryClient.invalidateQueries({
        queryKey: soutenanceKeys.latest(rfpId),
      });
    },
  });
}

/**
 * Mutation to update the report markdown of a soutenance brief (manual editing).
 */
export function useUpdateSoutenanceBriefReport(rfpId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      briefId,
      report,
    }: {
      briefId: string;
      report: string;
    }) => {
      const response = await fetch(
        `/api/rfps/${rfpId}/soutenance/${briefId}/report`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ report }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Failed to update brief report");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["soutenance", rfpId],
      });
    },
  });
}
