# Plan d'implémentation : Système d'annotations PDF

## Vue d'ensemble

Ce document détaille l'implémentation complète d'un système d'annotations PDF pour l'application RFP Analyzer, permettant de surligner des passages, créer des bookmarks, et naviguer entre les annotations et l'évaluation des réponses.

## Architecture des composants

### Structure des composants React

```
components/
├── pdf/
│   ├── PDFViewer.tsx                    # Composant principal du viewer PDF
│   ├── PDFPage.tsx                      # Rendu d'une page PDF avec canvas
│   ├── PDFAnnotationLayer.tsx           # Couche d'annotations au-dessus du PDF
│   ├── PDFTextLayer.tsx                 # Couche de texte pour sélection
│   ├── PDFToolbar.tsx                   # Barre d'outils (zoom, page, mode annotation)
│   ├── PDFThumbnails.tsx                # Miniatures de navigation
│   │
│   ├── annotations/
│   │   ├── AnnotationHighlight.tsx      # Composant de surlignage
│   │   ├── AnnotationBookmark.tsx       # Composant de bookmark
│   │   ├── AnnotationNote.tsx           # Composant de note
│   │   ├── AnnotationEditor.tsx         # Éditeur de note/commentaire
│   │   ├── AnnotationList.tsx           # Liste des annotations
│   │   ├── AnnotationGroup.tsx          # Gestion des groupes d'annotations
│   │   └── AnnotationColorPicker.tsx    # Sélecteur de couleur
│   │
│   ├── hooks/
│   │   ├── usePDFDocument.ts            # Hook pour charger un document PDF
│   │   ├── usePDFAnnotations.ts         # Hook pour gérer les annotations
│   │   ├── useTextSelection.ts          # Hook pour la sélection de texte
│   │   ├── usePDFNavigation.ts          # Hook pour la navigation (page, zoom)
│   │   └── useAnnotationSync.ts         # Hook pour sync temps réel
│   │
│   ├── utils/
│   │   ├── pdfCoordinates.ts            # Conversion coordonnées PDF ↔ écran
│   │   ├── textExtraction.ts            # Extraction de texte du PDF
│   │   ├── annotationSerializer.ts      # Sérialisation pour stockage
│   │   └── pdfWorker.ts                 # Configuration du worker PDF.js
│   │
│   └── types/
│       ├── annotation.types.ts          # Types TypeScript pour annotations
│       └── pdf.types.ts                 # Types pour PDF.js
│
└── PDFViewerSheet.tsx (REFACTOR)        # Mise à jour pour utiliser PDFViewer

```

### Types TypeScript

```typescript
// components/pdf/types/annotation.types.ts

export type AnnotationType = "highlight" | "bookmark" | "note" | "area";

export interface AnnotationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationPosition {
  type: AnnotationType;
  pageHeight: number;
  pageWidth: number;
  rects: AnnotationRect[];
  textRange?: {
    startOffset: number;
    endOffset: number;
  };
}

export interface PDFAnnotation {
  id: string;
  organizationId: string;
  documentId: string;
  requirementId?: string;
  supplierId?: string;
  annotationType: AnnotationType;
  pageNumber: number;
  position: AnnotationPosition;
  highlightedText?: string;
  noteContent?: string;
  color: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnotationGroup {
  id: string;
  organizationId: string;
  requirementId?: string;
  name: string;
  description?: string;
  annotations?: PDFAnnotation[];
  createdBy: string;
  createdAt: string;
}

export interface CreateAnnotationDTO {
  documentId: string;
  requirementId?: string;
  annotationType: AnnotationType;
  pageNumber: number;
  position: AnnotationPosition;
  highlightedText?: string;
  noteContent?: string;
  color?: string;
  tags?: string[];
}
```

---

## Phase 1 : Migration vers react-pdf (2-3 jours)

### Objectif

Remplacer l'iframe par un viewer PDF.js contrôlable programmatiquement

### Étape 1.1 : Installation des dépendances

```bash
npm install react-pdf pdfjs-dist
npm install @types/pdfjs-dist --save-dev
```

### Étape 1.2 : Configuration du worker PDF.js

