"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, Loader2, AlertCircle, ChevronRight } from "lucide-react";

export interface PDFDocument {
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
  const [currentPage, setCurrentPage] = useState<number | null>(null);
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Helper to get storage key for PDF position
  const getPdfPositionKey = (docId: string) => `pdf-position-${docId}`;

  // Save PDF page position by tracking the URL hash changes
  const savePdfPosition = (docId: string, page?: number) => {
    if (page) {
      localStorage.setItem(getPdfPositionKey(docId), String(page));
    }
  };

  // Restore PDF page position by appending page fragment to URL
  const getPdfUrlWithPosition = (docId: string, baseUrl: string): string => {
    const savedPage = localStorage.getItem(getPdfPositionKey(docId));
    if (savedPage) {
      // Append page fragment to URL - PDF.js viewer will respect this
      return `${baseUrl}#page=${savedPage}`;
    }
    return baseUrl;
  };

  // Filter to only PDF documents
  const pdfDocuments = documents.filter(
    (doc) => doc.mime_type === "application/pdf",
  );
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
          },
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to get PDF URL");
        }

        const data = await response.json();
        const urlWithPosition = getPdfUrlWithPosition(selectedDoc.id, data.url);
        setPdfUrl(urlWithPosition);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setUrlError(errorMessage);
        console.error("Error fetching PDF URL:", err);
      } finally {
        setIsLoadingPdf(false);
      }
    };

    fetchPdfUrl();
  }, [selectedDoc, rfpId]);

  // Handle page changes from iframe - PDF.js updates the iframe URL hash when navigating
  useEffect(() => {
    if (!iframeRef.current || !selectedDoc) return;

    let lastDetectedPage: number | null = null;

    const checkCurrentPage = () => {
      if (!iframeRef.current?.src) return;

      // Check the iframe src for page fragment
      const hashMatch = iframeRef.current.src.match(/#page=(\d+)/);
      if (hashMatch && hashMatch[1]) {
        const page = parseInt(hashMatch[1], 10);
        // Only save if page changed
        if (page !== lastDetectedPage && page > 0) {
          lastDetectedPage = page;
          setCurrentPage(page);
          savePdfPosition(selectedDoc.id, page);
        }
      }

      // Also try to access PDFViewerApplication directly for more reliable detection
      try {
        const iframeWindow = iframeRef.current?.contentWindow as any;
        if (
          iframeWindow?.PDFViewerApplication?.page &&
          typeof iframeWindow.PDFViewerApplication.page === "number"
        ) {
          const page = iframeWindow.PDFViewerApplication.page;
          if (page !== lastDetectedPage && page > 0) {
            lastDetectedPage = page;
            setCurrentPage(page);
            savePdfPosition(selectedDoc.id, page);
          }
        }
      } catch (e) {
        // Silently ignore cross-origin errors
      }
    };

    // Poll frequently for page changes
    const interval = setInterval(checkCurrentPage, 500);

    return () => clearInterval(interval);
  }, [selectedDoc]);

  const handleDocumentChange = (docId: string) => {
    setSelectedDocId(docId);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Save current page position before closing
      if (selectedDoc && currentPage) {
        savePdfPosition(selectedDoc.id, currentPage);
      }
      // Reset state when actually closing the viewer
      setPdfUrl(null);
      setUrlError(null);
      setSelectedDocId(null);
      setCurrentPage(null);
    }
    onOpenChange(open);
  };

  // Don't render sheet if no PDF documents
  if (pdfDocuments.length === 0) {
    return null;
  }

  return (
    <>
      {/* Persistent iframe container - always mounted to prevent reload */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-1/2 bg-white border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 z-40 flex flex-col ${
          isOpen && !isMinimized ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          pointerEvents: isOpen && !isMinimized ? "auto" : "none",
        }}
      >
        {/* Header avec sélecteur et boutons */}
        <div className="border-b px-6 py-3 flex items-center justify-between gap-4">
          {/* Sélecteur de document */}
          <Select
            value={selectedDocId || ""}
            onValueChange={handleDocumentChange}
          >
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleOpenChange(false)}
              title="Fermer"
            >
              <X className="h-4 w-4" />
            </Button>
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
                ref={iframeRef}
                src={pdfUrl}
                className="w-full h-full border-0"
                title="PDF Viewer"
              />
            </div>
          )}
        </div>
      </div>

      {/* Overlay backdrop when panel is open */}
      {isOpen && !isMinimized && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => handleOpenChange(false)}
        />
      )}

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
    </>
  );
}
