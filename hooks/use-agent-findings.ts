"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AgentFindingWithAgent } from "@/lib/agents/types";
import { offlineQueue } from "@/lib/offline-queue";
import { useOnlineStatus } from "@/hooks/use-online-status";

export const findingKeys = {
  byRequirement: (rfpId: string, requirementId: string, versionId: string | null) =>
    ["agent-findings", rfpId, requirementId, versionId] as const,
};

/** The agents' proposals on one requirement, newest first. */
export function useAgentFindings(rfpId: string, requirementId: string | null, versionId: string | null) {
  return useQuery<{ findings: AgentFindingWithAgent[] }, Error>({
    queryKey: findingKeys.byRequirement(rfpId, requirementId ?? "", versionId),
    queryFn: async () => {
      const params = new URLSearchParams({ requirementId: requirementId! });
      if (versionId) params.set("versionId", versionId);
      const res = await fetch(`/api/rfps/${rfpId}/agents/findings?${params}`, { credentials: "include" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Les propositions n'ont pas pu être chargées.");
      }
      return res.json();
    },
    enabled: !!rfpId && !!requirementId,
    staleTime: 30_000,
  });
}

export interface DecisionInput {
  findingId: string;
  responseId: string;
  requirementId: string;
  action: "accept" | "reject";
  reason?: string;
}

/**
 * Accept or reject a proposal. Offline, the decision joins the mutation
 * queue and is replayed when the network is back, like a score.
 */
export function useFindingDecision(rfpId: string, versionId: string | null) {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  return useMutation<void, Error, DecisionInput>({
    networkMode: "always",
    mutationFn: async (input) => {
      const endpoint = `/api/rfps/${rfpId}/agents/findings/${input.findingId}/decision`;
      const body = input.action === "accept" ? { action: "accept" } : { action: "reject", reason: input.reason };
      if (!isOnline) {
        offlineQueue.add({ endpoint, method: "POST", body, responseId: input.responseId });
        return;
      }
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "La décision n'a pas été enregistrée.");
      }
    },
    onMutate: async (input) => {
      const key = findingKeys.byRequirement(rfpId, input.requirementId, versionId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<{ findings: AgentFindingWithAgent[] }>(key);
      queryClient.setQueryData<{ findings: AgentFindingWithAgent[] }>(key, (old) =>
        old
          ? {
              findings: old.findings.map((f) =>
                f.id === input.findingId
                  ? { ...f, status: input.action === "accept" ? "accepted" : "rejected", decided_at: new Date().toISOString(), rejection_reason: input.reason ?? null }
                  : f
              ),
            }
          : old
      );
      return { previous, key };
    },
    onError: (err, _input, context) => {
      const ctx = context as { previous?: { findings: AgentFindingWithAgent[] }; key?: readonly unknown[] } | undefined;
      if (ctx?.key && ctx.previous) queryClient.setQueryData(ctx.key, ctx.previous);
      toast.error("La décision n'a pas été enregistrée.", { description: err.message });
    },
    onSettled: (_data, _err, input) => {
      queryClient.invalidateQueries({ queryKey: findingKeys.byRequirement(rfpId, input.requirementId, versionId) });
      if (input.action === "accept") {
        queryClient.invalidateQueries({ queryKey: ["responses"] });
        queryClient.invalidateQueries({ queryKey: ["responses-light"] });
        queryClient.invalidateQueries({ queryKey: ["response-threads", rfpId] });
        queryClient.invalidateQueries({ queryKey: ["peer-review"] });
      }
      queryClient.invalidateQueries({ queryKey: ["agent-runs", rfpId] });
    },
  });
}
