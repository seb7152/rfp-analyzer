"use client";

// We need to ensure the worker is configured before using the library
export const getPdfJs = async () => {
  console.log("[pdfWorker] getPdfJs() called");
  console.log("[pdfWorker] Window available:", typeof window !== "undefined");

  try {
    console.log("[pdfWorker] Importing pdfjs-dist/legacy/build/pdf.mjs...");
    // Use the legacy build to avoid ESM compatibility issues with Next.js
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    console.log("[pdfWorker] pdfjs-dist imported:", typeof pdfjsLib);
    console.log(
      "[pdfWorker] pdfjsLib keys:",
      Object.keys(pdfjsLib).slice(0, 10),
    );

    // Legacy build exports directly, no default
    console.log("[pdfWorker] Using lib:", typeof pdfjsLib);
    console.log(
      "[pdfWorker] lib.GlobalWorkerOptions:",
      typeof pdfjsLib.GlobalWorkerOptions,
    );
    console.log("[pdfWorker] lib.getDocument:", typeof pdfjsLib.getDocument);

    if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
      // Use the specific version to ensure compatibility
      console.log("[pdfWorker] Setting worker source, version:", pdfjsLib.version);
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/legacy/build/pdf.worker.min.mjs`;
      console.log(
        "[pdfWorker] Worker source set to:",
        pdfjsLib.GlobalWorkerOptions.workerSrc,
      );
    } else {
      console.warn(
        "[pdfWorker] Cannot set worker source - window or GlobalWorkerOptions not available",
      );
    }

    console.log("[pdfWorker] Returning pdfjsLib");
    return pdfjsLib;
  } catch (error) {
    console.error("[pdfWorker] Error in getPdfJs:", error);
    throw error;
  }
};
