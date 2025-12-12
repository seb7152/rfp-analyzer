"use client";

import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Bookmark,
  MousePointer,
  List,
  Search,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { PDFToolbarProps } from "./types/pdf.types";
import type { PDFAnnotation, RequirementInfo } from "./types/annotation.types";
import type { SearchResult } from "./types/search.types";

interface ExtendedPDFToolbarProps extends PDFToolbarProps {
  searchQuery?: string;
  searchResults?: SearchResult[];
  currentResultIndex?: number;
  isExtracting?: boolean;
  onSearchChange?: (query: string) => void;
  onNavigateResult?: (direction: "next" | "previous") => void;
  onClearSearch?: () => void;
}

export function PDFToolbar({
  currentPage,
  numPages,
  scale,
  onPageChange,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  annotationMode = "select",
  onAnnotationModeChange,
  annotations = [],
  requirements = [],
  searchQuery = "",
  searchResults = [],
  currentResultIndex = -1,
  isExtracting = false,
  onSearchChange,
  onNavigateResult,
  onClearSearch,
}: ExtendedPDFToolbarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const pageInputRef = useRef<HTMLInputElement>(null);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Permettre les valeurs partielles pendant la saisie
    if (value === "") {
      onPageChange(1); // Valeur par défaut si vide
      return;
    }

    const pageNum = parseInt(value);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
      onPageChange(pageNum);
    }
  };

  const handlePageInputFocus = () => {
    // Sélectionner tout le contenu au focus pour faciliter l'édition
    if (pageInputRef.current) {
      pageInputRef.current.select();
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permettre la navigation avec Entrée
    if (e.key === "Enter") {
      const value = e.currentTarget.value;
      const pageNum = parseInt(value);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= numPages) {
        onPageChange(pageNum);
        e.currentTarget.blur();
      }
    }
    // Échap pour annuler
    if (e.key === "Escape") {
      e.currentTarget.value = currentPage.toString();
      e.currentTarget.blur();
    }
  };

  // Gérer la recherche
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      onSearchChange?.(value);
    },
    [onSearchChange]
  );

  const handleClearSearch = useCallback(() => {
    setSearchTerm("");
    onClearSearch?.();
  }, [onClearSearch]);

  const handleNextResult = useCallback(() => {
    onNavigateResult?.("next");
  }, [onNavigateResult]);

  const handlePreviousResult = useCallback(() => {
    onNavigateResult?.("previous");
  }, [onNavigateResult]);

  // Synchroniser le searchQuery externe avec l'état local
  useEffect(() => {
    if (searchQuery !== searchTerm) {
      setSearchTerm(searchQuery);
    }
  }, [searchQuery, searchTerm]);

  // Gérer les raccourcis clavier
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F pour focus la recherche
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setIsSearchFocused(true);
      }
      // Échap pour effacer la recherche
      if (e.key === "Escape" && isSearchFocused) {
        handleClearSearch();
        setIsSearchFocused(false);
      }
      // F3 ou Entrée pour résultat suivant
      if ((e.key === "F3" || e.key === "Enter") && isSearchFocused) {
        e.preventDefault();
        handleNextResult();
      }
      // Shift+F3 pour résultat précédent
      if (e.shiftKey && e.key === "F3" && isSearchFocused) {
        e.preventDefault();
        handlePreviousResult();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isSearchFocused,
    handleClearSearch,
    handleNextResult,
    handlePreviousResult,
  ]);

  const bookmarks = useMemo(() => {
    return (annotations as PDFAnnotation[])
      .filter((a) => a.annotationType === "bookmark")
      .map((bookmark) => {
        const req = (requirements as RequirementInfo[]).find(
          (r) => r.id === bookmark.requirementId
        );
        return {
          ...bookmark,
          displayName: req
            ? `${req.requirement_id_external} - ${req.title}`
            : bookmark.noteContent ||
              bookmark.highlightedText ||
              `Signet page ${bookmark.pageNumber}`,
        };
      })
      .filter((b) =>
        b.displayName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => a.pageNumber - b.pageNumber);
  }, [annotations, requirements, searchTerm]);

  return (
    <div className="flex items-center justify-start px-2 py-2 bg-white border-b gap-2 overflow-x-auto flex-wrap">
      {/* Navigation de page */}
      <div className="flex items-center gap-1 min-w-fit">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <Input
          ref={pageInputRef}
          type="text"
          min={1}
          max={numPages}
          value={currentPage}
          onChange={handlePageInputChange}
          onFocus={handlePageInputFocus}
          onKeyDown={handlePageInputKeyDown}
          placeholder="1"
          className="w-12 text-center h-8 text-sm p-1"
        />

        <span className="text-sm text-gray-600 whitespace-nowrap">
          / {numPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= numPages}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Barre de recherche */}
      <div className="flex items-center gap-1 min-w-fit border-l pl-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input
            type="text"
            placeholder={
              isExtracting
                ? "Extraction du texte..."
                : "Rechercher dans le PDF..."
            }
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            disabled={isExtracting}
            className="pl-8 h-8 text-sm w-48 lg:w-64"
          />
          {isExtracting && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          {searchTerm && !isExtracting && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {/* Navigation des résultats */}
        {searchResults.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <span className="whitespace-nowrap">
              {currentResultIndex + 1} / {searchResults.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousResult}
              disabled={searchResults.length === 0}
              className="h-6 w-6 p-0"
              title="Résultat précédent (Shift+F3)"
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextResult}
              disabled={searchResults.length === 0}
              className="h-6 w-6 p-0"
              title="Résultat suivant (F3)"
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Contrôles de zoom */}
      <div className="flex items-center gap-1 min-w-fit border-l pl-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onZoomOut}
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>

        <span className="text-xs font-medium w-10 text-center whitespace-nowrap">
          {Math.round(scale * 100)}%
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={onZoomIn}
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onResetZoom}
          title="Réinitialiser le zoom"
          className="h-8 w-8 p-0"
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Modes d'annotation */}
      {onAnnotationModeChange && (
        <div className="flex items-center gap-1 border-l pl-2 min-w-fit">
          <Button
            variant={annotationMode === "select" ? "secondary" : "outline"}
            size="sm"
            onClick={() => onAnnotationModeChange("select")}
            title="Mode sélection"
            className="h-8 px-2 text-xs"
          >
            <MousePointer className="w-3 h-3 mr-1" />
            Sélection
          </Button>

          <Button
            variant={annotationMode === "bookmark" ? "secondary" : "outline"}
            size="sm"
            onClick={() => onAnnotationModeChange("bookmark")}
            title="Ajouter un signet"
            className="h-8 px-2 text-xs"
          >
            <Bookmark className="w-3 h-3 mr-1" />
            Signet
          </Button>

          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                title="Liste des signets"
                className="h-8 px-2 text-xs ml-1"
              >
                <List className="w-3 h-3 mr-1" />
                Liste
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="start">
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Rechercher un signet..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-8 text-xs"
                  />
                </div>
              </div>
              <ScrollArea className="h-64">
                {bookmarks.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500">
                    Aucun signet trouvé
                  </div>
                ) : (
                  <div className="p-1">
                    {bookmarks.map((bookmark) => (
                      <button
                        key={bookmark.id}
                        onClick={() => {
                          onPageChange(bookmark.pageNumber);
                          setIsPopoverOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-sm text-xs flex items-start gap-2 group"
                      >
                        <Bookmark className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-slate-700 dark:text-slate-200 line-clamp-2">
                            {bookmark.displayName}
                          </div>
                          <div className="text-slate-400 mt-0.5">
                            Page {bookmark.pageNumber}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>
      )}
    </div>
  );
}
