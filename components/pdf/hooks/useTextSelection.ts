"use client";

import { useState, useCallback } from "react";
import type { AnnotationRect } from "../types/annotation.types";
import {
  screenToPDFCoordinates,
  mergeOverlappingRects,
} from "../utils/pdfCoordinates";

interface TextSelection {
  text: string;
  rects: AnnotationRect[];
  pageNumber: number;
  pageHeight: number;
  pageWidth: number;
}

export function useTextSelection() {
  const [selection, setSelection] = useState<TextSelection | null>(null);

  const handleTextSelected = useCallback(
    (
      text: string,
      domRects: DOMRect[],
      pageNumber: number,
      pageHeight: number,
      pageWidth: number,
      containerRect: DOMRect,
      scale: number,
    ) => {
      // Convertir les coordonnées écran en coordonnées PDF
      const pdfRects = screenToPDFCoordinates(domRects, containerRect, scale);

      // Fusionner les rectangles qui se chevauchent
      const mergedRects = mergeOverlappingRects(pdfRects);

      setSelection({
        text,
        rects: mergedRects,
        pageNumber,
        pageHeight,
        pageWidth,
      });
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  return {
    selection,
    handleTextSelected,
    clearSelection,
  };
}
