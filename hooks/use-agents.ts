"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Agent, AgentListItem, AgentVersionWithMeta, CatalogueModel, ReasoningEffort } from "@/lib/agents/types";

export const agentKeys = {
  list: (organizationId: string) => ["agents", organizationId] as const,
  detail: (agentId: string) => ["agent", agentId] as const,
  catalogue: ["agent-models"] as const,
};

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? fallback;
}

export function useAgents(organizationId: string | null) {
  return useQuery<{ agents: AgentListItem[]; role: "admin" | "evaluator" | "viewer"; defaultModelId: string }, Error>({
    queryKey: agentKeys.list(organizationId ?? ""),
    queryFn: async () => {
      const res = await fetch(`/api/agents?organizationId=${organizationId}`, { credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "Les agents n'ont pas pu être chargés."));
      return res.json();
    },
    enabled: !!organizationId,
    staleTime: 30_000,
  });
}

export function useAgent(agentId: string | null) {
  return useQuery<{ agent: Agent; versions: AgentVersionWithMeta[]; role: "admin" | "evaluator" | "viewer" | null }, Error>({
    queryKey: agentKeys.detail(agentId ?? ""),
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}`, { credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "L'agent n'a pas pu être chargé."));
      return res.json();
    },
    enabled: !!agentId,
    staleTime: 30_000,
  });
}

/** The OpenRouter catalogue; an error carries the message to show. */
export function useCatalogue() {
  return useQuery<{ models: CatalogueModel[]; defaultModelId: string }, Error>({
    queryKey: agentKeys.catalogue,
    queryFn: async () => {
      const res = await fetch("/api/agents/models", { credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "Le catalogue OpenRouter est indisponible."));
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
}

export interface AgentInput {
  name: string;
  description: string;
  system_prompt: string;
  model_id: string;
  reasoning_effort: ReasoningEffort;
}

export function useSaveAgent(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ agent: Agent; versioned?: boolean }, Error, { agentId: string | null; input: Partial<AgentInput> & { archived?: boolean } }>({
    mutationFn: async ({ agentId, input }) => {
      const res = agentId
        ? await fetch(`/api/agents/${agentId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          })
        : await fetch("/api/agents", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ organization_id: organizationId, ...input }),
          });
      if (!res.ok) throw new Error(await readError(res, "L'agent n'a pas pu être enregistré."));
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: agentKeys.list(organizationId) });
      queryClient.invalidateQueries({ queryKey: agentKeys.detail(data.agent.id) });
    },
  });
}

/** A draft of the system prompt from the name and short description; nothing is saved. */
export function useDraftPrompt(organizationId: string) {
  return useMutation<{ prompt: string; model: string | null; cost: number }, Error, { name: string; description: string; currentPrompt?: string }>({
    mutationFn: async ({ name, description, currentPrompt }) => {
      const res = await fetch("/api/agents/draft-prompt", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization_id: organizationId, name, description, current_prompt: currentPrompt || undefined }),
      });
      if (!res.ok) throw new Error(await readError(res, "La proposition n'a pas pu être générée."));
      return res.json();
    },
  });
}
