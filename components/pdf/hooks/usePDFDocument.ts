"use client";

import { useState, useEffect } from "react";
import type { PDFDocumentProxy } from "../types/pdf.types";

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

    // Lazy import pdfjs to avoid SSR issues
    import("../utils/pdfWorker")
      .then(async ({ getPdfJs }) => {
        if (isCancelled) return;

        try {
          const pdfjs = await getPdfJs();

          if (isCancelled) return;

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
        } catch (err) {
          if (!isCancelled) {
            console.error("Error initializing pdfjs:", err);
            setError(err as Error);
            setIsLoading(false);
          }
        }
      })
      .catch((importError) => {
        if (!isCancelled) {
          console.error("Error importing pdfWorker:", importError);
          setError(importError as Error);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [url]);

  return { document, numPages, isLoading, error };
}
