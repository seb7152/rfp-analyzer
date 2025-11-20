import { useState, useEffect } from 'react';
import { pdfjs } from '../utils/pdfWorker';
import type { PDFDocumentProxy } from '../types/pdf.types';

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
          console.error('Error loading PDF:', err);
          setError(err);
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
      loadingTask.destroy();
    };
  }, [url]);

  return { document, numPages, isLoading, error };
}
