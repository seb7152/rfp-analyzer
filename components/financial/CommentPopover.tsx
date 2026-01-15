"use client";

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MessageCircle, Trash2, Edit2, Plus } from "lucide-react";
import { useFinancialComments, useCreateFinancialComment, useUpdateFinancialComment, useDeleteFinancialComment } from "@/hooks/use-financial-comments";
import { FinancialCommentWithAuthor } from "@/types/financial";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface CommentPopoverProps {
  lineId: string;
  versionId?: string | null;
  currentUserId: string;
}

export function CommentPopover({
  lineId,
  versionId,
  currentUserId,
}: CommentPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Data fetching
  const { data: commentsData, error } = useFinancialComments(
    lineId,
    versionId
  );
  const comments: FinancialCommentWithAuthor[] = commentsData || [];

  // Mutations
  const { mutate: createComment, isPending: isCreating } =
    useCreateFinancialComment();
  const { mutate: updateComment, isPending: isUpdating } =
    useUpdateFinancialComment();
  const { mutate: deleteComment, isPending: isDeleting } =
    useDeleteFinancialComment();

  // Has comments indicator
  const hasComments = comments.length > 0;

  // Event handlers
  const handleCreateComment = () => {
    if (!newComment.trim()) return;

    createComment(
      {
        template_line_id: lineId,
        version_id: versionId || null,
        comment: newComment,
      },
      {
        onSuccess: () => {
          setNewComment("");
        },
      }
    );
  };

  const handleStartEdit = (comment: FinancialCommentWithAuthor) => {
    setEditingId(comment.id);
    setEditingText(comment.comment);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingText.trim()) return;

    updateComment(
      {
        commentId: editingId,
        input: { comment: editingText },
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditingText("");
        },
      }
    );
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce commentaire ?")) {
      deleteComment(commentId);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center justify-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${
            hasComments
              ? "text-blue-500"
              : "text-gray-400 dark:text-gray-600"
          }`}
          title={hasComments ? "Commentaires existants" : "Ajouter un commentaire"}
        >
          <MessageCircle size={16} />
          {hasComments && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {comments.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">
              {hasComments ? "Commentaires" : "Aucun commentaire"}
            </h3>
            {hasComments && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                {comments.length}
              </span>
            )}
          </div>

          {/* Comments list */}
          {comments.length > 0 && (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
                >
                  {editingId === comment.id ? (
                    // Edit mode
                    <div className="space-y-2">
                      <textarea
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white"
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingId(null);
                            setEditingText("");
                          }}
                          disabled={isUpdating}
                        >
                          Annuler
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={isUpdating}
                        >
                          Enregistrer
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Comment content */}
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {comment.comment}
                      </p>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div>
                          <p className="font-medium">
                            {comment.author?.user_metadata?.display_name ||
                              comment.author?.email ||
                              "Inconnu"}
                          </p>
                          <p>
                            {formatDistanceToNow(
                              new Date(comment.created_at),
                              {
                                addSuffix: true,
                                locale: fr,
                              }
                            )}
                          </p>
                        </div>

                        {/* Actions */}
                        {currentUserId === comment.created_by && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleStartEdit(comment)}
                              className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                              title="Modifier"
                              disabled={isUpdating}
                            >
                              <Edit2 size={14} className="text-blue-500" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                              title="Supprimer"
                              disabled={isDeleting}
                            >
                              <Trash2 size={14} className="text-red-500" />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* New comment input */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Ajouter un commentaire
            </label>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Saisissez votre commentaire..."
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm resize-none dark:bg-gray-800 dark:text-white"
              rows={3}
              disabled={isCreating}
            />
            <Button
              size="sm"
              onClick={handleCreateComment}
              disabled={!newComment.trim() || isCreating}
              className="w-full"
            >
              <Plus size={14} className="mr-1" />
              {isCreating ? "Ajout..." : "Ajouter"}
            </Button>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900 p-2 rounded">
              Erreur : {error instanceof Error ? error.message : "Erreur inconnue"}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
