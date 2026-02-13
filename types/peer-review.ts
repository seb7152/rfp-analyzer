export type PeerReviewStatus = "draft" | "submitted" | "approved" | "rejected";

export interface RequirementReviewStatus {
  id: string;
  requirement_id: string;
  version_id: string;
  status: PeerReviewStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateReviewStatusRequest {
  status: Exclude<PeerReviewStatus, "draft">;
  version_id: string;
  rejection_comment?: string;
}