**Fichier: `components/pdf/utils/pdfWorker.ts`**

```typescript
import { pdfjs } from "react-pdf";

// Configuration du worker PDF.js
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;
}

export { pdfjs };
```

### Étape 1.3 : Hook de chargement du document

**Fichier: `components/pdf/hooks/usePDFDocument.ts`**

```typescript
import { useState, useEffect } from "react";
import { pdfjs } from "../utils/pdfWorker";
import type { PDFDocumentProxy } from "pdfjs-dist";

interface UsePDFDocumentResult {
  document: PDFDocumentProxy | null;
  numPages: number;
  isLoading: boolean;
  error: Error | null;
}

export function usePDFDocument(url: string | null): UsePDFDocumentResult {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!url) {
      setDocument(null);
      setNumPages(0);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setError(null);

    const loadingTask = pdfjs.getDocument(url);

    loadingTask.promise
      .then((pdf) => {
        if (!isCancelled) {
          setDocument(pdf);
          setNumPages(pdf.numPages);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error("Error loading PDF:", err);
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      loadingTask.destroy();
    };
  }, [url]);

  return { document, numPages, isLoading, error };
}
```

### Étape 1.4 : Composant PDFPage avec rendu canvas

**Fichier: `components/pdf/PDFPage.tsx`**

```typescript
import React, { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

interface PDFPageProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  onPageLoad?: (page: PDFPageProxy) => void;
  className?: string;
}

export function PDFPage({ document, pageNumber, scale, onPageLoad, className }: PDFPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [rendering, setRendering] = useState(false);

  // Charger la page
  useEffect(() => {
    let isCancelled = false;

    document.getPage(pageNumber).then((pdfPage) => {
      if (!isCancelled) {
        setPage(pdfPage);
        onPageLoad?.(pdfPage);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [document, pageNumber, onPageLoad]);

  // Rendre la page sur le canvas
  useEffect(() => {
    if (!page || !canvasRef.current || rendering) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    setRendering(true);

    const renderTask = page.render({
      canvasContext: context,
      viewport: viewport,
    });

    renderTask.promise
      .then(() => {
        setRendering(false);
      })
      .catch((err) => {
        if (err.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
        setRendering(false);
      });

    return () => {
      renderTask.cancel();
    };
  }, [page, scale, rendering]);

  if (!page) {
    return <div className="flex items-center justify-center h-96">Chargement...</div>;
  }

  const viewport = page.getViewport({ scale });

  return (
    <div className={className} style={{ width: viewport.width, height: viewport.height, position: 'relative' }}>
      <canvas ref={canvasRef} />
    </div>
  );
}
```

### Étape 1.5 : Composant PDFViewer principal

**Fichier: `components/pdf/PDFViewer.tsx`**

```typescript
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { usePDFDocument } from './hooks/usePDFDocument';
import { PDFPage } from './PDFPage';
import { PDFToolbar } from './PDFToolbar';
import { Loader2 } from 'lucide-react';

interface PDFViewerProps {
  url: string | null;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function PDFViewer({ url, initialPage = 1, onPageChange, className }: PDFViewerProps) {
  const { document, numPages, isLoading, error } = usePDFDocument(url);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1.2);
  const containerRef = useRef<HTMLDivElement>(null);

  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= numPages) {
      setCurrentPage(page);
      onPageChange?.(page);
    }
  }, [numPages, onPageChange]);

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setScale(1.2);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-600">
        Erreur lors du chargement du PDF: {error.message}
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        Aucun document sélectionné
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
    </div>
  );
}
```

### Étape 1.6 : Barre d'outils

**Fichier: `components/pdf/PDFToolbar.tsx`**

