"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  MessageCircle,
  Trash2,
  Edit2,
  Plus,
  AlertTriangle,
  HelpingHand,
  Info,
} from "lucide-react";
import {
  useFinancialComments,
  useCreateFinancialComment,
  useUpdateFinancialComment,
  useDeleteFinancialComment,
} from "@/hooks/use-financial-comments";
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
  const [newCommentType, setNewCommentType] = useState<
    "comment" | "warning" | "negotiation"
  >("comment");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [editingType, setEditingType] = useState<
    "comment" | "warning" | "negotiation"
  >("comment");

  // Type definition helpers
  const getTypeColor = (type: string) => {
    switch (type) {
      case "negotiation":
        return "text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200";
      case "warning":
        return "text-amber-600 bg-amber-50 border-amber-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const getTypeIcon = (type: string, size = 14) => {
    switch (type) {
      case "negotiation":
        return <HelpingHand size={size} className="text-fuchsia-600" />;
      case "warning":
        return <AlertTriangle size={size} className="text-amber-600" />;
      default:
        return <Info size={size} className="text-blue-600" />;
    }
  };

  // Data fetching
  const { data: commentsData, error } = useFinancialComments(lineId, versionId);
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
        type: newCommentType,
      },
      {
        onSuccess: () => {
          setNewComment("");
          setNewCommentType("comment");
        },
      }
    );
  };

  const handleStartEdit = (comment: FinancialCommentWithAuthor) => {
    setEditingId(comment.id);
    setEditingText(comment.comment);
    setEditingType(comment.type || "comment");
  };

  const handleSaveEdit = () => {
    if (!editingId || !editingText.trim()) return;

    updateComment(
      {
        commentId: editingId,
        input: {
          comment: editingText,
          type: editingType
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditingText("");
          setEditingType("comment");
        },
      }
    );
  };

  const handleDeleteComment = (commentId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce commentaire ?")) {
      deleteComment(commentId);
    }
  };

  // Determine main indicator color based on priority
  // Priority: Negotiation > Warning > Comment
  const hasNegotiation = comments.some(c => c.type === "negotiation");
  const hasWarning = comments.some(c => c.type === "warning");

  let triggerColorClass = "text-gray-400 dark:text-gray-600";
  let badgeColorClass = "bg-blue-500";

  if (hasComments) {
    if (hasNegotiation) {
      triggerColorClass = "text-fuchsia-600";
      badgeColorClass = "bg-fuchsia-600";
    } else if (hasWarning) {
      triggerColorClass = "text-amber-500";
      badgeColorClass = "bg-amber-500";
    } else {
      triggerColorClass = "text-blue-500";
      badgeColorClass = "bg-blue-500";
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={`relative inline-flex items-center justify-center p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${triggerColorClass}`}
          title={
            hasComments ? "Commentaires existants" : "Ajouter un commentaire"
          }
        >
          {hasNegotiation ? <HelpingHand size={16} /> : hasWarning ? <AlertTriangle size={16} /> : <MessageCircle size={16} />}
          {hasComments && (
            <span className={`absolute -top-0.5 -right-0.5 text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center shadow-sm ${badgeColorClass}`}>
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
                      <div className="flex gap-2">
                        {(["comment", "warning", "negotiation"] as const).map(
                          (t) => (
                            <button
                              key={t}
                              onClick={() => setEditingType(t)}
                              className={`p-1.5 rounded-full border ${editingType === t
                                ? getTypeColor(t)
                                : "bg-gray-50 border-gray-200 text-gray-400"
                                }`}
                              title={
                                t === "negotiation"
                                  ? "Axe de négociation"
                                  : t === "warning"
                                    ? "Point d'attention"
                                    : "Commentaire"
                              }
                            >
                              {getTypeIcon(t, 14)}
                            </button>
                          )
                        )}
                      </div>
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
                      <div className={`flex gap-2 items-start ${comment.type !== 'comment' ? 'p-2 rounded bg-opacity-50 ' + getTypeColor(comment.type || 'comment').split(' ')[1] : ''}`}>
                        <div className="mt-0.5 shrink-0">
                          {getTypeIcon(comment.type || "comment", 14)}
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {comment.comment}
                        </p>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div>
                          <p className="font-medium">
                            {comment.author?.user_metadata?.display_name ||
                              comment.author?.email ||
                              "Inconnu"}
                          </p>
                          <p>
                            {formatDistanceToNow(new Date(comment.created_at), {
                              addSuffix: true,
                              locale: fr,
                            })}
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
            <div className="flex gap-2 mb-2">
              {(["comment", "warning", "negotiation"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setNewCommentType(t)}
                  className={`p-1.5 rounded-full border transition-all ${newCommentType === t
                    ? getTypeColor(t) + " ring-2 ring-offset-1 ring-offset-white dark:ring-offset-gray-900 " + getTypeColor(t).split(' ')[0].replace('text-', 'ring-')
                    : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                    }`}
                  title={
                    t === "negotiation"
                      ? "Axe de négociation"
                      : t === "warning"
                        ? "Point d'attention"
                        : "Commentaire"
                  }
                >
                  {getTypeIcon(t, 16)}
                </button>
              ))}
              <span className="text-xs text-gray-400 self-center ml-2">
                {newCommentType === "negotiation"
                  ? "Axe de négociation"
                  : newCommentType === "warning"
                    ? "Point d'attention"
                    : "Commentaire simple"}
              </span>
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Saisissez votre commentaire..."
              className={`w-full p-2 border rounded text-sm resize-none dark:bg-gray-800 dark:text-white ${newCommentType !== "comment"
                ? getTypeColor(newCommentType).split(" ")[2] +
                " " +
                getTypeColor(newCommentType).split(" ")[1] + " bg-opacity-20"
                : "border-gray-300 dark:border-gray-600"
                }`}
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
              Erreur :{" "}
              {error instanceof Error ? error.message : "Erreur inconnue"}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
