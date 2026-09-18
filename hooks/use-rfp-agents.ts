"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AgentRun, AgentRunBatch } from "@/lib/agents/types";
import type { LaunchEstimate } from "@/lib/agents/plan";

export const rfpAgentKeys = {
  assignments: (rfpId: string) => ["agent-assignments", rfpId] as const,
  estimate: (rfpId: string) => ["agent-estimate", rfpId] as const,
  runs: (rfpId: string, versionId: string | null) => ["agent-runs", rfpId, versionId] as const,
};

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? fallback;
}

export interface DomainNode {
  id: string;
  code: string;
  title: string;
  level: number;
  parent_id: string | null;
  leaves: number;
}

export interface AssignmentWithAgent {
  id: string;
  agent_id: string;
  category_id: string;
  created_at: string;
  agents: { id: string; name: string; model_id: string; current_version: number; archived_at: string | null } | null;
}

export interface AssignmentsData {
  access: "owner" | "evaluator" | "viewer" | "admin";
  domains: DomainNode[];
  assignments: AssignmentWithAgent[];
  coverage: { covered: number; total: number };
}

export function useAgentAssignments(rfpId: string | null) {
  return useQuery<AssignmentsData, Error>({
    queryKey: rfpAgentKeys.assignments(rfpId ?? ""),
    queryFn: async () => {
      const res = await fetch(`/api/rfps/${rfpId}/agents/assignments`, { credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "Les affectations n'ont pas pu être chargées."));
      return res.json();
    },
    enabled: !!rfpId,
    staleTime: 30_000,
  });
}

export function useAssignAgent(rfpId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { agent_id: string; category_id: string }>({
    mutationFn: async (input) => {
      const res = await fetch(`/api/rfps/${rfpId}/agents/assignments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readError(res, "L'affectation a été refusée."));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rfpAgentKeys.assignments(rfpId) });
      queryClient.invalidateQueries({ queryKey: rfpAgentKeys.estimate(rfpId) });
    },
  });
}

export function useUnassignAgent(rfpId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { assignmentId: string }>({
    mutationFn: async ({ assignmentId }) => {
      const res = await fetch(`/api/rfps/${rfpId}/agents/assignments/${assignmentId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "L'affectation n'a pas pu être retirée."));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: rfpAgentKeys.assignments(rfpId) });
      queryClient.invalidateQueries({ queryKey: rfpAgentKeys.estimate(rfpId) });
    },
  });
}

export type EstimateData = LaunchEstimate & {
  version: { id: string; version_number: number; version_name: string };
  catalogueAvailable: boolean;
};

export function useLaunchEstimate(rfpId: string | null, enabled = true) {
  return useQuery<EstimateData, Error>({
    queryKey: rfpAgentKeys.estimate(rfpId ?? ""),
    queryFn: async () => {
      const res = await fetch(`/api/rfps/${rfpId}/agents/estimate`, { credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "L'estimation n'a pas pu être calculée."));
      return res.json();
    },
    enabled: !!rfpId && enabled,
    staleTime: 30_000,
  });
}

export interface RunWithDetails extends AgentRun {
  agent_versions: { id: string; version_number: number; model_id: string; agents: { id: string; name: string } | null } | null;
  suppliers: { id: string; name: string } | null;
  categories: { id: string; code: string; title: string } | null;
  agent_run_batches: AgentRunBatch[];
  findings: { produced: number; unsourced: number };
}

export interface AgentSummary {
  agent_id: string;
  agent_name: string;
  produced: number;
  unsourced: number;
  accepted: number;
  rejected: number;
  proposed: number;
}

export interface RunsData {
  access: "owner" | "evaluator" | "viewer" | "admin";
  versionId: string | null;
  runs: RunWithDetails[];
  summary: AgentSummary[];
}

export function isRunActive(r: Pick<AgentRun, "status">) {
  return r.status === "pending" || r.status === "running";
}

/** The analyses of the active version, refreshed every 5 s while one runs. */
export function useAgentRuns(rfpId: string | null, versionId: string | null) {
  return useQuery<RunsData, Error>({
    queryKey: rfpAgentKeys.runs(rfpId ?? "", versionId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (versionId) params.set("versionId", versionId);
      const res = await fetch(`/api/rfps/${rfpId}/agents/runs?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "L'avancement n'a pas pu être chargé."));
      return res.json();
    },
    enabled: !!rfpId,
    staleTime: 3_000,
    refetchInterval: (data) => (data?.runs.some(isRunActive) ? 5_000 : false),
  });
}

export function useLaunchRuns(rfpId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ runIds: string[] }, Error, void>({
    mutationFn: async () => {
      const res = await fetch(`/api/rfps/${rfpId}/agents/runs`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "Le lancement a échoué."));
      return res.json();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-runs", rfpId] });
      queryClient.invalidateQueries({ queryKey: ["agent-findings", rfpId] });
    },
  });
}

export function useRetryBatch(rfpId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { runId: string; batchId: string }>({
    mutationFn: async ({ runId, batchId }) => {
      const res = await fetch(`/api/rfps/${rfpId}/agents/runs/${runId}/batches/${batchId}/retry`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error(await readError(res, "Le lot n'a pas pu être relancé."));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["agent-runs", rfpId] }),
  });
}
