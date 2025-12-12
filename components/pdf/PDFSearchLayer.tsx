"use client";

import { useEffect, useRef } from "react";
import type { PDFSearchLayerProps } from "./types/search.types";

export function PDFSearchLayer({
  searchResults,
  currentResultIndex,
  scale,
  pageNumber,
}: PDFSearchLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Filtrer les résultats pour la page actuelle
  const pageResults = searchResults.filter(
    (result) => result.pageNumber === pageNumber
  );

  // Scroller vers le résultat actif sur la page actuelle
  useEffect(() => {
    if (pageResults.length === 0 || currentResultIndex === -1) return;

    const activeResult = pageResults.find(
      (result) =>
        searchResults.findIndex((r) => r.id === result.id) ===
        currentResultIndex
    );

    if (activeResult && activeResult.rects.length > 0 && containerRef.current) {
      const firstRect = activeResult.rects[0];
      const element = document.querySelector(
        `[data-page-number="${pageNumber}"]`
      ) as HTMLElement;

      if (element) {
        // Calculer la position du résultat par rapport au container
        const resultTop = firstRect.y * scale;
        const resultHeight = firstRect.height * scale;
        const containerHeight = element.parentElement?.clientHeight || 0;

        // Centrer verticalement le résultat dans la vue
        const scrollTop = resultTop - containerHeight / 2 + resultHeight / 2;

        element.parentElement?.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
      }
    }
  }, [currentResultIndex, pageResults, pageNumber, scale]);

  // Pas de rendu visuel - juste le scroll automatique
  return null;
}
