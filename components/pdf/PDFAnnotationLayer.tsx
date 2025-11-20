import React from 'react';
import type { PDFAnnotation } from './types/annotation.types';
import { AnnotationHighlight } from './annotations/AnnotationHighlight';

interface PDFAnnotationLayerProps {
  annotations: PDFAnnotation[];
  pageNumber: number;
  scale: number;
  pageWidth: number;
  pageHeight: number;
  onDeleteAnnotation: (id: string) => void;
  onUpdateAnnotation: (id: string, noteContent: string) => void;
}

export function PDFAnnotationLayer({
  annotations,
  pageNumber,
  scale,
  pageWidth,
  pageHeight,
  onDeleteAnnotation,
  onUpdateAnnotation,
}: PDFAnnotationLayerProps) {
  // Filtrer les annotations pour cette page
  const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNumber);

  if (pageAnnotations.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
      }}
    >
      {pageAnnotations.map((annotation) => {
        switch (annotation.annotationType) {
          case 'highlight':
          case 'bookmark':
          case 'note':
            return (
              <AnnotationHighlight
                key={annotation.id}
                annotation={annotation}
                scale={scale}
                onDelete={onDeleteAnnotation}
                onUpdate={onUpdateAnnotation}
              />
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
