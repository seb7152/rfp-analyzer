import {
  useMutation,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { ResponseWithSupplier, GetResponsesResponse } from "./use-responses";
import type { GetAllResponsesResponse } from "./use-all-responses";
import { useOnlineStatus } from "./use-online-status";
import { offlineQueue } from "@/lib/offline-queue";
import { useVersion } from "@/contexts/VersionContext";

export interface UpdateResponseInput {
  responseId: string;
  manual_score?: number | null;
  status?: "pending" | "pass" | "partial" | "fail";
  is_checked?: boolean;
  manual_comment?: string | null;
  question?: string | null;
}

export interface UpdateResponseResponse {
  success: boolean;
  response: ResponseWithSupplier;
}

/**
 * Hook to update a supplier response with optimistic updates
 * Supports manual scoring, status changes, and comments
 * Automatically queues mutations when offline
 */
export function useResponseMutation(): UseMutationResult<
  UpdateResponseResponse,
  Error,
  UpdateResponseInput
> {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const { activeVersion } = useVersion();

  return useMutation({
    mutationFn: async (input: UpdateResponseInput) => {
      const { responseId, ...updateData } = input;

      // Build URL with versionId if available
      let url = `/api/responses/${responseId}`;
      if (activeVersion?.id) {
        url += `?versionId=${activeVersion.id}`;
      }

      // If offline, add to queue and simulate success
      if (!isOnline) {
        offlineQueue.add({
          endpoint: url,
          method: "PUT",
          body: updateData,
          responseId: responseId,
        });

        // Return mock response for optimistic update
        return {
          success: true,
          response: {
            id: responseId,
            ...updateData,
            version_id: activeVersion?.id,
          } as unknown as ResponseWithSupplier,
        };
      }

      // Online: normal behavior
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update response");
      }

      return response.json();
    },

    // Optimistic update: immediately update the UI before the server responds
    onMutate: async (variables) => {
      const { responseId } = variables;

      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ["response", responseId] });
      await queryClient.cancelQueries({ queryKey: ["responses"] });
      await queryClient.cancelQueries({ queryKey: ["all-responses"] });

      // Snapshot the previous value for rollback
      const previousResponse = queryClient.getQueryData<{
        response: ResponseWithSupplier;
      }>(["response", responseId]);

      const previousResponsesLists = queryClient
        .getQueryCache()
        .findAll({ queryKey: ["responses"] })
        .map((query) => ({
          key: query.queryKey,
          data: query.state.data,
        }));

      const previousAllResponsesLists = queryClient
        .getQueryCache()
        .findAll({ queryKey: ["all-responses"] })
        .map((query) => ({
          key: query.queryKey,
          data: query.state.data,
        }));

      // Optimistically update the single response query
      if (previousResponse) {
        queryClient.setQueryData<{ response: ResponseWithSupplier }>(
          ["response", responseId],
          (old) => {
            if (!old) return old;
            return {
              response: {
                ...old.response,
                ...variables,
                version_id: activeVersion?.id || old.response.version_id,
                updated_at: new Date().toISOString(),
              },
            };
          }
        );
      }

      // Optimistically update all responses lists that contain this response
      previousResponsesLists.forEach(({ key }) => {
        queryClient.setQueryData<GetResponsesResponse>(key, (old) => {
          if (!old) return old;

          const updatedResponses = old.responses.map((response) =>
            response.id === responseId
              ? {
                  ...response,
                  manual_score:
                    variables.manual_score !== undefined
                      ? variables.manual_score
                      : response.manual_score,
                  status:
                    variables.status !== undefined
                      ? variables.status
                      : response.status,
                  is_checked:
                    variables.is_checked !== undefined
                      ? variables.is_checked
                      : response.is_checked,
                  manual_comment:
                    variables.manual_comment !== undefined
                      ? variables.manual_comment
                      : response.manual_comment,
                  question:
                    variables.question !== undefined
                      ? variables.question
                      : response.question,
                  updated_at: new Date().toISOString(),
                }
              : response
          );

          // Recalculate meta counts if status changed
          const byStatus = {
            pending: 0,
            pass: 0,
            partial: 0,
            fail: 0,
          };
          updatedResponses.forEach((r) => {
            byStatus[r.status]++;
          });

          return {
            ...old,
            responses: updatedResponses,
            meta: {
              ...old.meta,
              byStatus,
            },
          };
        });
      });

      // Optimistically update "all responses" lists used in supplier view
      previousAllResponsesLists.forEach(({ key }) => {
        queryClient.setQueryData<GetAllResponsesResponse>(key, (old) => {
          if (!old) return old;

          const updatedResponses = old.responses.map((response) =>
            response.id === responseId
              ? {
                  ...response,
                  manual_score:
                    variables.manual_score !== undefined
                      ? variables.manual_score
                      : response.manual_score,
                  status:
                    variables.status !== undefined
                      ? variables.status
                      : response.status,
                  is_checked:
                    variables.is_checked !== undefined
                      ? variables.is_checked
                      : response.is_checked,
                  manual_comment:
                    variables.manual_comment !== undefined
                      ? variables.manual_comment
                      : response.manual_comment,
                  question:
                    variables.question !== undefined
                      ? variables.question
                      : response.question,
                  updated_at: new Date().toISOString(),
                }
              : response
          );

          return {
            ...old,
            responses: updatedResponses,
          };
        });
      });

      // Return context with snapshots for rollback
      return {
        previousResponse,
        previousResponsesLists,
        previousAllResponsesLists,
      };
    },

    // On error, rollback to the previous values
    onError: (err, variables, context) => {
      if (context?.previousResponse) {
        queryClient.setQueryData(
          ["response", variables.responseId],
          context.previousResponse
        );
      }

      if (context?.previousResponsesLists) {
        context.previousResponsesLists.forEach(({ key, data }) => {
          queryClient.setQueryData(key, data);
        });
      }

      if (context?.previousAllResponsesLists) {
        context.previousAllResponsesLists.forEach(({ key, data }) => {
          queryClient.setQueryData(key, data);
        });
      }

      // Show error toast
      toast.error("Erreur lors de l'enregistrement", {
        description: err.message || "Une erreur s'est produite",
      });
    },

    // Always refetch after error or success to ensure consistency
    onSettled: (_data, _error, variables) => {
      // Invalidate and refetch the single response
      queryClient.invalidateQueries({
        queryKey: ["response", variables.responseId],
      });

      // Invalidate all responses lists
      queryClient.invalidateQueries({
        queryKey: ["responses"],
      });

      // Invalidate all-responses list used in single supplier view
      queryClient.invalidateQueries({
        queryKey: ["all-responses"],
      });

      // Invalidate category requirements to update status aggregation
      queryClient.invalidateQueries({
        queryKey: ["category-requirements"],
      });

      // Invalidate RFP completion percentage whenever a response changes
      // This ensures the dashboard header percentage updates in real-time
      queryClient.invalidateQueries({
        queryKey: ["rfp-completion"],
      });
    },
  });
}

/**
 * Convenience hook for updating manual score only
 */
export function useUpdateManualScore() {
  const mutation = useResponseMutation();

  return {
    ...mutation,
    updateScore: (responseId: string, manual_score: number | null) =>
      mutation.mutate({ responseId, manual_score }),
  };
}

/**
 * Convenience hook for updating status only
 */
export function useUpdateResponseStatus() {
  const mutation = useResponseMutation();

  return {
    ...mutation,
    updateStatus: (
      responseId: string,
      status: "pending" | "pass" | "partial" | "fail"
    ) => mutation.mutate({ responseId, status }),
  };
}

/**
 * Convenience hook for checking/unchecking a response
 */
export function useToggleResponseCheck() {
  const mutation = useResponseMutation();

  return {
    ...mutation,
    toggleCheck: (responseId: string, is_checked: boolean) =>
      mutation.mutate({ responseId, is_checked }),
  };
}