```typescript
import React from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PDFToolbarProps {
  currentPage: number;
  numPages: number;
  scale: number;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
}

export function PDFToolbar({
  currentPage,
  numPages,
  scale,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
}: PDFToolbarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
      {/* Navigation de page */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={numPages}
            value={currentPage}
            onChange={(e) => onPageChange(parseInt(e.target.value) || 1)}
            className="w-16 text-center"
          />
          <span className="text-sm text-gray-600">/ {numPages}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= numPages}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Contrôles de zoom */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onZoomOut}>
          <ZoomOut className="w-4 h-4" />
        </Button>

        <span className="text-sm font-medium min-w-[4rem] text-center">
          {Math.round(scale * 100)}%
        </span>

        <Button variant="outline" size="sm" onClick={onZoomIn}>
          <ZoomIn className="w-4 h-4" />
        </Button>

        <Button variant="outline" size="sm" onClick={onResetZoom}>
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
```

### Étape 1.7 : Refactoriser PDFViewerSheet

**Fichier: `components/PDFViewerSheet.tsx` (mise à jour)**

```typescript
'use client';

import React from 'react';
import { X, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PDFViewer } from './pdf/PDFViewer';
// ... imports existants

export function PDFViewerSheet({ /* props existants */ }) {
  // ... logique existante

  return (
    <>
      {/* Interface existante avec dropdown de documents */}
      <div className={/* styles existants */}>
        {/* Header avec sélecteur de documents */}
        <div className="flex items-center justify-between p-4 border-b">
          {/* ... sélecteur de documents existant ... */}
        </div>

        {/* REMPLACER l'iframe par PDFViewer */}
        <PDFViewer
          url={currentDocument?.signedUrl || null}
          initialPage={documentPositions[currentDocument?.id || ''] || 1}
          onPageChange={(page) => {
            if (currentDocument) {
              savePagePosition(currentDocument.id, page);
            }
          }}
          className="flex-1"
        />
      </div>

      {/* Floating restore button (inchangé) */}
      {/* ... */}
    </>
  );
}
```

---

## Phase 2 : Système d'annotations (3-4 jours)

### Objectif

Implémenter la sélection de texte, le surlignage, et le stockage des annotations

### Étape 2.1 : Couche de texte pour la sélection

**Fichier: `components/pdf/PDFTextLayer.tsx`**

```typescript
import React, { useEffect, useRef } from 'react';
import type { PDFPageProxy, TextContent } from 'pdfjs-dist';
import { renderTextLayer } from 'pdfjs-dist/web/pdf_viewer';
import 'pdfjs-dist/web/pdf_viewer.css';

interface PDFTextLayerProps {
  page: PDFPageProxy;
  scale: number;
  onTextSelected?: (text: string, rects: DOMRect[]) => void;
}

export function PDFTextLayer({ page, scale, onTextSelected }: PDFTextLayerProps) {
  const textLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!textLayerRef.current) return;

    const viewport = page.getViewport({ scale });
    const textLayerDiv = textLayerRef.current;

    // Nettoyer le contenu existant
    textLayerDiv.innerHTML = '';

    page.getTextContent().then((textContent: TextContent) => {
      renderTextLayer({
        textContentSource: textContent,
        container: textLayerDiv,
        viewport: viewport,
        textDivs: [],
      });
    });
  }, [page, scale]);

  // Gérer la sélection de texte
  useEffect(() => {
    if (!textLayerRef.current || !onTextSelected) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString().trim();
      if (!selectedText) return;

      // Récupérer les rectangles de la sélection
      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects());

      onTextSelected(selectedText, rects);
    };

    const element = textLayerRef.current;
    element.addEventListener('mouseup', handleMouseUp);

    return () => {
      element.removeEventListener('mouseup', handleMouseUp);
    };
  }, [onTextSelected]);

  const viewport = page.getViewport({ scale });

  return (
    <div
      ref={textLayerRef}
      className="textLayer"
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        opacity: 0.2,
        lineHeight: 1,
        width: viewport.width,
        height: viewport.height,
      }}
    />
  );
}
```

### Étape 2.2 : Hook de gestion de la sélection de texte

**Fichier: `components/pdf/hooks/useTextSelection.ts`**

```typescript
import { useState, useCallback } from "react";
import type { AnnotationRect } from "../types/annotation.types";

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
    ) => {
      // Convertir les coordonnées écran en coordonnées PDF
      const rects: AnnotationRect[] = domRects.map((rect) => ({
        x: rect.left - containerRect.left,
        y: rect.top - containerRect.top,
        width: rect.width,
        height: rect.height,
      }));

      setSelection({
        text,
        rects,
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
```

