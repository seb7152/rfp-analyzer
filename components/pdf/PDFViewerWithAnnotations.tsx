"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { usePDFDocument } from "./hooks/usePDFDocument";
import { useTextSelection } from "./hooks/useTextSelection";
import { usePDFAnnotations } from "./hooks/usePDFAnnotations";
import { usePDFNavigation } from "./hooks/usePDFNavigation";
import { PDFPage } from "./PDFPage";
import { PDFToolbar } from "./PDFToolbar";
import { PDFTextLayer } from "./PDFTextLayer";
import { PDFAnnotationLayer } from "./PDFAnnotationLayer";
import { PDFAnnotationPanel } from "./PDFAnnotationPanel";
import { Loader2, SidebarClose, SidebarOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PDFPageProxy } from "./types/pdf.types";
import type { CreateAnnotationDTO } from "./types/annotation.types";

interface PDFViewerWithAnnotationsProps {
  url: string | null;
  documentId: string | null;
  organizationId: string;
  initialPage?: number;
  requirementId?: string;
  onPageChange?: (page: number) => void;
  className?: string;
  showAnnotationPanel?: boolean;
}

export function PDFViewerWithAnnotations({
  url,
  documentId,
  organizationId,
  initialPage = 1,
  requirementId,
  onPageChange,
  className = "",
  showAnnotationPanel = true,
}: PDFViewerWithAnnotationsProps) {
  const { document, numPages, isLoading, error } = usePDFDocument(url);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1.2);
  const [annotationMode, setAnnotationMode] = useState<
    "select" | "highlight" | "bookmark"
  >("select");
  const [selectedColor, setSelectedColor] = useState("#FFEB3B");
  const [isPanelOpen, setIsPanelOpen] = useState(showAnnotationPanel);
  const [loadedPage, setLoadedPage] = useState<PDFPageProxy | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Hooks pour les annotations
  const {
    annotations,
    createAnnotation,
    deleteAnnotation,
    updateAnnotation,
    isCreating,
  } = usePDFAnnotations(documentId, organizationId);

  const { selection, handleTextSelected, clearSelection } = useTextSelection();

  // Hook de navigation
  usePDFNavigation(documentId, currentPage, setCurrentPage);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= numPages) {
        setCurrentPage(page);
        onPageChange?.(page);
      }
    },
    [numPages, onPageChange],
  );

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1.2);
  }, []);

  const handlePageLoad = useCallback((page: PDFPageProxy) => {
    setLoadedPage(page);
  }, []);

  // Gérer la sélection de texte
  const handleTextSelection = useCallback(
    (text: string, rects: DOMRect[]) => {
      if (
        !loadedPage ||
        !containerRef.current ||
        annotationMode !== "highlight"
      )
        return;

      const viewport = loadedPage.getViewport({ scale });
      const containerRect = containerRef.current.getBoundingClientRect();

      handleTextSelected(
        text,
        rects,
        currentPage,
        viewport.height,
        viewport.width,
        containerRect,
        scale,
      );
    },
    [loadedPage, scale, currentPage, handleTextSelected, annotationMode],
  );

  // Créer une annotation depuis la sélection
  useEffect(() => {
    if (!selection || !documentId || annotationMode !== "highlight") return;

    const createHighlight = async () => {
      const annotationDTO: CreateAnnotationDTO = {
        documentId,
        requirementId,
        annotationType: "highlight",
        pageNumber: selection.pageNumber,
        position: {
          type: "highlight",
          pageHeight: selection.pageHeight,
          pageWidth: selection.pageWidth,
          rects: selection.rects,
        },
        highlightedText: selection.text,
        color: selectedColor,
      };

      createAnnotation(annotationDTO);
      clearSelection();
    };

    // Petit délai pour permettre à l'utilisateur de voir la sélection
    const timer = setTimeout(createHighlight, 300);
    return () => clearTimeout(timer);
  }, [
    selection,
    documentId,
    requirementId,
    selectedColor,
    annotationMode,
    createAnnotation,
    clearSelection,
  ]);

  // Gérer le clic pour créer un bookmark
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (annotationMode !== "bookmark" || !loadedPage || !documentId) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      const viewport = loadedPage.getViewport({ scale });

      const annotationDTO: CreateAnnotationDTO = {
        documentId,
        requirementId,
        annotationType: "bookmark",
        pageNumber: currentPage,
        position: {
          type: "bookmark",
          pageHeight: viewport.height,
          pageWidth: viewport.width,
          rects: [{ x, y, width: 20, height: 20 }],
        },
        color: "#2196F3",
      };

      createAnnotation(annotationDTO);
    },
    [
      annotationMode,
      loadedPage,
      documentId,
      requirementId,
      currentPage,
      scale,
      createAnnotation,
    ],
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      deleteAnnotation(id);
    },
    [deleteAnnotation],
  );

  const handleUpdateAnnotation = useCallback(
    (id: string, noteContent: string) => {
      updateAnnotation({ id, noteContent });
    },
    [updateAnnotation],
  );

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Chargement du PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-red-600">
          <p className="font-medium mb-2">Erreur lors du chargement du PDF</p>
          <p className="text-sm text-gray-600">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <p className="text-gray-500">Aucun document sélectionné</p>
      </div>
    );
  }

  const viewport = loadedPage?.getViewport({ scale });

  return (
    <div className={`flex h-full ${className}`}>
      {/* Zone principale du PDF */}
      <div className="flex-1 flex flex-col">
        <PDFToolbar
          currentPage={currentPage}
          numPages={numPages}
          scale={scale}
          onPageChange={handlePageChange}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          annotationMode={annotationMode}
          onAnnotationModeChange={setAnnotationMode}
          selectedColor={selectedColor}
          onColorChange={setSelectedColor}
        />

        <div
          className="flex-1 overflow-auto bg-gray-100 p-4"
          ref={containerRef}
        >
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative"
              onClick={handleCanvasClick}
              style={{
                cursor: annotationMode === "bookmark" ? "crosshair" : "default",
              }}
            >
              <PDFPage
                document={document}
                pageNumber={currentPage}
                scale={scale}
                onPageLoad={handlePageLoad}
                className="shadow-lg"
              >
                {/* Couche de texte pour sélection */}
                {loadedPage && annotationMode === "highlight" && (
                  <PDFTextLayer
                    page={loadedPage}
                    scale={scale}
                    onTextSelected={handleTextSelection}
                  />
                )}

                {/* Couche d'annotations */}
                {loadedPage && viewport && (
                  <PDFAnnotationLayer
                    annotations={annotations}
                    pageNumber={currentPage}
                    scale={scale}
                    pageWidth={viewport.width}
                    pageHeight={viewport.height}
                    onDeleteAnnotation={handleDeleteAnnotation}
                    onUpdateAnnotation={handleUpdateAnnotation}
                  />
                )}
              </PDFPage>
            </div>
          </div>
        </div>

        {/* Indicateur de mode actif */}
        {annotationMode !== "select" && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-10">
            {annotationMode === "highlight" &&
              "✏️ Mode surlignage - Sélectionnez du texte"}
            {annotationMode === "bookmark" &&
              "📌 Mode signet - Cliquez pour ajouter"}
          </div>
        )}

        {/* Indicateur de création */}
        {isCreating && (
          <div className="absolute bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Création de l'annotation...
          </div>
        )}
      </div>

      {/* Panel d'annotations (pliable) */}
      {showAnnotationPanel && (
        <>
          {isPanelOpen ? (
            <div className="w-80 flex flex-col border-l">
              <div className="p-2 border-b flex items-center justify-between bg-gray-50">
                <h3 className="font-medium text-sm">Annotations</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPanelOpen(false)}
                  className="h-7 w-7 p-0"
                >
                  <SidebarClose className="w-4 h-4" />
                </Button>
              </div>
              <PDFAnnotationPanel
                annotations={annotations}
                className="flex-1"
              />
            </div>
          ) : (
            <div className="w-12 border-l flex items-center justify-center bg-gray-50">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPanelOpen(true)}
                className="h-10 w-10 p-0"
                title="Ouvrir le panneau d'annotations"
              >
                <SidebarOpen className="w-5 h-5" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
