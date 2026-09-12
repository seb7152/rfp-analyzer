import type { AgentTools } from "./tools";
/**
 * Shared types for the analysis agents (007-agents).
 */

export type ReasoningEffort = "none" | "medium" | "high";
export const REASONING_EFFORTS: ReasoningEffort[] = ["none", "medium", "high"];

export type RunStatus = "pending" | "running" | "completed" | "partial" | "failed";
export type BatchStatus = "pending" | "running" | "completed" | "failed";
export type FindingStatus = "proposed" | "accepted" | "rejected" | "obsolete";
export type Verdict = "conforme" | "partiel" | "non_conforme" | "non_repondu" | "hors_sujet";

export const VERDICTS: Verdict[] = ["conforme", "partiel", "non_conforme", "non_repondu", "hors_sujet"];

export const VERDICT_LABEL: Record<Verdict, string> = {
  conforme: "Conforme",
  partiel: "Partiel",
  non_conforme: "Non conforme",
  non_repondu: "Non répondu",
  hors_sujet: "Hors sujet",
};

export interface Agent {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  system_prompt: string;
  model_id: string;
  reasoning_effort: ReasoningEffort;
  /** Tools enabled and their bounds; see lib/agents/tools.ts. */
  tools: AgentTools;
  current_version: number;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentVersion {
  id: string;
  agent_id: string;
  version_number: number;
  system_prompt: string;
  model_id: string;
  reasoning_effort: ReasoningEffort;
  tools: AgentTools;
  created_by: string | null;
  created_at: string;
}

export interface AgentVersionWithMeta extends AgentVersion {
  author_name: string | null;
  /** Analyses that referenced this version. */
  runs: number;
}

export interface AgentListItem extends Agent {
  consultations: number;
  findings_decided: number;
  findings_accepted: number;
}

export interface AgentAssignment {
  id: string;
  rfp_id: string;
  agent_id: string;
  category_id: string;
  created_at: string;
}

export interface FindingQuote {
  text: string;
  verified: boolean;
}

export type FindingEvidence =
  | { type: "calcul"; expression: string; result: string; verified: boolean }
  | { type: "url"; url: string; title: string | null; verified: boolean };

export interface AgentFinding {
  id: string;
  run_id: string;
  response_id: string;
  requirement_id: string;
  verdict: Verdict;
  proposed_score: number;
  justification: string;
  quotes: FindingQuote[];
  questions: string[];
  risks: string[];
  sourced: boolean;
  /** Calculations and web pages the proposal relies on, each verified or not. */
  evidence: FindingEvidence[];
  status: FindingStatus;
  decided_by: string | null;
  decided_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

/** A finding as the evaluation workspace receives it: with its provenance. */
export interface AgentFindingWithAgent extends AgentFinding {
  agent: { id: string; name: string; version_number: number };
  supplier_id: string;
}

export interface AgentRunBatch {
  id: string;
  run_id: string;
  batch_index: number;
  requirement_ids: string[];
  status: BatchStatus;
  attempts: number;
  split_depth: number;
  generation_id: string | null;
  served_model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cost: number;
  error: string | null;
  /** Messages exchanged so far when the batch was checkpointed between two worker rounds. */
  conversation: unknown[] | null;
  turns: number;
  claimed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface AgentRun {
  id: string;
  rfp_id: string;
  version_id: string;
  agent_version_id: string;
  supplier_id: string;
  category_id: string;
  status: RunStatus;
  served_model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cost: number;
  error: string | null;
  launched_by: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

/** Catalogue entry as the model selector needs it. */
export interface CatalogueModel {
  id: string;
  name: string;
  context_length: number;
  max_completion_tokens: number | null;
  /** USD per token, as OpenRouter reports them. */
  prompt_price: number;
  completion_price: number;
  structured_outputs: boolean;
  reasoning: boolean;
  /** Accepts audio content parts: usable for dictation. */
  audio_input: boolean;
  created: number;
}
