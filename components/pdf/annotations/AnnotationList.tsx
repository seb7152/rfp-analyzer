import React from 'react';
import type { PDFAnnotation } from '../types/annotation.types';
import { usePDFAnnotationNavigation } from '../contexts/PDFAnnotationContext';
import { FileText, MapPin, MessageSquare, Highlighter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface AnnotationListProps {
  annotations: PDFAnnotation[];
  requirementId?: string;
  title?: string;
  compact?: boolean;
}

export function AnnotationList({
  annotations,
  requirementId,
  title,
  compact = false,
}: AnnotationListProps) {
  const { navigateToAnnotation } = usePDFAnnotationNavigation();

  // Filtrer par requirement si spécifié
  const filteredAnnotations = requirementId
    ? annotations.filter((a) => a.requirementId === requirementId)
    : annotations;

  if (filteredAnnotations.length === 0) {
    return (
      <div className="text-sm text-gray-500 italic p-4 text-center bg-gray-50 rounded">
        Aucune annotation{requirementId ? ' pour ce requirement' : ''}
      </div>
    );
  }

  const getAnnotationIcon = (type: string, color?: string) => {
    switch (type) {
      case 'highlight':
        return (
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ backgroundColor: color || '#FFEB3B' }}
          >
            <Highlighter className="w-3 h-3 text-gray-700" />
          </div>
        );
      case 'bookmark':
        return <MapPin className="w-5 h-5 text-blue-600" />;
      case 'note':
        return <MessageSquare className="w-5 h-5 text-green-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-2">
      {title && <h4 className="font-medium text-sm mb-3">{title}</h4>}

      <div className={`space-y-${compact ? '1' : '2'}`}>
        {filteredAnnotations.map((annotation) => (
          <Card
            key={annotation.id}
            className={`${compact ? 'p-2' : 'p-3'} hover:bg-gray-50 transition-colors cursor-pointer`}
            onClick={() =>
              navigateToAnnotation({
                documentId: annotation.documentId,
                pageNumber: annotation.pageNumber,
                annotationId: annotation.id,
                highlight: true,
              })
            }
          >
            <div className="flex items-start gap-2">
              {/* Icône selon le type */}
              <div className="mt-0.5 flex-shrink-0">
                {getAnnotationIcon(annotation.annotationType, annotation.color)}
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                {/* Texte surligné */}
                {annotation.highlightedText && (
                  <p
                    className={`${compact ? 'text-xs' : 'text-sm'} text-gray-700 line-clamp-2 italic mb-1`}
                  >
                    "{annotation.highlightedText}"
                  </p>
                )}

                {/* Note */}
                {annotation.noteContent && (
                  <p
                    className={`${compact ? 'text-xs' : 'text-sm'} text-gray-600 line-clamp-2`}
                  >
                    💬 {annotation.noteContent}
                  </p>
                )}

                {/* Métadonnées */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">Page {annotation.pageNumber}</span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-500">
                    {new Date(annotation.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </span>
                  {annotation.tags && annotation.tags.length > 0 && (
                    <>
                      <span className="text-xs text-gray-400">•</span>
                      <div className="flex gap-1">
                        {annotation.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bouton de navigation (optionnel en mode compact) */}
              {!compact && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToAnnotation({
                      documentId: annotation.documentId,
                      pageNumber: annotation.pageNumber,
                      annotationId: annotation.id,
                      highlight: true,
                    });
                  }}
                >
                  <FileText className="w-3 h-3 mr-1" />
                  Voir
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Compteur */}
      <div className="text-xs text-gray-500 text-center pt-2 border-t">
        {filteredAnnotations.length} annotation{filteredAnnotations.length > 1 ? 's' : ''}
      </div>
    </div>
  );
}
