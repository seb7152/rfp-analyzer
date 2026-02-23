"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ResponseThreadWithDetails,
  ThreadCounts,
  ThreadsApiResponse,
  ThreadCommentWithAuthor,
  CommentsApiResponse,
  CreateThreadRequest,
  UpdateThreadRequest,
  CreateCommentRequest,
  ThreadsQueryFilters,
} from "@/types/response-thread";

// ─── Query key factory ──────────────────────────────────────────────────────

export const threadKeys = {
  all: (rfpId: string) => ["response-threads", rfpId] as const,
  filtered: (rfpId: string, filters: ThreadsQueryFilters) =>
    ["response-threads", rfpId, filters] as const,
  detail: (rfpId: string, threadId: string) =>
    ["response-threads", rfpId, threadId] as const,
  comments: (rfpId: string, threadId: string) =>
    ["response-threads", rfpId, threadId, "comments"] as const,
};

// ─── useResponseThreads ─────────────────────────────────────────────────────

interface UseResponseThreadsResult {
  threads: ResponseThreadWithDetails[];
  counts: ThreadCounts;
  isLoading: boolean;
  error: Error | null;
}

export function useResponseThreads(
  rfpId: string | undefined,
  filters?: ThreadsQueryFilters
): UseResponseThreadsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: filters
      ? threadKeys.filtered(rfpId ?? "", filters)
      : threadKeys.all(rfpId ?? ""),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.response_id) params.set("response_id", filters.response_id);
      if (filters?.status) params.set("status", filters.status);
      if (filters?.priority) params.set("priority", filters.priority);
      if (filters?.supplier_id) params.set("supplier_id", filters.supplier_id);
      if (filters?.created_by) params.set("created_by", filters.created_by);

      const qs = params.toString();
      const url = `/api/rfps/${rfpId}/response-threads${qs ? `?${qs}` : ""}`;
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error ?? `Failed to fetch threads: ${response.statusText}`
        );
      }

      return (await response.json()) as ThreadsApiResponse;
    },
    enabled: !!rfpId,
    staleTime: 1000 * 15, // 15 seconds — active discussions
  });

  return {
    threads: data?.threads ?? [],
    counts: data?.counts ?? { total: 0, open: 0, resolved: 0, blocking: 0 },
    isLoading,
    error: error as Error | null,
  };
}

// ─── useResponseThreadsByResponse ───────────────────────────────────────────

export function useResponseThreadsByResponse(
  rfpId: string | undefined,
  responseId: string | undefined
) {
  return useResponseThreads(
    rfpId,
    responseId ? { response_id: responseId } : undefined
  );
}

// ─── useThreadComments ──────────────────────────────────────────────────────

interface UseThreadCommentsResult {
  comments: ThreadCommentWithAuthor[];
  isLoading: boolean;
  error: Error | null;
}

export function useThreadComments(
  rfpId: string | undefined,
  threadId: string | undefined
): UseThreadCommentsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: threadKeys.comments(rfpId ?? "", threadId ?? ""),
    queryFn: async () => {
      const url = `/api/rfps/${rfpId}/response-threads/${threadId}/comments`;
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(
          body.error ?? `Failed to fetch comments: ${response.statusText}`
        );
      }

      return (await response.json()) as CommentsApiResponse;
    },
    enabled: !!rfpId && !!threadId,
    staleTime: 1000 * 15,
  });

  return {
    comments: data?.comments ?? [],
    isLoading,
    error: error as Error | null,
  };
}

// ─── useCreateThread ────────────────────────────────────────────────────────

export function useCreateThread(rfpId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateThreadRequest) => {
      const response = await fetch(`/api/rfps/${rfpId}/response-threads`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create thread");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: threadKeys.all(rfpId ?? ""),
      });
    },
  });
}

// ─── useUpdateThread ────────────────────────────────────────────────────────

export function useUpdateThread(rfpId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      threadId,
      ...body
    }: UpdateThreadRequest & { threadId: string }) => {
      const response = await fetch(
        `/api/rfps/${rfpId}/response-threads/${threadId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to update thread");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: threadKeys.all(rfpId ?? ""),
      });
    },
  });
}

// ─── useCreateComment ───────────────────────────────────────────────────────

export function useCreateComment(
  rfpId: string | undefined,
  threadId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCommentRequest) => {
      const response = await fetch(
        `/api/rfps/${rfpId}/response-threads/${threadId}/comments`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      );

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create comment");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate comments for this thread
      queryClient.invalidateQueries({
        queryKey: threadKeys.comments(rfpId ?? "", threadId ?? ""),
      });
      // Also invalidate thread list (comment_count / last_comment_at changed)
      queryClient.invalidateQueries({
        queryKey: threadKeys.all(rfpId ?? ""),
      });
    },
  });
}

// ─── useUpdateComment ───────────────────────────────────────────────────────

export function useUpdateComment(
  rfpId: string | undefined,
  threadId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: string;
      content: string;
    }) => {
      const response = await fetch(
        `/api/rfps/${rfpId}/response-threads/${threadId}/comments`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment_id: commentId, content }),
        }
      );

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to update comment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: threadKeys.comments(rfpId ?? "", threadId ?? ""),
      });
    },
  });
}

// ─── useDeleteComment ───────────────────────────────────────────────────────

export function useDeleteComment(
  rfpId: string | undefined,
  threadId: string | undefined
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(
        `/api/rfps/${rfpId}/response-threads/${threadId}/comments?commentId=${commentId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error ?? "Failed to delete comment");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: threadKeys.comments(rfpId ?? "", threadId ?? ""),
      });
      queryClient.invalidateQueries({
        queryKey: threadKeys.all(rfpId ?? ""),
      });
    },
  });
}
