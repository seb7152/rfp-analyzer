"use client";

import { useQuery } from "@tanstack/react-query";

/** A response without its texts: enough to filter, count and score. */
export interface ResponseLight {
  id: string;
  rfp_id: string;
  requirement_id: string;
  supplier_id: string;
  version_id: string | null;
  ai_score: number | null;
  manual_score: number | null;
  status: "pending" | "pass" | "partial" | "fail" | "roadmap";
  is_checked: boolean;
  last_modified_by: string | null;
  updated_at: string;
  has_ai_comment: boolean;
  has_manual_comment: boolean;
  has_question: boolean;
  supplier: {
    id: string;
    supplier_id_external: string;
    name: string;
  };
}

export interface ResponsesLightResult {
  responses: ResponseLight[];
  meta: {
    total: number;
    byStatus: Record<"pending" | "pass" | "partial" | "fail" | "roadmap", number>;
  };
}

export const responsesLightKey = (rfpId: string, versionId?: string) =>
  ["responses-light", rfpId, versionId ?? null] as const;

export function useResponsesLight(
  rfpId: string | null,
  versionId?: string,
  options?: { enabled?: boolean; refetchInterval?: number | false }
) {
  return useQuery<ResponsesLightResult, Error>({
    queryKey: responsesLightKey(rfpId ?? "", versionId),
    queryFn: async () => {
      const params = new URLSearchParams({ fields: "light" });
      if (versionId) params.set("versionId", versionId);
      const res = await fetch(`/api/rfps/${rfpId}/responses?${params}`);
      if (!res.ok) throw new Error("Les réponses n'ont pas pu être chargées.");
      return res.json();
    },
    enabled: !!rfpId && (options?.enabled ?? true),
    staleTime: 60_000,
    refetchInterval: options?.refetchInterval ?? false,
  });
}

/** Final score of a response: the manual score when one exists, else the AI's. */
export function finalScore(r: { manual_score: number | null; ai_score: number | null }) {
  return r.manual_score ?? r.ai_score ?? null;
}