### Étape 2.3 : Hook de gestion des annotations avec Supabase

**Fichier: `components/pdf/hooks/usePDFAnnotations.ts`**

```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type {
  PDFAnnotation,
  CreateAnnotationDTO,
} from "../types/annotation.types";

export function usePDFAnnotations(
  documentId: string | null,
  organizationId: string,
) {
  const queryClient = useQueryClient();

  // Récupérer les annotations
  const { data: annotations, isLoading } = useQuery({
    queryKey: ["pdf-annotations", documentId],
    queryFn: async () => {
      if (!documentId) return [];

      const { data, error } = await supabase
        .from("pdf_annotations")
        .select("*")
        .eq("document_id", documentId)
        .is("deleted_at", null)
        .order("page_number", { ascending: true });

      if (error) throw error;
      return data as PDFAnnotation[];
    },
    enabled: !!documentId,
  });

  // Créer une annotation
  const createAnnotation = useMutation({
    mutationFn: async (dto: CreateAnnotationDTO) => {
      const { data, error } = await supabase.rpc(
        "create_annotation_with_context",
        {
          p_organization_id: organizationId,
          p_document_id: dto.documentId,
          p_requirement_id: dto.requirementId || null,
          p_annotation_type: dto.annotationType,
          p_page_number: dto.pageNumber,
          p_position: dto.position,
          p_highlighted_text: dto.highlightedText || null,
          p_note_content: dto.noteContent || null,
          p_color: dto.color || "#FFEB3B",
        },
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pdf-annotations", documentId],
      });
    },
  });

  // Supprimer une annotation (soft delete)
  const deleteAnnotation = useMutation({
    mutationFn: async (annotationId: string) => {
      const { error } = await supabase
        .from("pdf_annotations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", annotationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pdf-annotations", documentId],
      });
    },
  });

  // Mettre à jour une annotation
  const updateAnnotation = useMutation({
    mutationFn: async ({
      id,
      noteContent,
      color,
    }: {
      id: string;
      noteContent?: string;
      color?: string;
    }) => {
      const { error } = await supabase
        .from("pdf_annotations")
        .update({
          note_content: noteContent,
          color: color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pdf-annotations", documentId],
      });
    },
  });

  return {
    annotations: annotations || [],
    isLoading,
    createAnnotation: createAnnotation.mutate,
    deleteAnnotation: deleteAnnotation.mutate,
    updateAnnotation: updateAnnotation.mutate,
    isCreating: createAnnotation.isPending,
  };
}
```

### Étape 2.4 : Composant de surlignage

**Fichier: `components/pdf/annotations/AnnotationHighlight.tsx`**

```typescript
import React, { useState } from 'react';
import type { PDFAnnotation } from '../types/annotation.types';
import { Trash2, MessageSquare, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';

interface AnnotationHighlightProps {
  annotation: PDFAnnotation;
  scale: number;
  onDelete: (id: string) => void;
  onUpdate: (id: string, noteContent: string) => void;
}

export function AnnotationHighlight({ annotation, scale, onDelete, onUpdate }: AnnotationHighlightProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [noteContent, setNoteContent] = useState(annotation.noteContent || '');

  const handleSave = () => {
    onUpdate(annotation.id, noteContent);
    setIsEditing(false);
  };

  return (
    <>
      {annotation.position.rects.map((rect, index) => (
        <Popover key={index}>
          <PopoverTrigger asChild>
            <div
              className="absolute cursor-pointer hover:opacity-70 transition-opacity"
              style={{
                left: rect.x * scale,
                top: rect.y * scale,
                width: rect.width * scale,
                height: rect.height * scale,
                backgroundColor: annotation.color,
                opacity: 0.3,
                pointerEvents: 'auto',
              }}
            />
          </PopoverTrigger>

          <PopoverContent className="w-80" side="top">
            <div className="space-y-2">
              {/* Texte surligné */}
              {annotation.highlightedText && (
                <div className="text-sm italic text-gray-700 border-l-2 border-yellow-400 pl-2">
                  "{annotation.highlightedText}"
                </div>
              )}

              {/* Note */}
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Ajouter une note..."
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSave}>
                      Enregistrer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {annotation.noteContent && (
                    <p className="text-sm text-gray-600">{annotation.noteContent}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      {annotation.noteContent ? 'Modifier' : 'Ajouter une note'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDelete(annotation.id)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Supprimer
                    </Button>
                  </div>
                </>
              )}

              {/* Métadonnées */}
              <div className="text-xs text-gray-500 pt-2 border-t">
                Page {annotation.pageNumber} • {new Date(annotation.createdAt).toLocaleDateString('fr-FR')}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      ))}
    </>
  );
}
```

