"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2, AlertCircle, ChevronRight } from "lucide-react";

interface PDFDocument {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
}

interface PDFViewerSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  documents: PDFDocument[];
  rfpId?: string;
}

export function PDFViewerSheet({
  isOpen,
  onOpenChange,
  documents,
  rfpId,
}: PDFViewerSheetProps) {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Filter to only PDF documents
  const pdfDocuments = documents.filter((doc) => doc.mime_type === "application/pdf");
  const selectedDoc = pdfDocuments.find((doc) => doc.id === selectedDocId);

  // Initialize selected document
  useEffect(() => {
    if (isOpen && pdfDocuments.length > 0 && !selectedDocId) {
      setSelectedDocId(pdfDocuments[0].id);
    }
  }, [isOpen, pdfDocuments, selectedDocId]);

  // Fetch PDF URL when selected document changes
  useEffect(() => {
    if (!selectedDoc || !rfpId) {
      setPdfUrl(null);
      return;
    }

    const fetchPdfUrl = async () => {
      setIsLoadingPdf(true);
      setUrlError(null);
      setPdfUrl(null);

      try {
        const response = await fetch(
          `/api/rfps/${rfpId}/documents/${selectedDoc.id}/view-url`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get PDF URL");
        }

        const data = await response.json();
        setPdfUrl(data.url);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setUrlError(errorMessage);
        console.error("Error fetching PDF URL:", err);
      } finally {
        setIsLoadingPdf(false);
      }
    };

    fetchPdfUrl();
  }, [selectedDoc, rfpId]);

  const handleDocumentChange = (docId: string) => {
    setSelectedDocId(docId);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPdfUrl(null);
      setUrlError(null);
      setSelectedDocId(null);
    }
    onOpenChange(open);
  };

  // Don't render sheet if no PDF documents
  if (pdfDocuments.length === 0) {
    return null;
  }

  return (
    <Sheet open={isOpen && !isMinimized} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="!w-1/2 !max-w-none flex flex-col p-0 border-l [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {/* Header avec sélecteur et boutons */}
        <div className="border-b px-6 py-3 flex items-center justify-between gap-4">
          {/* Sélecteur de document */}
          <Select value={selectedDocId || ""} onValueChange={handleDocumentChange}>
            <SelectTrigger className="flex-1 max-w-xs">
              <SelectValue placeholder="Select a PDF document" />
            </SelectTrigger>
            <SelectContent>
              {pdfDocuments.map((doc) => (
                <SelectItem key={doc.id} value={doc.id}>
                  {doc.original_filename || doc.filename}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Boutons d'action */}
          <div className="flex gap-2 ml-auto">
            {/* Bouton minimiser */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsMinimized(true)}
              title="Minimiser"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Bouton fermer */}
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Fermer"
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </div>

        {/* PDF Viewer Area */}
        <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4">
          {isLoadingPdf && (
            <div className="flex flex-col items-center gap-2 text-slate-600">
              <Loader2 className="h-8 w-8 animate-spin" />
              <p>Loading PDF...</p>
            </div>
          )}

          {urlError && (
            <div className="flex flex-col items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
              <AlertCircle className="h-8 w-8" />
              <p className="text-sm">{urlError}</p>
            </div>
          )}

          {pdfUrl && !isLoadingPdf && (
            <div className="bg-white rounded-lg shadow-lg w-full h-full">
              <iframe
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
            </div>
          )}
        </div>
      </SheetContent>

      {/* Bouton minimisé au bas de la page */}
      {isMinimized && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsMinimized(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg px-4 py-2"
            title="Restaurer le lecteur PDF"
          >
            <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
            Lecteur PDF
          </Button>
        </div>
      )}
    </Sheet>
  );
}
