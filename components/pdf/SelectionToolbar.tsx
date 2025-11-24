"use client";

import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { Plus, X, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelectionToolbarProps {
  selection: {
    text: string;
    rects: DOMRect[];
    pageNumber: number;
    viewport: { width: number; height: number };
  };
  onCreateBookmark: () => void;
  onClear: () => void;
}

export function SelectionToolbar({
  selection,
  onCreateBookmark,
  onClear,
}: SelectionToolbarProps) {
  // Calculer la position du toolbar
  const position = useMemo(() => {
    const { rects } = selection;

    if (rects.length === 0) {
      console.log("[SelectionToolbar] No rects, hiding");
      return { top: 0, left: 0, display: "none" };
    }

    // Utiliser le dernier rect pour positionner le toolbar
    const lastRect = rects[rects.length - 1];
    console.log("[SelectionToolbar] Last rect:", lastRect);

    // Position : 8px sous la fin de la sélection, centré horizontalement
    const pos = {
      top: lastRect.bottom + 8,
      left: lastRect.left + lastRect.width / 2,
      display: "flex",
    };
    console.log("[SelectionToolbar] Calculated position:", pos);
    return pos;
  }, [selection.rects]);

  if (typeof document === "undefined") return null; // Added check for document

  return createPortal(
    // Wrapped the JSX in createPortal
    <div
      className="fixed z-[100] flex items-center gap-2 selection-toolbar"
      style={{
        top: position.top,
        left: position.left,
        transform: "translateX(-50%)",
        display: position.display,
        pointerEvents: "auto",
      }}
    >
      <div className="flex items-center gap-1 bg-white rounded-full shadow-md border border-gray-100 p-1">
        {/* Bouton pour créer un bookmark */}
        <Button
          size="sm"
          onClick={onCreateBookmark}
          className="h-7 w-7 p-0 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center justify-center"
          title="Créer un signet avec cette sélection"
        >
          <div className="relative flex items-center justify-center">
            <Bookmark className="w-4 h-4" />
            <Plus
              className="w-2 h-2 absolute -top-1 -right-1 bg-blue-600 rounded-full border border-blue-600"
              strokeWidth={2}
            />
          </div>
        </Button>

        {/* Séparateur */}
        <div className="w-px h-4 bg-gray-200 mx-0.5" />

        {/* Bouton pour effacer la sélection */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="h-7 w-7 p-0 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
          title="Annuler"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Petite flèche pointant vers la sélection */}
      <div
        className="absolute -top-1 left-1/2 transform -translate-x-1/2 -translate-y-full"
        style={{
          width: 0,
          height: 0,
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderBottom: "6px solid white",
        }}
      />
    </div>,
    document.body
  );
}