### Étape 2.5 : Couche d'annotations

**Fichier: `components/pdf/PDFAnnotationLayer.tsx`**

```typescript
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
  const pageAnnotations = annotations.filter((a) => a.pageNumber === pageNumber);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        width: pageWidth * scale,
        height: pageHeight * scale,
      }}
    >
      {pageAnnotations.map((annotation) => (
        <AnnotationHighlight
          key={annotation.id}
          annotation={annotation}
          scale={scale}
          onDelete={onDeleteAnnotation}
          onUpdate={onUpdateAnnotation}
        />
      ))}
    </div>
  );
}
```

### Étape 2.6 : Intégration dans PDFPage

**Mise à jour de `components/pdf/PDFPage.tsx`**

```typescript
// Ajouter les imports
import { PDFTextLayer } from './PDFTextLayer';
import { PDFAnnotationLayer } from './PDFAnnotationLayer';
import type { PDFAnnotation } from './types/annotation.types';

// Ajouter aux props
interface PDFPageProps {
  // ... props existants
  annotations?: PDFAnnotation[];
  onTextSelected?: (text: string, rects: DOMRect[]) => void;
  onDeleteAnnotation?: (id: string) => void;
  onUpdateAnnotation?: (id: string, noteContent: string) => void;
}

// Dans le composant, après le canvas
return (
  <div className={className} style={{ width: viewport.width, height: viewport.height, position: 'relative' }}>
    <canvas ref={canvasRef} />

    {/* Couche de texte */}
    {page && (
      <PDFTextLayer
        page={page}
        scale={scale}
        onTextSelected={(text, rects) => {
          if (onTextSelected) {
            const containerRect = canvasRef.current?.getBoundingClientRect();
            if (containerRect) {
              onTextSelected(text, rects);
            }
          }
        }}
      />
    )}

    {/* Couche d'annotations */}
    {page && annotations && (
      <PDFAnnotationLayer
        annotations={annotations}
        pageNumber={pageNumber}
        scale={scale}
        pageWidth={viewport.width}
        pageHeight={viewport.height}
        onDeleteAnnotation={onDeleteAnnotation || (() => {})}
        onUpdateAnnotation={onUpdateAnnotation || (() => {})}
      />
    )}
  </div>
);
```

---

## Phase 3 : Navigation bidirectionnelle (1-2 jours)

### Objectif

Permettre de naviguer depuis l'évaluation vers une annotation et vice-versa

### Étape 3.1 : Ajout d'un contexte d'annotation

**Fichier: `components/pdf/contexts/PDFAnnotationContext.tsx`**

```typescript
import React, { createContext, useContext, useState, useCallback } from 'react';

interface NavigationTarget {
  documentId: string;
  pageNumber: number;
  annotationId?: string;
}

interface PDFAnnotationContextValue {
  navigationTarget: NavigationTarget | null;
  navigateToAnnotation: (target: NavigationTarget) => void;
  clearNavigation: () => void;
}

const PDFAnnotationContext = createContext<PDFAnnotationContextValue | undefined>(undefined);

export function PDFAnnotationProvider({ children }: { children: React.ReactNode }) {
  const [navigationTarget, setNavigationTarget] = useState<NavigationTarget | null>(null);

  const navigateToAnnotation = useCallback((target: NavigationTarget) => {
    setNavigationTarget(target);
  }, []);

  const clearNavigation = useCallback(() => {
    setNavigationTarget(null);
  }, []);

  return (
    <PDFAnnotationContext.Provider value={{ navigationTarget, navigateToAnnotation, clearNavigation }}>
      {children}
    </PDFAnnotationContext.Provider>
  );
}

export function usePDFAnnotationNavigation() {
  const context = useContext(PDFAnnotationContext);
  if (!context) {
    throw new Error('usePDFAnnotationNavigation must be used within PDFAnnotationProvider');
  }
  return context;
}
```

