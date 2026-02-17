"use client";

import { useState } from "react";
import { Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import type { ThreadCommentWithAuthor } from "@/types/response-thread";

interface CommentItemProps {
  comment: ThreadCommentWithAuthor;
  currentUserId: string;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  onEdit,
  onDelete,
  isUpdating,
  isDeleting,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const isAuthor = currentUserId === comment.author_id;

  const handleSave = () => {
    if (!editContent.trim()) return;
    onEdit(comment.id, editContent.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm("Supprimer ce commentaire ?")) {
      onDelete(comment.id);
    }
  };

  return (
    <div className="group py-2.5 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-sm dark:bg-gray-800 dark:text-white resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              disabled={isUpdating}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isUpdating || !editContent.trim()}
            >
              {isUpdating ? "..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {comment.author?.display_name || comment.author?.email || "Inconnu"}
              </span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-400">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                  locale: fr,
                })}
              </span>
              {comment.edited_at && (
                <span className="text-gray-400 italic">(modifié)</span>
              )}
            </div>

            {isAuthor && (
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded"
                  title="Modifier"
                  disabled={isUpdating}
                >
                  <Edit2 size={12} className="text-blue-500" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded"
                  title="Supprimer"
                  disabled={isDeleting}
                >
                  <Trash2 size={12} className="text-red-500" />
                </button>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
            {comment.content}
          </p>
        </>
      )}
    </div>
  );
}
