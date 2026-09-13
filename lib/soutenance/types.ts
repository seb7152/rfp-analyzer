/**
 * Types of the Soutenances chapter: the séance of a supplier, the point de
 * synthèse of a version, the AI jobs that produce their documents.
 */

import type { TranscriptSegment, VoiceNames } from "@/lib/connectors/granola";
import type { TranscriptCorrection } from "./transcript";

export type TranscriptSource = "granola" | "pasted" | "audio";

export interface TranscriptMeta {
  granola_note_id?: string;
  title?: string | null;
  duration_seconds?: number;
  words?: number;
  voices?: string[];
  imported_at?: string;
  imported_by?: string | null;
}

export interface SoutenanceSessionRow {
  id: string;
  rfp_id: string;
  supplier_id: string;
  scheduled_at: string | null;
  transcript_source: TranscriptSource | null;
  transcript_text: string | null;
  transcript_segments: TranscriptSegment[] | null;
  transcript_meta: TranscriptMeta;
  voice_names: VoiceNames;
  /** Applied in order over transcript_segments; the raw stays intact. */
  transcript_corrections: TranscriptCorrection[];
  transcript_fix_job_id: string | null;
  report_markdown: string | null;
  report_generated_at: string | null;
  report_edited_at: string | null;
  report_job_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Derived from what the séance holds, never stored. */
export type SessionState = "a_preparer" | "preparee" | "tenue" | "exploitee";

export const SESSION_STATE_LABEL: Record<SessionState, string> = {
  a_preparer: "À préparer",
  preparee: "Préparée",
  tenue: "Tenue",
  exploitee: "Exploitée",
};

export type JobKind = "brief" | "synthese" | "soutenance_report" | "glossary" | "transcript_fix";
export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface AiJobRow {
  id: string;
  rfp_id: string;
  kind: JobKind;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  served_model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cost: number;
  error: string | null;
  result: Record<string, unknown> | null;
  created_by: string | null;
  claimed_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SoutenanceBriefRow {
  id: string;
  rfp_id: string;
  supplier_id: string;
  version_id: string | null;
  session_id: string | null;
  status: JobStatus | "processing";
  target_statuses: string[];
  report_markdown: string | null;
  error_message: string | null;
  job_id: string | null;
  model_id: string | null;
  cost: number;
  edited_at: string | null;
  created_at: string;
  completed_at: string | null;
}

/** Statuses a brief can target; "pass_with_question" is a virtual one. */
export const BRIEF_STATUSES = ["partial", "fail", "roadmap", "pass_with_question", "pending"] as const;
export type BriefStatus = (typeof BRIEF_STATUSES)[number];
export const DEFAULT_BRIEF_STATUSES: BriefStatus[] = ["partial", "fail", "roadmap"];

export interface SyntheseItem {
  code: string;
  text: string;
}

export interface SyntheseDomain {
  forces: SyntheseItem[];
  faiblesses: SyntheseItem[];
  questions: SyntheseItem[];
}

export interface SyntheseSupplier {
  /** Per top-level category id. */
  domains: Record<string, SyntheseDomain>;
  generated_at: string | null;
  edited_at: string | null;
  error?: string | null;
}

export interface SyntheseData {
  suppliers: Record<string, SyntheseSupplier>;
}

export interface SoutenanceSyntheseRow {
  id: string;
  rfp_id: string;
  version_id: string;
  status: "pending" | "running" | "completed" | "partial" | "failed";
  data: SyntheseData;
  model_id: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  error: string | null;
  generated_at: string | null;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** A term of the consultation's vocabulary, with the forms a transcription mistakes it for. */
export interface GlossaryTerm {
  term: string;
  aliases: string[];
  /** What it is: fournisseur, produit, sigle, client… free, short. */
  note: string;
  source: "agent" | "manual";
}

export interface RfpGlossaryRow {
  rfp_id: string;
  terms: GlossaryTerm[];
  job_id: string | null;
  generated_at: string | null;
  generated_by: string | null;
  model_id: string | null;
  cost: number;
  error: string | null;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}
