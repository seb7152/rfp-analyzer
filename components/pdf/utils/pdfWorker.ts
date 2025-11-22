"use client";

// Load PDF.js from CDN to avoid Webpack/Next.js compatibility issues
const PDFJS_VERSION = "4.0.379";
const PDFJS_CDN = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER_CDN = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

let pdfjsLibPromise: Promise<any> | null = null;

// Load PDF.js script dynamically from CDN
export const getPdfJs = async () => {
  console.log("[pdfWorker] getPdfJs() called");
  console.log("[pdfWorker] Window available:", typeof window !== "undefined");

  if (typeof window === "undefined") {
    throw new Error("PDF.js can only be loaded in the browser");
  }

  // Return cached promise if already loading/loaded
  if (pdfjsLibPromise) {
    console.log("[pdfWorker] Returning cached pdfjs promise");
    return pdfjsLibPromise;
  }

  pdfjsLibPromise = (async () => {
    try {
      console.log("[pdfWorker] Loading PDF.js from CDN:", PDFJS_CDN);

      // Load PDF.js from CDN using dynamic import with webpackIgnore
      const pdfjsLib = await import(/* webpackIgnore: true */ PDFJS_CDN);
      console.log("[pdfWorker] PDF.js loaded from CDN");
      console.log("[pdfWorker] pdfjsLib type:", typeof pdfjsLib);
      console.log(
        "[pdfWorker] pdfjsLib keys:",
        Object.keys(pdfjsLib).slice(0, 10),
      );

      // Configure worker
      if (pdfjsLib.GlobalWorkerOptions) {
        console.log("[pdfWorker] Setting worker source to:", PDFJS_WORKER_CDN);
        pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
      } else {
        console.warn("[pdfWorker] GlobalWorkerOptions not available");
      }

      console.log("[pdfWorker] PDF.js ready, version:", pdfjsLib.version);
      return pdfjsLib;
    } catch (error) {
      console.error("[pdfWorker] Error loading PDF.js from CDN:", error);
      pdfjsLibPromise = null; // Reset on error so we can retry
      throw error;
    }
  })();

  return pdfjsLibPromise;
};
