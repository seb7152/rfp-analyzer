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
    page
      .getTextContent()
      .then((textContent) => {
        // Créer les éléments de texte
        textContent.items.forEach((item: any) => {
          if ("str" in item) {
            const textDiv = document.createElement("div");
            textDiv.textContent = item.str;

            const tx = item.transform;

            // Calculer la position et la taille
            const fontHeight = Math.sqrt(tx[2] * tx[2] + tx[3] * tx[3]);
            const fontAscent = fontHeight;

            // Calculer l'angle de rotation
            let angle = Math.atan2(tx[1], tx[0]);

            // Appliquer les styles
            textDiv.style.position = "absolute";
            textDiv.style.left = `${tx[4] * scale}px`;
            textDiv.style.top = `${(tx[5] - fontAscent) * scale}px`;
            textDiv.style.fontSize = `${fontHeight * scale}px`;
            textDiv.style.fontFamily = item.fontName || "sans-serif";
            textDiv.style.transform = `rotate(${angle}rad)`;
            textDiv.style.transformOrigin = "0% 0%";
            textDiv.style.whiteSpace = "pre";

            textLayerDiv.appendChild(textDiv);
          }
        });
      })
      .catch((err) => {
        console.error("Error loading text content:", err);
      });
  }, [page, scale]);

  // Gérer la sélection de texte
  useEffect(() => {
    if (!textLayerRef.current || !onTextSelected) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;

      const selectedText = selection.toString().trim();
      if (!selectedText) return;

      // Récupérer les rectangles de la sélection
      const range = selection.getRangeAt(0);
      const rects = Array.from(range.getClientRects());

      if (rects.length > 0) {
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
      className="absolute inset-0 overflow-hidden select-text"
      style={{
        width: viewport.width,
        height: viewport.height,
        lineHeight: 1,
        opacity: 0, // Complètement transparent pour ne pas masquer le PDF
        zIndex: 20, // Au-dessus des annotations pour permettre la sélection
      }}
    />
  );
}
