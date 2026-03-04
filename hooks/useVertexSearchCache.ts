/**
 * Hook pour gérer la persistance de la dernière recherche Vertex AI dans localStorage
 *
 * Stocke uniquement la DERNIÈRE recherche effectuée par RFP dans localStorage
 * pour la restaurer automatiquement au retour sur la page.
 *
 * Structure de stockage:
 * {
 *   "vertex-last-search-{rfpId}": {
 *     query: "question posée",
 *     supplierIds: ["id1", "id2"],
 *     result: { summary, sources, totalResults },
 *     timestamp: 1234567890
 *   }
 * }
 */

import { useCallback } from "react";

interface SearchSource {
  id: string;
  title: string;
  gcsUri: string;
  pageNumber: number;
  excerpt: string;
  documentId: string;
  supplierName?: string | null;
}

interface SearchResult {
  summary: string;
  sources: SearchSource[];
  totalResults: number;
}

interface LastSearch {
  query: string;
  supplierIds: string[];
  result: SearchResult;
  timestamp: number;
}

const CACHE_KEY_PREFIX = "vertex-last-search-";
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Génère une clé de cache pour un RFP
 */
function getCacheKey(rfpId: string): string {
  return `${CACHE_KEY_PREFIX}${rfpId}`;
}

/**
 * Hook pour gérer la dernière recherche Vertex AI par RFP
 */
export function useVertexSearchCache(rfpId: string) {
  /**
   * Récupère la dernière recherche du localStorage
   */
  const getLastSearch = useCallback((): LastSearch | null => {
    if (typeof window === "undefined") return null;

    try {
      const cacheKey = getCacheKey(rfpId);
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const parsed = JSON.parse(cached) as LastSearch;

      // Vérifier si la recherche est expirée
      const now = Date.now();
      if (now - parsed.timestamp > CACHE_EXPIRY_MS) {
        // Expirée, la supprimer
        localStorage.removeItem(cacheKey);
        return null;
      }

      console.log(
        `[Vertex Search Cache] Restored last search for RFP ${rfpId}: "${parsed.query}"`
      );
      return parsed;
    } catch (error) {
      console.error("[Vertex Search Cache] Error reading cache:", error);
      return null;
    }
  }, [rfpId]);

  /**
   * Sauvegarde la dernière recherche dans localStorage
   */
  const saveLastSearch = useCallback(
    (query: string, supplierIds: string[], result: SearchResult) => {
      if (typeof window === "undefined") return;

      try {
        const cacheKey = getCacheKey(rfpId);
        const lastSearch: LastSearch = {
          query,
          supplierIds,
          result,
          timestamp: Date.now(),
        };

        localStorage.setItem(cacheKey, JSON.stringify(lastSearch));
        console.log(
          `[Vertex Search Cache] Saved last search for RFP ${rfpId}: "${query}"`
        );
      } catch (error) {
        console.error("[Vertex Search Cache] Error saving cache:", error);
        // Si quota dépassé, supprimer l'ancienne recherche et réessayer
        if (
          error instanceof DOMException &&
          error.name === "QuotaExceededError"
        ) {
          console.warn(
            "[Vertex Search Cache] Quota exceeded, clearing cache and retrying"
          );
          try {
            const cacheKey = getCacheKey(rfpId);
            localStorage.removeItem(cacheKey);
            localStorage.setItem(
              cacheKey,
              JSON.stringify({
                query,
                supplierIds,
                result,
                timestamp: Date.now(),
              })
            );
          } catch (retryError) {
            console.error(
              "[Vertex Search Cache] Failed to save after clearing:",
              retryError
            );
          }
        }
      }
    },
    [rfpId]
  );

  /**
   * Vide la dernière recherche pour ce RFP
   */
  const clearLastSearch = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const cacheKey = getCacheKey(rfpId);
      localStorage.removeItem(cacheKey);
      console.log(`[Vertex Search Cache] Cleared last search for RFP: ${rfpId}`);
    } catch (error) {
      console.error("[Vertex Search Cache] Error clearing cache:", error);
    }
  }, [rfpId]);

  return {
    getLastSearch,
    saveLastSearch,
    clearLastSearch,
  };
}
