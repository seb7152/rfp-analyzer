// Types pour le système d'annotations PDF

export type AnnotationType = 'highlight' | 'bookmark' | 'note' | 'area';

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

export interface UpdateAnnotationDTO {
  id: string;
  noteContent?: string;
  color?: string;
  tags?: string[];
}
