"use client";

import { useEffect } from "react";
import { usePDFAnnotationNavigation } from "../contexts/PDFAnnotationContext";

export function usePDFNavigation(
  documentId: string | null,
  currentPage: number,
  onPageChange: (page: number) => void,
  onDocumentChange?: (documentId: string) => void
) {
  const { navigationTarget, clearNavigation } = usePDFAnnotationNavigation();

  useEffect(() => {
    if (!navigationTarget) return;

    // Vérifier si c'est pour ce document
    if (documentId !== navigationTarget.documentId) {
      // Changer de document si une fonction est fournie
      if (onDocumentChange) {
        onDocumentChange(navigationTarget.documentId);
      }
      return;
    }

    // Naviguer vers la page si elle est différente
    if (navigationTarget.pageNumber !== currentPage) {
      onPageChange(navigationTarget.pageNumber);
    }

    // Si une annotation spécifique est ciblée, on peut la mettre en évidence
    if (navigationTarget.annotationId) {
      // Attendre que la page soit chargée avant de scroller
      const scrollToAnnotation = () => {
        const element = document.querySelector(
          `[data-annotation-id="${navigationTarget.annotationId}"]`
        );
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest",
          });

          // Ajouter un effet de flash/highlight temporaire
          if (navigationTarget.highlight) {
            element.classList.add("annotation-highlight-flash");
            setTimeout(() => {
              element.classList.remove("annotation-highlight-flash");
            }, 2000);
          }
        }
      };

      // Délai pour laisser le temps à la page de se charger
      const timer = setTimeout(scrollToAnnotation, 300);
      return () => clearTimeout(timer);
    }

    // Nettoyer après navigation (avec un petit délai)
    const cleanupTimer = setTimeout(clearNavigation, 1000);
    return () => clearTimeout(cleanupTimer);
  }, [
    navigationTarget,
    documentId,
    currentPage,
    onPageChange,
    onDocumentChange,
    clearNavigation,
  ]);
}
