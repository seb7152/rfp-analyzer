"use client";

// We need to ensure the worker is configured before using the library
export const getPdfJs = async () => {
  console.log("[pdfWorker] getPdfJs() called");
  console.log("[pdfWorker] Window available:", typeof window !== "undefined");

  try {
    console.log("[pdfWorker] Importing pdfjs-dist...");
    const pdfjsLib = await import("pdfjs-dist");
    console.log("[pdfWorker] pdfjs-dist imported:", typeof pdfjsLib);
    console.log("[pdfWorker] pdfjsLib.default:", typeof pdfjsLib.default);
    console.log("[pdfWorker] pdfjsLib keys:", Object.keys(pdfjsLib).slice(0, 10));

    // Handle both ES modules and CommonJS
    // @ts-ignore - Handle potential default export mismatch
    const lib = pdfjsLib.default || pdfjsLib;
    console.log("[pdfWorker] Using lib:", typeof lib);
    console.log("[pdfWorker] lib.GlobalWorkerOptions:", typeof lib.GlobalWorkerOptions);
    console.log("[pdfWorker] lib.getDocument:", typeof lib.getDocument);

    if (typeof window !== "undefined" && lib.GlobalWorkerOptions) {
      // Use the specific version to ensure compatibility
      console.log("[pdfWorker] Setting worker source, version:", lib.version);
      lib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${lib.version}/build/pdf.worker.min.js`;
      console.log("[pdfWorker] Worker source set to:", lib.GlobalWorkerOptions.workerSrc);
    } else {
      console.warn("[pdfWorker] Cannot set worker source - window or GlobalWorkerOptions not available");
    }

    console.log("[pdfWorker] Returning lib");
    return lib;
  } catch (error) {
    console.error("[pdfWorker] Error in getPdfJs:", error);
    throw error;
  }
};
