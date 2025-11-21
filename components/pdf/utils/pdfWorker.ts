"use client";

// Only import and configure on client side
if (typeof window !== "undefined") {
  // Dynamic import to avoid SSR issues
  import("pdfjs-dist").then((pdfjsLib) => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
  });
}

// Export the library for use (lazy loaded)
export { default as pdfjs } from "pdfjs-dist";