### Étape 3.2 : Hook de navigation

**Fichier: `components/pdf/hooks/usePDFNavigation.ts`**

```typescript
import { useEffect } from "react";
import { usePDFAnnotationNavigation } from "../contexts/PDFAnnotationContext";

export function usePDFNavigation(
  documentId: string | null,
  currentPage: number,
  onPageChange: (page: number) => void,
  onDocumentChange?: (documentId: string) => void,
) {
  const { navigationTarget, clearNavigation } = usePDFAnnotationNavigation();

  useEffect(() => {
    if (!navigationTarget) return;

    // Changer de document si nécessaire
    if (documentId !== navigationTarget.documentId && onDocumentChange) {
      onDocumentChange(navigationTarget.documentId);
    }

    // Naviguer vers la page
    if (navigationTarget.pageNumber !== currentPage) {
      onPageChange(navigationTarget.pageNumber);
    }

    // Si une annotation spécifique est ciblée, on peut la mettre en évidence
    if (navigationTarget.annotationId) {
      // TODO: Animer/scroller vers l'annotation
      setTimeout(() => {
        const element = document.getElementById(
          `annotation-${navigationTarget.annotationId}`,
        );
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
    }

    // Nettoyer après navigation
    const timer = setTimeout(clearNavigation, 1000);
    return () => clearTimeout(timer);
  }, [
    navigationTarget,
    documentId,
    currentPage,
    onPageChange,
    onDocumentChange,
    clearNavigation,
  ]);
}
```

### Étape 3.3 : Liste des annotations dans l'évaluation

**Fichier: `components/pdf/annotations/AnnotationList.tsx`**

```typescript
import React from 'react';
import type { PDFAnnotation } from '../types/annotation.types';
import { usePDFAnnotationNavigation } from '../contexts/PDFAnnotationContext';
import { FileText, MapPin, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AnnotationListProps {
  annotations: PDFAnnotation[];
  requirementId?: string;
  title?: string;
}

export function AnnotationList({ annotations, requirementId, title }: AnnotationListProps) {
  const { navigateToAnnotation } = usePDFAnnotationNavigation();

  const filteredAnnotations = requirementId
    ? annotations.filter((a) => a.requirementId === requirementId)
    : annotations;

  if (filteredAnnotations.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic">
        Aucune annotation pour ce requirement
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {title && <h4 className="font-medium text-sm">{title}</h4>}

      {filteredAnnotations.map((annotation) => (
        <Card key={annotation.id} className="p-3 hover:bg-gray-50 transition-colors">
          <div className="flex items-start gap-2">
            {/* Icône selon le type */}
            <div className="mt-1">
              {annotation.annotationType === 'highlight' && (
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: annotation.color }}
                />
              )}
              {annotation.annotationType === 'bookmark' && (
                <MapPin className="w-4 h-4 text-blue-600" />
              )}
              {annotation.annotationType === 'note' && (
                <MessageSquare className="w-4 h-4 text-green-600" />
              )}
            </div>

            {/* Contenu */}
            <div className="flex-1 min-w-0">
              {annotation.highlightedText && (
                <p className="text-sm text-gray-700 line-clamp-2 italic">
                  "{annotation.highlightedText}"
                </p>
              )}
              {annotation.noteContent && (
                <p className="text-sm text-gray-600 mt-1">{annotation.noteContent}</p>
              )}
              <div className="text-xs text-gray-500 mt-1">
                Page {annotation.pageNumber}
              </div>
            </div>

            {/* Bouton de navigation */}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                navigateToAnnotation({
                  documentId: annotation.documentId,
                  pageNumber: annotation.pageNumber,
                  annotationId: annotation.id,
                })
              }
            >
              <FileText className="w-3 h-3 mr-1" />
              Voir
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

### Étape 3.4 : Intégration dans ComparisonView

**Mise à jour de `components/ComparisonView.tsx`**

```typescript
// Ajouter l'import
import { AnnotationList } from './pdf/annotations/AnnotationList';
import { usePDFAnnotations } from './pdf/hooks/usePDFAnnotations';

