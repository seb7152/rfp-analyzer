"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FinancialOfferVersion, FinancialOfferValue } from "@/types/financial";

export function useSuppliers(rfpId: string, versionId?: string) {
  return useQuery({
    queryKey: ["suppliers", rfpId, versionId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (versionId) {
        params.append("versionId", versionId);
      }

      const response = await fetch(
        `/api/rfps/${rfpId}/suppliers?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch suppliers");
      }
      const data = await response.json();
      return data.suppliers as { id: string; name: string }[];
    },
    enabled: !!rfpId,
  });
}

export function useFinancialVersions(rfpId: string) {
  return useQuery({
    queryKey: ["financial-versions", rfpId],
    queryFn: async () => {
      const response = await fetch(
        `/api/rfps/${rfpId}/financial-offer-versions`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch versions");
      }
      const data = await response.json();
      return data.versions as (FinancialOfferVersion & {
        supplier: { id: string; name: string };
      })[];
    },
    enabled: !!rfpId,
  });
}

export function useFinancialValues(
  rfpId: string,
  mode: "comparison" | "supplier" = "comparison",
  supplierId?: string
) {
  return useQuery({
    queryKey: ["financial-values", rfpId, mode, supplierId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("mode", mode);
      if (supplierId) {
        params.set("supplierId", supplierId);
      }

      const response = await fetch(
        `/api/rfps/${rfpId}/financial-values?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch values");
      }
      return (await response.json()) as FinancialOfferValue[];
    },
    enabled: !!rfpId,
  });
}

export function useCreateFinancialVersion(rfpId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      supplierId,
      versionName,
      versionDate,
    }: {
      supplierId: string;
      versionName?: string;
      versionDate?: string;
    }) => {
      const response = await fetch(
        `/api/rfps/${rfpId}/financial-offer-versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplier_id: supplierId,
            version_name: versionName,
            version_date: versionDate,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create version");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["financial-versions", rfpId],
      });
    },
  });
}

export function useBatchUpdateFinancialValues() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      versionId,
      values,
    }: {
      versionId: string;
      values: Partial<FinancialOfferValue>[];
    }) => {
      const response = await fetch(`/api/financial-offer-values/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_id: versionId, values }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to batch update values");
      }
      return await response.json();
    },
    onSuccess: () => {
      // Invalidate values
      queryClient.invalidateQueries({ queryKey: ["financial-values"] });
      // Invalidate summary
      queryClient.invalidateQueries({ queryKey: ["financial-summary"] });
    },
  });
}

export function useFinancialSummary(
  rfpId: string,
  versionIds: string[],
  tcoPeriod: number
) {
  return useQuery({
    queryKey: ["financial-summary", rfpId, { versionIds, tcoPeriod }],
    queryFn: async () => {
      if (versionIds.length === 0) return [];

      const params = new URLSearchParams();
      params.set("tcoPeriod", tcoPeriod.toString());
      params.set("versionIds", versionIds.join(","));

      const response = await fetch(
        `/api/rfps/${rfpId}/financial-summary?${params.toString()}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }
      const data = await response.json();
      return data.summary as import("@/types/financial-grid").FinancialSummaryData[];
    },
    enabled: !!rfpId && versionIds.length > 0,
  });
}
