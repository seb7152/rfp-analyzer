/**
 * Response and Response evaluation type definitions
 */

export interface Response {
  id: string;
  rfp_id: string;
  requirement_id: string;
  supplier_id: string;
  response_text: string | null;
  ai_score: number | null;
  ai_comment: string | null;
  manual_score: number | null;
  status: ResponseStatus;
  is_checked: boolean;
  manual_comment: string | null;
  question: string | null;
  last_modified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResponseUpdate {
  manual_score?: number | null;
  status?: ResponseStatus;
  is_checked?: boolean;
  manual_comment?: string | null;
  question?: string | null;
}

export interface ResponseAudit {
  id: string;
  response_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  modified_by: string;
  modified_at: string;
}

export interface ResponseWithDetails extends Response {
  supplier?: {
    id: string;
    name: string;
    supplier_id_external: string;
  };
  requirement?: {
    id: string;
    title: string;
    requirement_id_external: string;
  };
  modifier?: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

export interface ResponseComparisonView extends Response {
  supplier_name: string;
  supplier_id_external: string;
  final_score: number | null;
  score_source: "manual" | "ai" | null;
}

export interface ResponseStats {
  total_count: number;
  checked_count: number;
  unchecked_count: number;
  by_status: {
    pending: number;
    pass: number;
    partial: number;
    fail: number;
    roadmap: number;
  };
  by_score: {
    no_score: number;
    with_ai_score: number;
    with_manual_score: number;
  };
  completion_percentage: number;
}

export type ResponseStatus =
  | "pending"
  | "pass"
  | "partial"
  | "fail"
  | "roadmap";
export type ScoreSource = "manual" | "ai" | null;
