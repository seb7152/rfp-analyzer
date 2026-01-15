import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FinancialCommentWithAuthor,
  CreateFinancialCommentInput,
  UpdateFinancialCommentInput,
} from "@/types/financial";

export function useFinancialComments(
  lineId: string,
  versionId?: string | null
) {
  return useQuery({
    queryKey: ["financial-comments", lineId, versionId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("lineId", lineId);
      if (versionId) {
        params.set("versionId", versionId);
      }

      const response = await fetch(
        `/api/financial-comments?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const data = await response.json();
      return data.comments as FinancialCommentWithAuthor[];
    },
    enabled: !!lineId,
    staleTime: 30000, // 30 seconds
  });
}

export function useCreateFinancialComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFinancialCommentInput) => {
      const response = await fetch("/api/financial-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create comment");
      }

      return response.json();
    },
    onSuccess: (data, input) => {
      // Invalidate and refetch comments for this line/version
      queryClient.invalidateQueries({
        queryKey: ["financial-comments", input.template_line_id, input.version_id],
      });
    },
  });
}

export function useUpdateFinancialComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      input,
    }: {
      commentId: string;
      input: UpdateFinancialCommentInput;
    }) => {
      const response = await fetch(`/api/financial-comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update comment");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Invalidate all comments queries
      queryClient.invalidateQueries({
        queryKey: ["financial-comments"],
      });
    },
  });
}

export function useDeleteFinancialComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (commentId: string) => {
      const response = await fetch(`/api/financial-comments/${commentId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete comment");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all comments queries
      queryClient.invalidateQueries({
        queryKey: ["financial-comments"],
      });
    },
  });
}
