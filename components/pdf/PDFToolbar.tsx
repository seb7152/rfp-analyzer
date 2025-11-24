"use client";

import React, { useState, useMemo } from "react";
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
}: PDFToolbarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= numPages) {
      onPageChange(value);
    }
  };

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
          type="number"
          min={1}
          max={numPages}
          value={currentPage}
          onChange={handlePageInputChange}
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
