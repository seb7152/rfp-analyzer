"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface NavigationTarget {
  documentId: string;
  pageNumber: number;
  annotationId?: string;
  highlight?: boolean; // Pour animer l'annotation
}

interface PDFAnnotationContextValue {
  navigationTarget: NavigationTarget | null;
  navigateToAnnotation: (target: NavigationTarget) => void;
  clearNavigation: () => void;
}

const PDFAnnotationContext = createContext<
  PDFAnnotationContextValue | undefined
>(undefined);

interface PDFAnnotationProviderProps {
  children: ReactNode;
}

export function PDFAnnotationProvider({
  children,
}: PDFAnnotationProviderProps) {
  const [navigationTarget, setNavigationTarget] =
    useState<NavigationTarget | null>(null);

  const navigateToAnnotation = useCallback((target: NavigationTarget) => {
    setNavigationTarget(target);
  }, []);

  const clearNavigation = useCallback(() => {
    setNavigationTarget(null);
  }, []);

  return (
    <PDFAnnotationContext.Provider
      value={{ navigationTarget, navigateToAnnotation, clearNavigation }}
    >
      {children}
    </PDFAnnotationContext.Provider>
  );
}

export function usePDFAnnotationNavigation() {
  const context = useContext(PDFAnnotationContext);
  if (!context) {
    throw new Error(
      "usePDFAnnotationNavigation must be used within PDFAnnotationProvider",
    );
  }
  return context;
}
