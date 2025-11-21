import React from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Highlighter, Bookmark, MousePointer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PDFToolbarProps } from './types/pdf.types';

export function PDFToolbar({
  currentPage,
  numPages,
  scale,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  annotationMode = 'select',
  onAnnotationModeChange,
  selectedColor = '#FFEB3B',
  onColorChange,
}: PDFToolbarProps) {
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= numPages) {
      onPageChange(value);
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white border-b gap-4 flex-wrap">
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
            onChange={handlePageInputChange}
            className="w-16 text-center h-9"
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

        <Button variant="outline" size="sm" onClick={onResetZoom} title="Réinitialiser le zoom">
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Modes d'annotation */}
      {onAnnotationModeChange && (
        <div className="flex items-center gap-2 border-l pl-2">
          <Button
            variant={annotationMode === 'select' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onAnnotationModeChange('select')}
            title="Mode sélection"
          >
            <MousePointer className="w-4 h-4 mr-1" />
            Sélectionner
          </Button>

          <Button
            variant={annotationMode === 'highlight' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onAnnotationModeChange('highlight')}
            title="Mode surlignage"
          >
            <Highlighter className="w-4 h-4 mr-1" />
            Surligner
          </Button>

          <Button
            variant={annotationMode === 'bookmark' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onAnnotationModeChange('bookmark')}
            title="Ajouter un signet"
          >
            <Bookmark className="w-4 h-4 mr-1" />
            Signet
          </Button>

          {/* Color picker - seulement en mode surlignage */}
          {annotationMode === 'highlight' && onColorChange && (
            <div className="flex items-center gap-1 border-l pl-2">
              <span className="text-xs text-gray-600">Couleur:</span>
              <button
                className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"
                style={{ backgroundColor: selectedColor }}
                onClick={() => {
                  // Pour l'instant, on bascule entre quelques couleurs
                  const colors = ['#FFEB3B', '#4CAF50', '#2196F3', '#FF9800', '#E91E63'];
                  const currentIndex = colors.indexOf(selectedColor);
                  const nextColor = colors[(currentIndex + 1) % colors.length];
                  onColorChange(nextColor);
                }}
                title="Changer de couleur"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
