"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ConnectorKeyInfo } from "@/lib/connectors/keys";
import type { GranolaSettings } from "@/lib/connectors/granola-settings";

export interface GranolaStatus {
  organization: ConnectorKeyInfo | null;
  personal: ConnectorKeyInfo | null;
  env_fallback: boolean;
  settings: GranolaSettings;
  role: "admin" | "evaluator" | "viewer";
}

const key = (organizationId: string) => ["connectors", "granola", organizationId] as const;

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? fallback;
}

export function useGranolaConnector(organizationId: string | null) {
  return useQuery<GranolaStatus, Error>({
    queryKey: key(organizationId ?? ""),
    queryFn: async () => {
      const res = await fetch(`/api/connectors/granola?organizationId=${organizationId}`, { credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "Le connecteur n'a pas pu être lu."));
      return res.json();
    },
    enabled: !!organizationId,
    staleTime: 30_000,
  });
}

export function useGranolaMutations(organizationId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key(organizationId) });
  return {
    saveKey: useMutation<unknown, Error, { scope: "organization" | "personal"; key: string }>({
      mutationFn: async (input) => {
        const res = await fetch("/api/connectors/granola", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId, ...input }),
        });
        if (!res.ok) throw new Error(await readError(res, "La clé n'a pas pu être enregistrée."));
        return res.json();
      },
      onSettled: invalidate,
    }),
    removeKey: useMutation<unknown, Error, { scope: "organization" | "personal" }>({
      mutationFn: async ({ scope }) => {
        const res = await fetch(`/api/connectors/granola?organizationId=${organizationId}&scope=${scope}`, { method: "DELETE", credentials: "include" });
        if (!res.ok) throw new Error(await readError(res, "La clé n'a pas pu être retirée."));
        return res.json();
      },
      onSettled: invalidate,
    }),
    saveSettings: useMutation<unknown, Error, GranolaSettings>({
      mutationFn: async (settings) => {
        const res = await fetch("/api/connectors/granola/settings", {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId, ...settings }),
        });
        if (!res.ok) throw new Error(await readError(res, "Les réglages n'ont pas pu être enregistrés."));
        return res.json();
      },
      onSettled: invalidate,
    }),
  };
}
