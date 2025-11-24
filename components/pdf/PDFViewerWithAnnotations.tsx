"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { usePDFDocument } from "./hooks/usePDFDocument";
import { usePDFAnnotations } from "./hooks/usePDFAnnotations";
import { usePDFNavigation } from "./hooks/usePDFNavigation";
import { PDFPage } from "./PDFPage";
import { PDFToolbar } from "./PDFToolbar";
import { PDFAnnotationLayer } from "./PDFAnnotationLayer";
import { SelectionToolbar } from "./SelectionToolbar";
import { SelectionDialog } from "./SelectionDialog";
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
    "select"
  );
  const [loadedPage, setLoadedPage] = useState<PDFPageProxy | null>(null);

  // État pour la sélection de texte
  const [textSelection, setTextSelection] = useState<{
    text: string;
    rects: DOMRect[];
    pageNumber: number;
    viewport: { width: number; height: number };
  } | null>(null);
  const [showSelectionDialog, setShowSelectionDialog] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pdfPageRef = useRef<HTMLDivElement>(null);

  // Hooks pour les annotations
  const {
    annotations,
    createAnnotation,
    deleteAnnotation,
    updateAnnotation,
    isCreating,
  } = usePDFAnnotations(documentId);

  // Hook de navigation
  usePDFNavigation(documentId, currentPage, setCurrentPage);

  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= numPages) {
        setCurrentPage(page);
        onPageChange?.(page);
      }
    },
    [numPages, onPageChange]
  );

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.05, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.05, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    if (!loadedPage || !containerRef.current) {
      setScale(1);
      return;
    }

    // Calculer le scale pour "Fit to Width"
    // clientWidth inclut le padding mais exclut la scrollbar verticale
    // Le container a p-4 (16px * 2 = 32px)
    const availableWidth = containerRef.current.clientWidth - 32;
    const viewport = loadedPage.getViewport({ scale: 1 });

    // On laisse une petite marge de sécurité (ex: 4px) pour éviter les arrondis qui créent une scrollbar horizontale
    const newScale = (availableWidth - 4) / viewport.width;

    setScale(newScale);
  }, [loadedPage]);

  const handlePageLoad = useCallback((page: PDFPageProxy) => {
    setLoadedPage(page);
  }, []);

  // Callback pour gérer la sélection de texte
  const handleTextSelected = useCallback(
    (text: string, rects: DOMRect[]) => {
      console.log("[PDFViewer] handleTextSelected called", {
        text,
        rectsLength: rects.length,
      });
      if (!loadedPage || text.length === 0) {
        console.log("[PDFViewer] Clearing selection (no page or empty text)");
        setTextSelection(null);
        return;
      }

      const viewport = loadedPage.getViewport({ scale });

      console.log("[PDFViewer] Setting text selection state");
      setTextSelection({
        text,
        rects,
        pageNumber: currentPage,
        viewport: {
          width: viewport.width,
          height: viewport.height,
        },
      });
    },
    [loadedPage, scale, currentPage]
  );

  // Effacer la sélection lors du changement de page
  useEffect(() => {
    console.log("[PDFViewer] Page changed, clearing selection");
    setTextSelection(null);
  }, [currentPage]);

  // Effacer la sélection lors du scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      console.log("[PDFViewer] Scroll detected, clearing selection");
      setTextSelection(null);
      window.getSelection()?.removeAllRanges();
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Effacer la sélection lors du clic à l'extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;

      // Ne pas effacer si on clique sur le toolbar de sélection
      if (target.closest(".selection-toolbar")) {
        console.log("[PDFViewer] Click on toolbar, ignoring");
        return;
      }

      // Ne pas effacer si on clique dans le PDF text layer
      if (target.closest(".pdf-text-layer")) {
        console.log("[PDFViewer] Click on text layer, ignoring");
        return;
      }

      // Ne pas effacer si le dialog de sélection est ouvert
      if (showSelectionDialog) {
        console.log("[PDFViewer] Dialog is open, ignoring click");
        return;
      }

      console.log(
        "[PDFViewer] Click outside, clearing selection. Target:",
        target
      );
      setTextSelection(null);
    };

    window.document.addEventListener("mousedown", handleClickOutside);
    return () =>
      window.document.removeEventListener("mousedown", handleClickOutside);
  }, [showSelectionDialog]);

  // Debug: Log textSelection changes
  useEffect(() => {
    console.log("[PDFViewer] textSelection state changed:", textSelection);
  }, [textSelection]);

  // Handler pour ouvrir le dialog
  const handleCreateBookmarkClick = useCallback(() => {
    console.log("[PDFViewer] handleCreateBookmarkClick called");
    if (!textSelection) {
      console.log("[PDFViewer] No text selection, ignoring");
      return;
    }
    setShowSelectionDialog(true);
  }, [textSelection]);

  // Handler pour confirmer la création
  const handleConfirmBookmark = useCallback(
    (noteContent: string, requirementId?: string) => {
      if (!textSelection || !documentId || !loadedPage) return;

      const viewport = loadedPage.getViewport({ scale });
      // Utiliser la référence de la page PDF pour le calcul des coordonnées
      const pageRect = pdfPageRef.current?.getBoundingClientRect();

      if (!pageRect) {
        console.error("[PDFViewer] No page rect found");
        return;
      }

      // Calculer la position du bookmark en conservant tous les rectangles de sélection
      const pageRects = textSelection.rects.map((rect) => {
        const relativeX = rect.left - pageRect.left;
        const relativeY = rect.top - pageRect.top;

        return {
          x: Math.max(0, relativeX / scale),
          y: Math.max(0, relativeY / scale),
          width: rect.width / scale,
          height: rect.height / scale,
        };
      });

      console.log("[PDFViewer] Creating bookmark with rects:", pageRects);

      const annotationDTO: CreateAnnotationDTO = {
        documentId,
        requirementId: requirementId === "none" ? undefined : requirementId,
        annotationType: "bookmark",
        pageNumber: textSelection.pageNumber,
        position: {
          type: "bookmark",
          pageHeight: viewport.height,
          pageWidth: viewport.width,
          rects: pageRects,
        },
        highlightedText: textSelection.text,
        noteContent: noteContent || undefined,
        color: "#2196F3",
      };

      // Utiliser la même syntaxe que handleCanvasClick - sans callbacks
      createAnnotation(annotationDTO);

      // Fermer le dialog et effacer la sélection immédiatement
      // (l'invalidation des queries se fera automatiquement via le hook)
      console.log("[PDFViewer] Bookmark creation triggered");
      setShowSelectionDialog(false);
      setTextSelection(null);
      window.getSelection()?.removeAllRanges();
    },
    [textSelection, documentId, loadedPage, scale, createAnnotation]
  );

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
    ]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      deleteAnnotation(id);
    },
    [deleteAnnotation]
  );

  const handleUpdateAnnotation = useCallback(
    (dto: UpdateAnnotationDTO) => {
      updateAnnotation(dto);
    },
    [updateAnnotation]
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
              ref={pdfPageRef}
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
                onTextSelected={handleTextSelected}
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
      {/* Toolbar de sélection (Fixed positioning) - Masqué si le dialog est ouvert */}
      {textSelection && !showSelectionDialog && (
        <SelectionToolbar
          selection={textSelection}
          onClear={() => setTextSelection(null)}
          onCreateBookmark={handleCreateBookmarkClick}
        />
      )}

      {/* Dialog de création de signet */}
      {showSelectionDialog && textSelection && (
        <SelectionDialog
          open={showSelectionDialog}
          onOpenChange={setShowSelectionDialog}
          onConfirm={handleConfirmBookmark}
          selectedText={textSelection.text}
          isCreating={isCreating}
          requirements={requirements}
          defaultRequirementId={requirementId}
        />
      )}
    </div>
  );
}
