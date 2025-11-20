import React, { useState, useMemo } from 'react';
import type { PDFAnnotation } from './types/annotation.types';
import { AnnotationList } from './annotations/AnnotationList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Search, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PDFAnnotationPanelProps {
  annotations: PDFAnnotation[];
  className?: string;
}

export function PDFAnnotationPanel({ annotations, className = '' }: PDFAnnotationPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Filtrer et rechercher
  const filteredAnnotations = useMemo(() => {
    return annotations.filter((a) => {
      const matchesSearch =
        searchTerm === '' ||
        a.highlightedText?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.noteContent?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = filterType === 'all' || a.annotationType === filterType;

      return matchesSearch && matchesType;
    });
  }, [annotations, searchTerm, filterType]);

  // Grouper par page
  const groupedByPage = useMemo(() => {
    return filteredAnnotations.reduce(
      (acc, annotation) => {
        const page = annotation.pageNumber;
        if (!acc[page]) acc[page] = [];
        acc[page].push(annotation);
        return acc;
      },
      {} as Record<number, PDFAnnotation[]>
    );
  }, [filteredAnnotations]);

  const pages = Object.keys(groupedByPage)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className={`h-full flex flex-col border-l bg-white ${className}`}>
      {/* En-tête */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-lg">Annotations</h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {annotations.length}
          </span>
        </div>

        {/* Recherche */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher dans les annotations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Filtres par type */}
        <Tabs value={filterType} onValueChange={setFilterType} className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all" className="text-xs">
              Tout
            </TabsTrigger>
            <TabsTrigger value="highlight" className="text-xs">
              🖍️
            </TabsTrigger>
            <TabsTrigger value="bookmark" className="text-xs">
              📌
            </TabsTrigger>
            <TabsTrigger value="note" className="text-xs">
              📝
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Liste des annotations */}
      <div className="flex-1 overflow-auto">
        {filteredAnnotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="text-gray-400 mb-2">
              <Filter className="w-12 h-12 mx-auto mb-2" />
            </div>
            <p className="text-sm text-gray-600 font-medium">Aucune annotation trouvée</p>
            <p className="text-xs text-gray-500 mt-1">
              {searchTerm
                ? 'Essayez avec des mots-clés différents'
                : 'Surlignez du texte pour créer votre première annotation'}
            </p>
            {searchTerm && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearchTerm('')}>
                Effacer la recherche
              </Button>
            )}
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {pages.map((page) => (
              <div key={page}>
                <div className="sticky top-0 bg-white/95 backdrop-blur-sm py-2 mb-2 border-b">
                  <h4 className="font-medium text-sm text-gray-700">
                    Page {page}{' '}
                    <span className="text-xs text-gray-500 font-normal">
                      ({groupedByPage[page].length} annotation
                      {groupedByPage[page].length > 1 ? 's' : ''})
                    </span>
                  </h4>
                </div>
                <AnnotationList annotations={groupedByPage[page]} compact />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Statistiques */}
      {filteredAnnotations.length > 0 && (
        <div className="p-3 border-t bg-gray-50">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-gray-600">Surlignages</p>
              <p className="text-lg font-semibold text-yellow-600">
                {annotations.filter((a) => a.annotationType === 'highlight').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Signets</p>
              <p className="text-lg font-semibold text-blue-600">
                {annotations.filter((a) => a.annotationType === 'bookmark').length}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Notes</p>
              <p className="text-lg font-semibold text-green-600">
                {annotations.filter((a) => a.annotationType === 'note').length}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
