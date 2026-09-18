"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GlossaryTerm, RfpGlossaryRow } from "@/lib/soutenance/types";

export interface GlossaryState {
  glossary: RfpGlossaryRow | null;
  job: { id: string; status: string; error: string | null; cost: number; completed_at: string | null } | null;
}

export const glossaryKey = (rfpId: string) => ["glossary", rfpId] as const;

async function call<T>(url: string, init?: RequestInit, fallback = "La requête a échoué."): Promise<T> {
  const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? fallback);
  }
  return res.json() as Promise<T>;
}

export function glossaryBusy(g: GlossaryState | undefined): boolean {
  return g?.job?.status === "pending" || g?.job?.status === "running";
}

/** The consultation's vocabulary, polled while its extraction runs. */
export function useGlossary(rfpId: string | null) {
  return useQuery<GlossaryState, Error>({
    queryKey: glossaryKey(rfpId ?? ""),
    queryFn: () => call<GlossaryState>(`/api/rfps/${rfpId}/glossary`, undefined, "Le vocabulaire n'a pas pu être chargé."),
    enabled: !!rfpId,
    refetchInterval: (data) => (glossaryBusy(data) ? 4_000 : false),
  });
}

export function useGlossaryMutations(rfpId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: glossaryKey(rfpId) });
  return {
    generate: useMutation<{ jobId: string }, Error>({
      mutationFn: () => call(`/api/rfps/${rfpId}/glossary`, { method: "POST" }, "L'extraction n'a pas pu être lancée."),
      onSettled: invalidate,
    }),
    save: useMutation<GlossaryState, Error, GlossaryTerm[]>({
      mutationFn: (terms) => call(`/api/rfps/${rfpId}/glossary`, { method: "PUT", body: JSON.stringify({ terms }) }, "Le vocabulaire n'a pas été enregistré."),
      onSuccess: (data) => queryClient.setQueryData(glossaryKey(rfpId), data),
      onSettled: invalidate,
    }),
  };
}
