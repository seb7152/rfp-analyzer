"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ReactNode } from "react";
import { PDFAnnotationProvider } from "@/components/pdf/contexts/PDFAnnotationContext";
import { useOfflineSync } from "@/hooks/use-offline-sync";

/**
 * React Query client configuration with optimized defaults for v5
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 10, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 1,
    },
  },
});

/**
 * Offline Sync Provider
 * Handles automatic synchronization of queued mutations when connection is restored
 */
function OfflineSyncProvider({ children }: { children: ReactNode }) {
  // Hook that listens to online/offline events and syncs queued mutations
  useOfflineSync();
  return <>{children}</>;
}

/**
 * Providers wrapper for React Query, Theme, PDF Annotations, and Offline Sync
 * Wrap application with this component to enable data fetching, caching, theme support, PDF annotations, and offline functionality
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
        <OfflineSyncProvider>
          <PDFAnnotationProvider>
            <Toaster position="top-right" richColors closeButton />
            {children}
          </PDFAnnotationProvider>
        </OfflineSyncProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
