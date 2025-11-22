"use client";

import React, { useState } from "react";
import {
  Bookmark,
  Trash2,
  ExternalLink,
  Loader2,
  RotateCw,
} from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PDFAnnotation } from "@/components/pdf/types/annotation.types";
import { useSupplierAnnotations } from "@/components/pdf/hooks/useSupplierAnnotations";

interface SupplierBookmarksProps {
  requirementId: string;
  supplierId: string;
  onOpenBookmark?: (bookmark: PDFAnnotation) => void;
}

export function SupplierBookmarks({
  requirementId,
  supplierId,
  onOpenBookmark,
}: SupplierBookmarksProps) {
  const {
    annotations: bookmarks,
    isLoading,
    deleteAnnotation,
    isDeleting,
    refetch,
  } = useSupplierAnnotations(requirementId, supplierId);
  const [bookmarkToDelete, setBookmarkToDelete] =
    useState<PDFAnnotation | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const handleRefresh = async () => {
    setIsRefetching(true);
    await refetch();
    setIsRefetching(false);
  };

  const handleDelete = () => {
    if (bookmarkToDelete) {
      deleteAnnotation({
        id: bookmarkToDelete.id,
        documentId: bookmarkToDelete.documentId,
      });
      setBookmarkToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-xs">Chargement des signets...</span>
      </div>
    );
  }

  if (bookmarks.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-2 mb-3">
        <Bookmark className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          Signets associés
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          className="h-6 w-6 ml-1"
          title="Actualiser les signets"
        >
          <RotateCw
            className={`w-3.5 h-3.5 text-slate-500 ${isRefetching ? "animate-spin" : ""}`}
          />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {bookmarks.map((bookmark) => (
          <HoverCard key={bookmark.id}>
            <HoverCardTrigger asChild>
              <button
                onClick={() => onOpenBookmark?.(bookmark)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-xs text-slate-700 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
              >
                <Bookmark className="w-3 h-3 text-blue-500" />
                <span className="font-medium max-w-[150px] truncate">
                  {bookmark.documentName || "Document"}
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                  p. {bookmark.pageNumber}
                </span>
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white break-words">
                    {bookmark.documentName || "Document"}
                  </h4>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    Page {bookmark.pageNumber}
                  </span>
                </div>

                {bookmark.noteContent && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                    {bookmark.noteContent}
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setBookmarkToDelete(bookmark);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 px-2"
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Supprimer
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onOpenBookmark?.(bookmark)}
                    className="h-8"
                  >
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Voir dans le doc
                  </Button>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        ))}
      </div>

      <AlertDialog
        open={!!bookmarkToDelete}
        onOpenChange={(open) => !open && setBookmarkToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le signet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le signet sera définitivement
              supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
