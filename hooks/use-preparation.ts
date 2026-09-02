"use client";

import { useQuery } from "@tanstack/react-query";

export type PreparationBlockState = "empty" | "partial" | "done";

export interface PreparationSupplier {
  id: string;
  name: string;
  supplier_id_external: string;
  contact_name: string | null;
  contact_email: string | null;
  responsesTotal: number;
  responsesAnswered: number;
  documents: number;
}

export interface PreparationData {
  rfp: {
    id: string;
    title: string;
    description: string | null;
    status: "in_progress" | "completed" | "archived";
    peer_review_enabled: boolean;
    created_at: string;
    updated_at: string;
  };
  userAccessLevel: "owner" | "evaluator" | "viewer" | "admin";
  activeVersion: {
    id: string;
    version_name: string;
    version_number: number;
  } | null;
  specification: {
    state: PreparationBlockState;
    categories: number;
    requirements: number;
    mandatory: number;
    optional: number;
    sourceDocuments: Array<{
      id: string;
      filename: string | null;
      created_at: string;
    }>;
  };
  suppliers: {
    state: PreparationBlockState;
    total: number;
    withContact: number;
    items: PreparationSupplier[];
  };
  responses: {
    state: PreparationBlockState;
    suppliersWithResponses: number;
    requirementsTotal: number;
  };
  weights: {
    state: PreparationBlockState;
    customisedRequirements: number;
  };
  documents: { total: number };
}

export const preparationQueryKey = (rfpId: string, versionId?: string) => [
  "preparation",
  rfpId,
  versionId ?? null,
];

/**
 * State of the four preparation blocks, in a single request.
 */
export function usePreparation(rfpId: string | null, versionId?: string) {
  const { data, isLoading, error, refetch } = useQuery<PreparationData, Error>({
    queryKey: preparationQueryKey(rfpId || "", versionId),
    queryFn: async () => {
      const url = `/api/rfps/${rfpId}/preparation${versionId ? `?versionId=${versionId}` : ""}`;
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        throw new Error("Impossible de charger l'état de préparation");
      }

      return response.json() as Promise<PreparationData>;
    },
    enabled: !!rfpId,
    staleTime: 1000 * 30,
  });

  return { preparation: data ?? null, isLoading, error, refetch };
}
