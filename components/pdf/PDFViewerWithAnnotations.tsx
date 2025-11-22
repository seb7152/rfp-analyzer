"use client";

import React, { useState, useCallback, useRef } from "react";
import { usePDFDocument } from "./hooks/usePDFDocument";
import { usePDFAnnotations } from "./hooks/usePDFAnnotations";
import { usePDFNavigation } from "./hooks/usePDFNavigation";
import { PDFPage } from "./PDFPage";
import { PDFToolbar } from "./PDFToolbar";
import { PDFAnnotationLayer } from "./PDFAnnotationLayer";
import { Loader2 } from "lucide-react";
import type { PDFPageProxy } from "./types/pdf.types";
import type {
  CreateAnnotationDTO,
  RequirementInfo,
  UpdateAnnotationDTO,
} from "./types/annotation.types";

interface PDFViewerWithAnnotationsProps {
  url: string | null;
  documentId: string | null;
  organizationId: string;
  initialPage?: number;
  requirementId?: string;
  onPageChange?: (page: number) => void;
  className?: string;
  showAnnotationPanel?: boolean;
  requirements?: RequirementInfo[];
}

export function PDFViewerWithAnnotations({
  url,
  documentId,
  organizationId,
  initialPage = 1,
  requirementId,
  onPageChange,
  className = "",
  requirements = [],
}: PDFViewerWithAnnotationsProps) {
  const { document, numPages, isLoading, error } = usePDFDocument(url);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1); // Zoom par défaut: 100%
  const [annotationMode, setAnnotationMode] = useState<"select" | "bookmark">(
    "select",
  );
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
    setScale(1);
  }, []);

  const handlePageLoad = useCallback((page: PDFPageProxy) => {
    setLoadedPage(page);
  }, []);

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
    (dto: UpdateAnnotationDTO) => {
      updateAnnotation(dto);
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
          annotations={annotations}
          requirements={requirements}
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
                    requirements={requirements}
                  />
                )}
              </PDFPage>
            </div>
          </div>
        </div>

        {/* Indicateur de mode actif */}
        {annotationMode === "bookmark" && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium z-10">
            📌 Mode signet - Cliquez pour ajouter
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
    </div>
  );
}
