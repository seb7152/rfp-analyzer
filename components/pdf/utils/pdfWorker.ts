"use client";

// Only import and configure on client side
if (typeof window !== "undefined") {
  // Dynamic import to avoid SSR issues
  import("pdfjs-dist").then((pdfjsLib) => {
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
    }
  });
}

// Export all named exports from pdfjs-dist
export * as pdfjs from "pdfjs-dist";
