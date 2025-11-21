import type { AnnotationRect } from "../types/annotation.types";

/**
 * Convertit les coordonnées d'écran en coordonnées PDF
 */
export function screenToPDFCoordinates(
  screenRects: DOMRect[],
  containerRect: DOMRect,
  scale: number,
): AnnotationRect[] {
  return screenRects.map((rect) => ({
    x: (rect.left - containerRect.left) / scale,
    y: (rect.top - containerRect.top) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  }));
}

/**
 * Convertit les coordonnées PDF en coordonnées d'écran
 */
export function pdfToScreenCoordinates(
  pdfRects: AnnotationRect[],
  scale: number,
): AnnotationRect[] {
  return pdfRects.map((rect) => ({
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  }));
}

/**
 * Fusionne les rectangles qui se chevauchent sur la même ligne
 */
export function mergeOverlappingRects(
  rects: AnnotationRect[],
): AnnotationRect[] {
  if (rects.length === 0) return [];

  const sorted = [...rects].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 5) return a.y - b.y;
    return a.x - b.x;
  });

  const merged: AnnotationRect[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const last = merged[merged.length - 1];

    // Vérifier si sur la même ligne (tolérance de 5px)
    if (
      Math.abs(current.y - last.y) < 5 &&
      current.x <= last.x + last.width + 10
    ) {
      // Fusionner
      last.width =
        Math.max(last.x + last.width, current.x + current.width) - last.x;
      last.height = Math.max(last.height, current.height);
    } else {
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Normalise les coordonnées pour gérer différentes orientations de page
 */
export function normalizeCoordinates(
  rect: AnnotationRect,
  pageHeight: number,
  rotation: number = 0,
): AnnotationRect {
  let normalized = { ...rect };

  // Gérer la rotation de la page
  switch (rotation) {
    case 90:
      normalized = {
        x: rect.y,
        y: pageHeight - rect.x - rect.width,
        width: rect.height,
        height: rect.width,
      };
      break;
    case 180:
      normalized = {
        x: rect.x,
        y: pageHeight - rect.y - rect.height,
        width: rect.width,
        height: rect.height,
      };
      break;
    case 270:
      normalized = {
        x: pageHeight - rect.y - rect.height,
        y: rect.x,
        width: rect.height,
        height: rect.width,
      };
      break;
  }

  return normalized;
}
