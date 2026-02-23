"use client";

import { useState, type MouseEvent } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreadPriorityBadge } from "./ThreadPriorityBadge";
import { CommentItem } from "./CommentItem";
import { CommentInput } from "./CommentInput";
import {
  useThreadComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
} from "@/hooks/use-response-threads";
import type { ResponseThreadWithDetails } from "@/types/response-thread";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface ThreadCardProps {
  thread: ResponseThreadWithDetails;
  rfpId: string;
  currentUserId: string;
  onResolve: (threadId: string) => void;
  onReopen: (threadId: string) => void;
  defaultExpanded?: boolean;
  /** Show requirement + supplier context (for global view) */
  showContext?: boolean;
  onNavigateToThread?: (requirementId: string, responseId: string) => void;
}

export function ThreadCard({
  thread,
  rfpId,
  currentUserId,
  onResolve,
  onReopen,
  defaultExpanded = false,
  showContext = false,
  onNavigateToThread,
}: ThreadCardProps) {
  const [isExpanded, setIsExpanded] = useState(
    defaultExpanded || thread.status === "open"
  );
  const isResolved = thread.status === "resolved";

  // Comments — only fetched when expanded
  const {
    comments,
    isLoading: commentsLoading,
    error: commentsError,
  } = useThreadComments(rfpId, isExpanded ? thread.id : undefined);

  const { mutate: createComment, isPending: isCreating } = useCreateComment(
    rfpId,
    thread.id
  );
  const { mutate: updateComment, isPending: isUpdating } = useUpdateComment(
    rfpId,
    thread.id
  );
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteComment(
    rfpId,
    thread.id
  );

  const handleAddComment = (content: string) => {
    createComment({ content });
  };

  const handleEditComment = (commentId: string, content: string) => {
    updateComment({ commentId, content });
  };

  const handleDeleteComment = (commentId: string) => {
    deleteComment(commentId);
  };

  const handleNavigateToRequirement = (event: MouseEvent) => {
    event.stopPropagation();
    if (!onNavigateToThread || !thread.requirement_id) return;
    onNavigateToThread(thread.requirement_id, thread.response_id);
  };

  return (
    <div
      className={`border rounded-lg transition-colors ${
        isResolved
          ? "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30"
          : thread.priority === "blocking"
            ? "border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/20"
            : thread.priority === "important"
              ? "border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/20"
              : "border-gray-200 dark:border-gray-700"
      }`}
    >
      {/* Header — always visible */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-2 p-3 text-left hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-t-lg transition-colors cursor-pointer"
      >
        <span className="mt-0.5 text-gray-400 shrink-0">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ThreadPriorityBadge priority={thread.priority} size="sm" />
            {isResolved && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-full px-2 py-0.5">
                <CheckCircle2 size={10} />
                Résolu
              </span>
            )}
          </div>

          {thread.title && (
            <p
              className={`text-sm font-medium mt-1 ${isResolved ? "text-gray-500 line-through" : "text-gray-800 dark:text-gray-200"}`}
            >
              {thread.title}
            </p>
          )}

          {/* Context line for global view */}
          {showContext && (
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>
                {thread.requirement_id_external} · {thread.supplier_name}
              </span>
              {onNavigateToThread && thread.requirement_id && (
                <button
                  type="button"
                  onClick={handleNavigateToRequirement}
                  className="text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Voir l'exigence
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <span>
              {thread.comment_count}{" "}
              {thread.comment_count === 1 ? "message" : "messages"}
            </span>
            <span>·</span>
            <span>{thread.creator?.display_name || thread.creator?.email}</span>
            <span>·</span>
            <span>
              {formatDistanceToNow(new Date(thread.created_at), {
                addSuffix: false,
                locale: fr,
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Comments */}
          <div className="max-h-64 overflow-y-auto">
            {commentsLoading ? (
              <div className="p-3 text-xs text-gray-400 text-center">
                Chargement...
              </div>
            ) : commentsError ? (
              <div className="p-3 text-xs text-red-500 text-center">
                Impossible de charger la conversation.
              </div>
            ) : comments.length === 0 ? (
              <div className="p-3 text-xs text-gray-400 text-center">
                Aucun message
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {comments.map((comment) => (
                  <CommentItem
                    key={comment.id}
                    comment={comment}
                    currentUserId={currentUserId}
                    onEdit={handleEditComment}
                    onDelete={handleDeleteComment}
                    isUpdating={isUpdating}
                    isDeleting={isDeleting}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Reply input + actions */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
            {!isResolved && (
              <CommentInput
                onSubmit={handleAddComment}
                isPending={isCreating}
              />
            )}

            <div className="flex justify-end">
              {isResolved ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onReopen(thread.id)}
                  className="text-xs"
                >
                  <RotateCcw size={12} className="mr-1" />
                  Rouvrir
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResolve(thread.id)}
                  className="text-xs text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 border-green-200 dark:border-green-800"
                >
                  <CheckCircle2 size={12} className="mr-1" />
                  Marquer comme résolu
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
