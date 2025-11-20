// Types pour PDF.js
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';

export type { PDFDocumentProxy, PDFPageProxy };

export interface PDFViewerProps {
  url: string | null;
  initialPage?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export interface PDFPageProps {
  document: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  onPageLoad?: (page: PDFPageProxy) => void;
  className?: string;
}

export interface PDFToolbarProps {
  currentPage: number;
  numPages: number;
  scale: number;
  onPageChange: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  annotationMode?: 'select' | 'highlight' | 'bookmark';
  onAnnotationModeChange?: (mode: 'select' | 'highlight' | 'bookmark') => void;
  selectedColor?: string;
  onColorChange?: (color: string) => void;
}
