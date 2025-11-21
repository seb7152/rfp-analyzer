"use client";

import React, { useState } from "react";
import type { PDFAnnotation } from "../types/annotation.types";
import { Trash2, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";

interface AnnotationHighlightProps {
  annotation: PDFAnnotation;
  scale: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, noteContent: string) => void;
}

export function AnnotationHighlight({
  annotation,
  scale,
  onDelete,
  onUpdate,
}: AnnotationHighlightProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteContent, setNoteContent] = useState(annotation.noteContent || "");

  const handleSave = () => {
    onUpdate(annotation.id, noteContent);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNoteContent(annotation.noteContent || "");
    setIsEditing(false);
  };

  return (
    <>
      {annotation.position.rects.map((rect, index) => (
        <Popover key={`${annotation.id}-${index}`}>
          <PopoverTrigger asChild>
            <div
              className="absolute cursor-pointer hover:opacity-70 transition-opacity"
              style={{
                left: rect.x * scale,
                top: rect.y * scale,
                width: rect.width * scale,
                height: rect.height * scale,
                backgroundColor: annotation.color,
                opacity: 0.4,
                pointerEvents: "auto",
                borderRadius: "2px",
              }}
              title={annotation.highlightedText || "Annotation"}
            />
          </PopoverTrigger>

          <PopoverContent className="w-80" side="top" align="start">
            <div className="space-y-3">
              {/* En-tête avec type d'annotation */}
              <div className="flex items-center justify-between pb-2 border-b">
                <span className="text-xs font-medium text-gray-500 uppercase">
                  {annotation.annotationType === "highlight" && "🖍️ Surlignage"}
                  {annotation.annotationType === "bookmark" && "📌 Signet"}
                  {annotation.annotationType === "note" && "📝 Note"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => onDelete(annotation.id)}
                  title="Supprimer"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>

              {/* Texte surligné */}
              {annotation.highlightedText && (
                <div
                  className="text-sm text-gray-700 border-l-4 pl-2 py-1 italic bg-gray-50 rounded"
                  style={{ borderColor: annotation.color }}
                >
                  "{annotation.highlightedText}"
                </div>
              )}

              {/* Note */}
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Ajoutez une note à cette annotation..."
                    rows={3}
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave} className="flex-1">
                      <Save className="w-3 h-3 mr-1" />
                      Enregistrer
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancel}>
                      <X className="w-3 h-3 mr-1" />
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {annotation.noteContent ? (
                    <p className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                      {annotation.noteContent}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Aucune note</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="w-full"
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    {annotation.noteContent
                      ? "Modifier la note"
                      : "Ajouter une note"}
                  </Button>
                </>
              )}

              {/* Métadonnées */}
              <div className="text-xs text-gray-500 pt-2 border-t flex items-center justify-between">
                <span>Page {annotation.pageNumber}</span>
                <span>
                  {new Date(annotation.createdAt).toLocaleDateString("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ))}
    </>
  );
}
