"use client";

import React, { useState, useRef, useCallback } from "react";
import type {
  PDFAnnotation,
  RequirementInfo,
  UpdateAnnotationDTO,
} from "../types/annotation.types";
import { Trash2, Edit2, Save, X, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface AnnotationHighlightProps {
  annotation: PDFAnnotation;
  scale: number;
  onDelete: (id: string) => void;
  onUpdate: (dto: UpdateAnnotationDTO) => void;
  requirements?: RequirementInfo[];
}

export function AnnotationHighlight({
  annotation,
  scale,
  onDelete,
  onUpdate,
  requirements = [],
}: AnnotationHighlightProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteContent, setNoteContent] = useState(annotation.noteContent || "");

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [optimisticPosition, setOptimisticPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const dragStartRef = useRef<{
    mouseX: number;
    mouseY: number;
    initialX: number;
    initialY: number;
  } | null>(null);
  const hasMovedRef = useRef(false);

  // Hover state for requirement badge
  const [isHovered, setIsHovered] = useState(false);

  const linkedRequirement = requirements.find(
    (r) => r.id === annotation.requirementId
  );

  // Reset optimistic position when we get a new position from the server
  React.useEffect(() => {
    if (optimisticPosition) {
      const serverX = annotation.position.rects[0].x;
      const serverY = annotation.position.rects[0].y;

      // If the server position matches our optimistic one (or is close enough), clear the optimistic state
      if (
        Math.abs(serverX - optimisticPosition.x) < 0.001 &&
        Math.abs(serverY - optimisticPosition.y) < 0.001
      ) {
        setOptimisticPosition(null);
      }
    }
  }, [annotation.position, optimisticPosition]);

  const handleSave = () => {
    onUpdate({ id: annotation.id, noteContent });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setNoteContent(annotation.noteContent || "");
    setIsEditing(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(annotation.id);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleSave();
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleCancel();
  };

  const handleHighlightClick = (e: React.MouseEvent) => {
    if (hasMovedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    // Ne pas stopper la propagation ici pour permettre au Popover de s'ouvrir
    // e.stopPropagation();
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragStartRef.current) return;

      const deltaX = (e.clientX - dragStartRef.current.mouseX) / scale;
      const deltaY = (e.clientY - dragStartRef.current.mouseY) / scale;

      if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
        hasMovedRef.current = true;
      }

      setDragPosition({
        x: dragStartRef.current.initialX + deltaX,
        y: dragStartRef.current.initialY + deltaY,
      });
    },
    [scale]
  );

  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      setIsDragging(false);

      if (dragStartRef.current && hasMovedRef.current) {
        const deltaX = (e.clientX - dragStartRef.current.mouseX) / scale;
        const deltaY = (e.clientY - dragStartRef.current.mouseY) / scale;

        const newX = dragStartRef.current.initialX + deltaX;
        const newY = dragStartRef.current.initialY + deltaY;

        const newRects = [...annotation.position.rects];
        newRects[0] = { ...newRects[0], x: newX, y: newY };

        setOptimisticPosition({ x: newX, y: newY });

        onUpdate({
          id: annotation.id,
          position: { ...annotation.position, rects: newRects },
        });
      }

      dragStartRef.current = null;
      setDragPosition(null);

      // Reset hasMoved after a short delay to prevent click from firing immediately
      setTimeout(() => {
        hasMovedRef.current = false;
      }, 100);
    },
    [annotation, onUpdate, scale, handleMouseMove]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (annotation.annotationType !== "bookmark") return;

    e.preventDefault();
    e.stopPropagation();

    const rect = currentRect;
    hasMovedRef.current = false;

    setIsDragging(true);
    setDragPosition({ x: rect.x, y: rect.y });

    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      initialX: rect.x,
      initialY: rect.y,
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  // Determine current position (dragged or static)
  // Priority:
  // 1. Dragging (real-time updates)
  // 2. Optimistic (waiting for server)
  // 3. Props (server confirmed)
  const currentRect =
    isDragging && dragPosition
      ? {
          ...annotation.position.rects[0],
          x: dragPosition.x,
          y: dragPosition.y,
        }
      : optimisticPosition
        ? {
            ...annotation.position.rects[0],
            x: optimisticPosition.x,
            y: optimisticPosition.y,
          }
        : annotation.position.rects[0];

  return (
    <>
      {annotation.position.rects.map((_, index) => {
        // Only use currentRect for the first rect (bookmarks usually have 1 rect)
        // For highlights with multiple rects, we don't support dragging yet
        const rect =
          index === 0 && annotation.annotationType === "bookmark"
            ? currentRect
            : annotation.position.rects[index];

        return (
          <Popover key={`${annotation.id}-${index}`}>
            <PopoverTrigger asChild>
              <div
                className="absolute group"
                style={{
                  left: rect.x * scale,
                  top: rect.y * scale,
                  width: rect.width * scale,
                  height: rect.height * scale,
                  pointerEvents: "auto",
                }}
              >
                {/* Highlight Rectangle */}
                <div
                  className="absolute inset-0 cursor-pointer hover:opacity-70 transition-opacity"
                  style={{
                    backgroundColor: annotation.color,
                    opacity: 0.4,
                    borderRadius: "2px",
                  }}
                  onClick={handleHighlightClick}
                  title={annotation.highlightedText || "Annotation"}
                />

                {/* Bookmark Icon (Only for first rect of a bookmark) */}
                {annotation.annotationType === "bookmark" && index === 0 && (
                  <div
                    className={`absolute -top-3 -left-3 z-10 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
                    onClick={handleHighlightClick}
                    onMouseDown={handleMouseDown}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                  >
                    <div className="relative">
                      {/* Bookmark Icon */}
                      <div
                        className={`relative bg-white rounded-full p-1.5 shadow-md border border-gray-200 group-hover:border-blue-400 transition-all duration-200 ${isDragging ? "scale-110" : "group-hover:scale-110"}`}
                        style={{ color: annotation.color }}
                      >
                        <Bookmark className="w-5 h-5 fill-current" />
                        {linkedRequirement && (
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full border border-white" />
                        )}
                      </div>

                      {/* Animated requirement badge */}
                      {linkedRequirement && (
                        <div className="absolute left-1/2 top-1/2 -translate-y-1/2 pl-4 pointer-events-none">
                          <div
                            className={`
                            flex items-center gap-1.5 px-3 py-1.5
                            bg-white
                            text-blue-700 text-xs font-medium 
                            rounded-full shadow-md border border-blue-200
                            whitespace-nowrap
                            transition-all duration-300 ease-out
                            ${
                              isHovered
                                ? "opacity-100 translate-x-0"
                                : "opacity-0 -translate-x-2"
                            }
                          `}
                          >
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                              <span className="text-[11px] font-semibold tracking-wide">
                                {linkedRequirement.requirement_id_external}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </PopoverTrigger>

            <PopoverContent
              className="w-80 p-0 overflow-hidden"
              side="top"
              align="center"
            >
              <div className="flex flex-col">
                {/* Header */}
                <div className="bg-slate-50 px-4 py-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {annotation.annotationType === "bookmark" ? (
                      <Bookmark className="w-4 h-4 text-blue-600" />
                    ) : (
                      <span className="text-lg">🖍️</span>
                    )}
                    <span className="font-semibold text-sm text-slate-700">
                      {annotation.annotationType === "bookmark"
                        ? "Signet"
                        : "Surlignage"}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                    onClick={handleDeleteClick}
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Linked Requirement */}
                  {linkedRequirement && (
                    <div className="bg-blue-50/50 rounded-lg border border-blue-100 p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant="outline"
                          className="bg-white text-blue-700 border-blue-200 text-[10px] h-5"
                        >
                          {linkedRequirement.requirement_id_external}
                        </Badge>
                        <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                          Exigence liée
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-snug">
                        {linkedRequirement.title}
                      </p>
                    </div>
                  )}

                  {/* Highlighted Text */}
                  {annotation.highlightedText && (
                    <div className="relative pl-3">
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                        style={{ backgroundColor: annotation.color }}
                      />
                      <p className="text-sm text-slate-600 italic leading-relaxed">
                        "{annotation.highlightedText}"
                      </p>
                    </div>
                  )}

                  {/* Note Section */}
                  <div className="space-y-2">
                    {isEditing ? (
                      <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                        <Textarea
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Ajoutez une note..."
                          rows={3}
                          className="text-sm resize-none focus-visible:ring-blue-500"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={handleSaveClick}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          >
                            <Save className="w-3.5 h-3.5 mr-1.5" />
                            Enregistrer
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelClick}
                            className="px-3"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="group relative">
                        {annotation.noteContent ? (
                          <div
                            className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 cursor-pointer hover:border-blue-200 transition-colors"
                            onClick={handleEditClick}
                          >
                            {annotation.noteContent}
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEditClick}
                            className="w-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-dashed border-slate-200 hover:border-blue-200 h-auto py-2"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-2" />
                            Ajouter une note
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="bg-slate-50/50 px-4 py-2 border-t flex items-center justify-between text-[10px] text-slate-400">
                  <span>Page {annotation.pageNumber}</span>
                  <span>
                    {new Date(annotation.createdAt).toLocaleDateString(
                      "fr-FR",
                      {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        );
      })}
    </>
  );
}
