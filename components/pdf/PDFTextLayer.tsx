"use client";

import React, { useEffect, useRef } from "react";
import type { PDFPageProxy } from "./types/pdf.types";

interface PDFTextLayerProps {
  page: PDFPageProxy;
  scale: number;
  onTextSelected?: (text: string, rects: DOMRect[]) => void;
}

export function PDFTextLayer({
  page,
  scale,
  onTextSelected,
}: PDFTextLayerProps) {
  const textLayerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!textLayerRef.current) return;

    const textLayerDiv = textLayerRef.current;

    // Nettoyer le contenu existant
    textLayerDiv.innerHTML = "";
    textLayerDiv.style.setProperty("--scale-factor", scale.toString());

    // Récupérer et afficher le contenu textuel
    console.log(
      "[PDFTextLayer] Loading text content for page",
      page.pageNumber,
    );
    page
      .getTextContent()
      .then((textContent) => {
        console.log(
          "[PDFTextLayer] Text content loaded, items:",
          textContent.items.length,
        );
        // Créer les éléments de texte
        textContent.items.forEach((item: any) => {
          if ("str" in item) {
            const textDiv = document.createElement("div");
            textDiv.textContent = item.str;

            // Utiliser viewport.transform pour convertir les coordonnées PDF en coordonnées Canvas
            const viewport = page.getViewport({ scale });
            const transform = viewport.transform;
            const tx = item.transform;

            // Calculer l'angle de rotation
            let angle = Math.atan2(tx[1], tx[0]);

            // Appliquer la transformation du viewport à la transformation du texte
            // tx est [a, b, c, d, e, f] où (e, f) est la translation
            // On doit combiner tx avec viewport.transform

            // Méthode simplifiée : utiliser les coordonnées calculées par pdf.js si possible
            // Mais ici on fait manuel.

            // Correction : Le calcul précédent était trop simpliste.
            // On va essayer de positionner en % pour être plus robuste ou utiliser une logique différente.

            // Nouvelle approche : Utiliser le font height correct et le scaling
            // tx[0] = scaleX, tx[3] = scaleY

            // Position x, y en coordonnées PDF
            const x = tx[4];
            const y = tx[5];

            // Convertir en coordonnées viewport
            // Note: viewport.transform est [scale, 0, 0, -scale, 0, viewport.height] (généralement)
            // x_view = x * transform[0] + y * transform[2] + transform[4]
            // y_view = x * transform[1] + y * transform[3] + transform[5]

            const viewX = x * transform[0] + y * transform[2] + transform[4];
            const viewY = x * transform[1] + y * transform[3] + transform[5];

            // La taille de la police doit aussi être scalée
            const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
            const scaledFontSize = fontSize * transform[0]; // Assuming uniform scaling

            // Ajustement vertical : pdf.js 'y' est la baseline
            // L'écart observé suggère un problème de baseline ou de line-height
            // On va essayer de positionner exactement sur la baseline
            // viewY est la position Y convertie (haut en bas)

            textDiv.style.left = `${viewX}px`;
            // Ajustement fin : on remonte légèrement pour aligner la baseline
            // Le facteur 0.85 est empirique pour compenser le line-height par défaut
            textDiv.style.top = `${viewY - scaledFontSize * 0.9}px`;
            textDiv.style.fontSize = `${scaledFontSize}px`;
            textDiv.style.fontFamily = item.fontName || "sans-serif";
            textDiv.style.lineHeight = "1"; // Force line-height to 1 to match PDF rendering better

            // Tentative de correction de la largeur
            if (item.width > 0) {
              // item.width est en unités PDF, il faut le scaler
              // transform[0] est le scale horizontal du viewport
              const targetWidth = item.width * transform[0];
              textDiv.style.width = `${targetWidth}px`;
              // On pourrait ajouter transform: scaleX(...) ici si on pouvait mesurer la largeur réelle
            }

            // Rotation
            if (angle !== 0) {
              textDiv.style.transform = `rotate(${-angle}rad)`; // Rotation inverse car axe Y inversé ?
            }

            textDiv.style.position = "absolute";
            textDiv.style.transformOrigin = "0% 100%"; // Baseline origin
            textDiv.style.whiteSpace = "pre";
            textDiv.style.cursor = "text";
            textDiv.style.color = "transparent"; // Texte invisible mais sélectionnable
            textDiv.style.pointerEvents = "all"; // Ensure clickable

            textLayerDiv.appendChild(textDiv);
          }
        });
      })
      .catch((err) => {
        console.error("[PDFTextLayer] Error loading text content:", err);
      });
  }, [page, scale]);

  // Gérer la sélection de texte
  useEffect(() => {
    if (!textLayerRef.current || !onTextSelected) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      console.log("[PDFTextLayer] MouseUp, selection:", selection?.toString());

      if (!selection || selection.isCollapsed) {
        console.log("[PDFTextLayer] Selection collapsed or null");
        return;
      }

      const selectedText = selection.toString().trim();
      if (!selectedText) {
        console.log("[PDFTextLayer] Empty text");
        return;
      }

      // Récupérer les rectangles de la sélection
      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects());
      console.log("[PDFTextLayer] Rects found:", rects.length);

      if (rects.length > 0) {
        console.log("[PDFTextLayer] Calling onTextSelected");
        onTextSelected(selectedText, rects as DOMRect[]);
      }
    };

    const element = textLayerRef.current;
    element.addEventListener("mouseup", handleMouseUp);

    return () => {
      element.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onTextSelected]);

  const viewport = page.getViewport({ scale });

  return (
    <div
      ref={textLayerRef}
      className="absolute inset-0 overflow-hidden select-text pdf-text-layer"
      style={{
        width: viewport.width,
        height: viewport.height,
        lineHeight: 1,
        opacity: 1, // Doit être visible pour que la sélection fonctionne
        zIndex: 20, // Au-dessus du canvas mais en dessous des annotations
      }}
    />
  );
}
