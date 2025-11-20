'use client';

import React, { useState, useRef, useCallback } from 'react';
import { usePDFDocument } from './hooks/usePDFDocument';
import { PDFPage } from './PDFPage';
import { PDFToolbar } from './PDFToolbar';
import { Loader2 } from 'lucide-react';
import type { PDFViewerProps } from './types/pdf.types';

export function PDFViewer({
  url,
  initialPage = 1,
  onPageChange,
  className = '',
}: PDFViewerProps) {
  const { document, numPages, isLoading, error } = usePDFDocument(url);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1.2);
  const [annotationMode, setAnnotationMode] = useState<'select' | 'highlight' | 'bookmark'>('select');
  const [selectedColor, setSelectedColor] = useState('#FFEB3B');
  const containerRef = useRef<HTMLDivElement>(null);

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
    setScale((prev) => Math.min(prev + 0.2, 3));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  }, []);

  const handleResetZoom = useCallback(() => {
    setScale(1.2);
  }, []);

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

  return (
    <div className={`flex flex-col h-full ${className}`}>
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
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 p-4"
      >
        <div className="flex flex-col items-center gap-4">
          <PDFPage
            document={document}
            pageNumber={currentPage}
            scale={scale}
            className="shadow-lg"
          />
        </div>
      </div>

      {/* Afficher le mode actif */}
      {annotationMode !== 'select' && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium">
          {annotationMode === 'highlight' && '✏️ Mode surlignage actif - Sélectionnez du texte'}
          {annotationMode === 'bookmark' && '📌 Mode signet actif - Cliquez pour ajouter un signet'}
        </div>
      )}
    </div>
  );
}
