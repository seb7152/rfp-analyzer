"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ReactNode } from "react";
import { PDFAnnotationProvider } from "@/components/pdf/contexts/PDFAnnotationContext";

/**
 * React Query client configuration with optimized defaults
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Providers wrapper for React Query, Theme, and PDF Annotations
 * Wrap application with this component to enable data fetching, caching, theme support, and PDF annotations
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <PDFAnnotationProvider>
          <Toaster position="top-right" richColors closeButton />
          {children}
        </PDFAnnotationProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
