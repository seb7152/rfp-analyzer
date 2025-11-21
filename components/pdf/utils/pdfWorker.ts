"use client";

// We need to ensure the worker is configured before using the library
export const getPdfJs = async () => {
  const pdfjsLib = await import("pdfjs-dist");

  // Handle both ES modules and CommonJS
  // @ts-ignore - Handle potential default export mismatch
  const lib = pdfjsLib.default || pdfjsLib;

  if (typeof window !== "undefined" && lib.GlobalWorkerOptions) {
    // Use the specific version to ensure compatibility
    lib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${lib.version}/build/pdf.worker.min.js`;
  }

  return lib;
};
