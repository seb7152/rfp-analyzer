"use client";

import React, { useEffect, useRef } from "react";
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
        // Calculer la position du highlight par rapport au container
        const highlightTop = firstRect.y * scale;
        const highlightHeight = firstRect.height * scale;
        const containerHeight = element.parentElement?.clientHeight || 0;

        // Centrer verticalement le résultat dans la vue
        const scrollTop =
          highlightTop - containerHeight / 2 + highlightHeight / 2;

        element.parentElement?.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        });
      }
    }
  }, [currentResultIndex, pageResults, pageNumber, scale]);

  if (pageResults.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 25 }} // Entre TextLayer (20) et AnnotationLayer (30)
    >
      {pageResults.map((result) => {
        const globalIndex = searchResults.findIndex((r) => r.id === result.id);
        const isActive = globalIndex === currentResultIndex;

        return (
          <React.Fragment key={result.id}>
            {result.rects.map((rect, rectIndex) => (
              <div
                key={`${result.id}-rect-${rectIndex}`}
                className="absolute border-2 transition-all duration-200"
                style={{
                  left: rect.x * scale,
                  top: rect.y * scale,
                  width: rect.width * scale,
                  height: rect.height * scale,
                  borderColor: isActive ? "#f59e0b" : "#fbbf24", // Orange actif, jaune inactif
                  backgroundColor: isActive
                    ? "rgba(245, 158, 11, 0.3)" // Orange avec transparence
                    : "rgba(251, 191, 36, 0.2)", // Jaune avec transparence
                  borderWidth: isActive ? "3px" : "2px",
                  borderRadius: "2px",
                  boxShadow: isActive
                    ? "0 0 8px rgba(245, 158, 11, 0.5)"
                    : "none",
                  animation: "searchHighlight 0.3s ease-in-out",
                }}
              />
            ))}
          </React.Fragment>
        );
      })}

      {/* Indicateur pour le résultat actif */}
      {pageResults.some(
        (result) =>
          searchResults.findIndex((r) => r.id === result.id) ===
          currentResultIndex
      ) && (
        <div
          className="absolute -top-8 left-0 bg-orange-500 text-white px-2 py-1 rounded text-xs font-medium shadow-lg"
          style={{
            animation: "fadeIn 0.2s ease-in-out",
          }}
        >
          {currentResultIndex + 1} / {searchResults.length}
        </div>
      )}

      <style jsx>{`
        @keyframes searchHighlight {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(-4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
