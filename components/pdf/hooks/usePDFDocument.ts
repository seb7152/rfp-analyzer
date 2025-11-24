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
    console.log("[usePDFDocument] Starting PDF load for URL:", url);
    console.log(
      "[usePDFDocument] Window available:",
      typeof window !== "undefined"
    );

    import("../utils/pdfWorker")
      .then(async (module) => {
        console.log("[usePDFDocument] pdfWorker module loaded:", module);

        if (isCancelled) {
          console.log("[usePDFDocument] Load cancelled after module import");
          return;
        }

        try {
          console.log("[usePDFDocument] Calling getPdfJs()...");
          const pdfjs = await module.getPdfJs();
          console.log(
            "[usePDFDocument] getPdfJs() returned:",
            pdfjs ? "object" : "null"
          );
          console.log(
            "[usePDFDocument] pdfjs.getDocument available:",
            typeof pdfjs?.getDocument
          );

          if (isCancelled) {
            console.log("[usePDFDocument] Load cancelled after getPdfJs");
            return;
          }

          console.log("[usePDFDocument] Creating loading task for URL:", url);
          const loadingTask = pdfjs.getDocument(url);

          loadingTask.promise
            .then((pdf: PDFDocumentProxy) => {
              if (!isCancelled) {
                console.log(
                  "[usePDFDocument] PDF loaded successfully, pages:",
                  pdf.numPages
                );
                setDocument(pdf);
                setNumPages(pdf.numPages);
                setIsLoading(false);
              }
            })
            .catch((err: Error) => {
              if (!isCancelled) {
                console.error("[usePDFDocument] Error loading PDF:", err);
                setError(err);
                setIsLoading(false);
              }
            });
        } catch (err) {
          if (!isCancelled) {
            console.error("[usePDFDocument] Error initializing pdfjs:", err);
            setError(err as Error);
            setIsLoading(false);
          }
        }
      })
      .catch((importError) => {
        if (!isCancelled) {
          console.error(
            "[usePDFDocument] Error importing pdfWorker:",
            importError
          );
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
