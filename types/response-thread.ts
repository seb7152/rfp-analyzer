/**
 * Response thread and comment type definitions
 * Feature: 005-response-comments
 */

export type ThreadStatus = "open" | "resolved";
export type ThreadPriority = "normal" | "important" | "blocking";

// ─── Thread ─────────────────────────────────────────────────────────────────

export interface ResponseThread {
  id: string;
  response_id: string;
  title: string | null;
  status: ThreadStatus;
  priority: ThreadPriority;
  created_by: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResponseThreadWithDetails extends ResponseThread {
  creator: { email: string; display_name: string | null };
  resolver: { email: string; display_name: string | null } | null;
  comment_count: number;
  last_comment_at: string | null;
  // Denormalized for global view
  requirement_title?: string;
  requirement_id_external?: string;
  requirement_id?: string;
  supplier_name?: string;
  supplier_id?: string;
}

export interface ThreadCounts {
  total: number;
  open: number;
  resolved: number;
  blocking: number;
}

// ─── Comment ────────────────────────────────────────────────────────────────

export interface ThreadComment {
  id: string;
  thread_id: string;
  content: string;
  author_id: string;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreadCommentWithAuthor extends ThreadComment {
  author: {
    email: string;
    display_name: string | null;
  };
}

// ─── API Requests ───────────────────────────────────────────────────────────

export interface CreateThreadRequest {
  response_id: string;
  title?: string;
  priority?: ThreadPriority;
  content: string; // First comment
}

export interface UpdateThreadRequest {
  status?: ThreadStatus;
  priority?: ThreadPriority;
  title?: string;
}

export interface CreateCommentRequest {
  content: string;
}

export interface UpdateCommentRequest {
  content: string;
}

// ─── API Responses ──────────────────────────────────────────────────────────

export interface ThreadsApiResponse {
  threads: ResponseThreadWithDetails[];
  counts: ThreadCounts;
}

export interface ThreadApiResponse {
  thread: ResponseThreadWithDetails;
}

export interface CommentsApiResponse {
  comments: ThreadCommentWithAuthor[];
}

// ─── Query Filters ──────────────────────────────────────────────────────────

export interface ThreadsQueryFilters {
  response_id?: string;
  status?: ThreadStatus;
  priority?: ThreadPriority;
  supplier_id?: string;
  created_by?: string;
}