// Dans le composant, après avoir récupéré le requirement actuel
const currentRequirement = requirements[currentIndex];

// Récupérer les annotations pour les documents du supplier actuel
const { annotations } = usePDFAnnotations(
  currentSupplierDocumentId, // À définir selon le supplier actif
  organizationId
);

// Dans le rendu, ajouter une section "Preuves documentaires"
<div className="mt-4">
  <AnnotationList
    annotations={annotations}
    requirementId={currentRequirement?.id}
    title="📎 Preuves documentaires"
  />
</div>
```

---

## Phase 4 : Panel d'annotations et finitions (2 jours)

### Étape 4.1 : Toolbar avec mode annotation

**Mise à jour de `components/pdf/PDFToolbar.tsx`**

```typescript
// Ajouter aux props
interface PDFToolbarProps {
  // ... props existants
  annotationMode: 'select' | 'highlight' | 'bookmark';
  onAnnotationModeChange: (mode: 'select' | 'highlight' | 'bookmark') => void;
  selectedColor: string;
  onColorChange: (color: string) => void;
}

// Ajouter dans le rendu
<div className="flex items-center gap-2 border-l pl-2">
  <Button
    variant={annotationMode === 'select' ? 'default' : 'outline'}
    size="sm"
    onClick={() => onAnnotationModeChange('select')}
  >
    Sélectionner
  </Button>
  <Button
    variant={annotationMode === 'highlight' ? 'default' : 'outline'}
    size="sm"
    onClick={() => onAnnotationModeChange('highlight')}
  >
    Surligner
  </Button>
  <Button
    variant={annotationMode === 'bookmark' ? 'default' : 'outline'}
    size="sm"
    onClick={() => onAnnotationModeChange('bookmark')}
  >
    Marquer
  </Button>

  {/* Color picker */}
  <AnnotationColorPicker
    selectedColor={selectedColor}
    onColorChange={onColorChange}
  />
</div>
```

### Étape 4.2 : Sélecteur de couleur

**Fichier: `components/pdf/annotations/AnnotationColorPicker.tsx`**

```typescript
import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const COLORS = [
  { name: 'Jaune', value: '#FFEB3B' },
  { name: 'Vert', value: '#4CAF50' },
  { name: 'Bleu', value: '#2196F3' },
  { name: 'Orange', value: '#FF9800' },
  { name: 'Rose', value: '#E91E63' },
  { name: 'Violet', value: '#9C27B0' },
];

interface AnnotationColorPickerProps {
  selectedColor: string;
  onColorChange: (color: string) => void;
}

