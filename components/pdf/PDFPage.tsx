"use client";

import React, { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "./types/pdf.types";
import { PDFTextLayer } from "./PDFTextLayer";

interface PDFPageProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  onPageLoad?: (page: PDFPageProxy) => void;
  onTextSelected?: (text: string, rects: DOMRect[]) => void;
  onTextExtracted?: (items: any[]) => void;
  className?: string;
  children?: React.ReactNode; // Pour les couches d'annotations et de texte
}

export function PDFPage({
  document,
  pageNumber,
  scale,
  onPageLoad,
  onTextSelected,
  onTextExtracted,
  className,
  children,
}: PDFPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [rendering, setRendering] = useState(false);
  const renderTaskRef = useRef<any>(null);

  // Charger la page
  useEffect(() => {
    let isCancelled = false;

    document
      .getPage(pageNumber)
      .then((pdfPage) => {
        if (!isCancelled) {
          setPage(pdfPage);
          onPageLoad?.(pdfPage);
        }
      })
      .catch((error) => {
        console.error("Error loading page:", error);
      });

    return () => {
      isCancelled = true;
    };
  }, [document, pageNumber, onPageLoad]);

  // Rendre la page sur le canvas
  useEffect(() => {
    if (!page || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return;

    // Annuler le rendu précédent s'il existe
    if (renderTaskRef.current) {
      renderTaskRef.current.cancel();
    }

    const viewport = page.getViewport({ scale });

    // Ajuster la taille du canvas
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    setRendering(true);

    const renderTask = page.render({
      canvasContext: context,
      viewport: viewport,
    } as any);

    renderTaskRef.current = renderTask;

    renderTask.promise
      .then(() => {
        setRendering(false);
        renderTaskRef.current = null;
      })
      .catch((err) => {
        if (err.name !== "RenderingCancelledException") {
          console.error("Error rendering page:", err);
        }
        setRendering(false);
        renderTaskRef.current = null;
      });

    return () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [page, scale]);

  if (!page) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-100 rounded">
        <p className="text-gray-500">Chargement de la page {pageNumber}...</p>
      </div>
    );
  }

  const viewport = page.getViewport({ scale });

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: viewport.width,
        height: viewport.height,
        position: "relative",
        backgroundColor: "white",
      }}
      data-page-number={pageNumber}
    >
      <canvas ref={canvasRef} style={{ display: "block" }} />

      {/* Indicateur de rendu */}
      {rendering && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="bg-blue-600 text-white px-3 py-1 rounded text-sm">
            Rendu en cours...
          </div>
        </div>
      )}

      {/* Couche de texte pour la sélection */}
      {page && onTextSelected && (
        <PDFTextLayer
          page={page}
          scale={scale}
          onTextSelected={onTextSelected}
        />
      )}

      {/* Couche de texte pour la sélection et la recherche */}
      {page && (onTextSelected || onTextExtracted) && (
        <PDFTextLayer
          page={page}
          scale={scale}
          onTextSelected={onTextSelected}
          onTextExtracted={onTextExtracted}
        />
      )}

      {/* Couches supplémentaires (annotations) */}
      {children}
    </div>
  );
}