export function AnnotationColorPicker({ selectedColor, onColorChange }: AnnotationColorPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-10 h-10 p-0">
          <div
            className="w-6 h-6 rounded border-2 border-gray-300"
            style={{ backgroundColor: selectedColor }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-40">
        <div className="grid grid-cols-3 gap-2">
          {COLORS.map((color) => (
            <button
              key={color.value}
              className={`w-10 h-10 rounded border-2 ${
                selectedColor === color.value ? 'border-blue-600' : 'border-gray-300'
              }`}
              style={{ backgroundColor: color.value }}
              onClick={() => onColorChange(color.value)}
              title={color.name}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

### Étape 4.3 : Panel latéral d'annotations

**Fichier: `components/pdf/PDFAnnotationPanel.tsx`**

```typescript
import React, { useState } from 'react';
import type { PDFAnnotation } from './types/annotation.types';
import { AnnotationList } from './annotations/AnnotationList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';

interface PDFAnnotationPanelProps {
  annotations: PDFAnnotation[];
  onNavigate: (documentId: string, pageNumber: number, annotationId?: string) => void;
}

export function PDFAnnotationPanel({ annotations, onNavigate }: PDFAnnotationPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  const filteredAnnotations = annotations.filter((a) => {
    const matchesSearch =
      searchTerm === '' ||
      a.highlightedText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.noteContent?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || a.annotationType === filterType;

    return matchesSearch && matchesType;
  });

  const groupedByPage = filteredAnnotations.reduce((acc, annotation) => {
    const page = annotation.pageNumber;
    if (!acc[page]) acc[page] = [];
    acc[page].push(annotation);
    return acc;
  }, {} as Record<number, PDFAnnotation[]>);

  return (
    <div className="h-full flex flex-col border-l bg-white">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-3">Annotations ({annotations.length})</h3>

        {/* Recherche */}
        <div className="relative mb-3">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Filtres */}
        <Tabs value={filterType} onValueChange={setFilterType}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">Tout</TabsTrigger>
            <TabsTrigger value="highlight">Surlignage</TabsTrigger>
            <TabsTrigger value="bookmark">Signets</TabsTrigger>
            <TabsTrigger value="note">Notes</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        {Object.entries(groupedByPage)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([page, pageAnnotations]) => (
            <div key={page}>
              <h4 className="font-medium text-sm mb-2 text-gray-600">Page {page}</h4>
              <AnnotationList annotations={pageAnnotations} />
            </div>
          ))}

        {filteredAnnotations.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <p>Aucune annotation trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Fichiers de configuration

### package.json (dépendances à ajouter)

```json
{
  "dependencies": {
    "react-pdf": "^7.7.0",
    "pdfjs-dist": "^3.11.174"
  },
  "devDependencies": {
    "@types/pdfjs-dist": "^2.10.378"
  }
}
```

### Configuration TypeScript

**tsconfig.json** (ajouter si nécessaire)

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./components/*"]
    }
  }
}
```

---

## APIs Supabase à créer

### Route pour récupérer les annotations d'un document

**Fichier: `app/api/documents/[documentId]/annotations/route.ts`**

```typescript
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { documentId: string } },
) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data, error } = await supabase
    .from("annotation_details")
    .select("*")
    .eq("document_id", params.documentId)
    .order("page_number", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

---

## Résumé de l'implémentation

### Phase 1 (2-3 jours) : Fondations PDF.js

- ✅ Migration de l'iframe vers react-pdf
- ✅ Rendu multi-pages avec canvas
- ✅ Navigation et zoom
- ✅ Barre d'outils

### Phase 2 (3-4 jours) : Annotations

- ✅ Couche de texte sélectionnable
- ✅ Création de surlignages
- ✅ Stockage en base de données
- ✅ Affichage des annotations
- ✅ Édition et suppression

### Phase 3 (1-2 jours) : Navigation

- ✅ Contexte de navigation
- ✅ Navigation depuis l'évaluation vers le PDF
- ✅ Liste des annotations par requirement
- ✅ Intégration dans ComparisonView

### Phase 4 (2 jours) : Finitions

- ✅ Modes d'annotation (sélection, surlignage, bookmark)
- ✅ Sélecteur de couleur
- ✅ Panel latéral d'annotations
- ✅ Recherche et filtres
- ✅ Groupement d'annotations

### Total estimé : 8-11 jours de développement

---

## Points d'attention

1. **Performance** : Pour les PDFs volumineux (>100 pages), implémenter un système de lazy-loading des pages
2. **Synchronisation** : Utiliser Supabase Realtime pour sync multi-utilisateurs
3. **Export** : Prévoir l'export des annotations (PDF annoté, rapport)
4. **Mobile** : Adapter l'interface pour tablettes
5. **Accessibilité** : Gérer le contraste des couleurs de surlignage
6. **Permissions** : Vérifier les RLS policies pour la sécurité

---

## Prochaines étapes recommandées

1. **Validation** : Revoir ce plan avec l'équipe
2. **Prototype** : Commencer par la Phase 1 sur un environnement de dev
3. **Tests utilisateurs** : Valider l'UX du système d'annotations
4. **Itération** : Ajuster selon les retours
