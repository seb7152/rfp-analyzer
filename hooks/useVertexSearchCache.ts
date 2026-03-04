/**
 * Hook pour gérer le cache persistant des recherches Vertex AI dans localStorage
 *
 * Stocke les résultats de recherche par RFP dans localStorage du navigateur
 * pour éviter de refaire les mêmes recherches.
 *
 * Structure de stockage:
 * {
 *   "vertex-search-cache-{rfpId}": {
 *     searches: [
 *       {
 *         query: "question posée",
 *         supplierIds: ["id1", "id2"],
 *         result: { summary, sources, totalResults },
 *         timestamp: 1234567890
 *       }
 *     ]
 *   }
 * }
 */

import { useEffect, useCallback } from "react";

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

interface CachedSearch {
  query: string;
  supplierIds: string[];
  result: SearchResult;
  timestamp: number;
}

interface SearchCache {
  searches: CachedSearch[];
}

const CACHE_KEY_PREFIX = "vertex-search-cache-";
const MAX_SEARCHES_PER_RFP = 20; // Limite de stockage par RFP
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 heures

/**
 * Génère une clé de cache pour un RFP
 */
function getCacheKey(rfpId: string): string {
  return `${CACHE_KEY_PREFIX}${rfpId}`;
}

/**
 * Normalise la query pour la comparaison (lowercase, trim)
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim();
}

/**
 * Vérifie si deux listes de supplier IDs sont identiques
 */
function areSupplierIdsEqual(
  ids1: string[],
  ids2: string[]
): boolean {
  if (ids1.length !== ids2.length) return false;
  const sorted1 = [...ids1].sort();
  const sorted2 = [...ids2].sort();
  return sorted1.every((id, index) => id === sorted2[index]);
}

/**
 * Hook pour gérer le cache de recherches Vertex AI
 */
export function useVertexSearchCache(rfpId: string) {
  /**
   * Récupère le cache du localStorage
   */
  const getCache = useCallback((): SearchCache => {
    if (typeof window === "undefined") return { searches: [] };

    try {
      const cacheKey = getCacheKey(rfpId);
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return { searches: [] };

      const parsed = JSON.parse(cached) as SearchCache;

      // Filtrer les recherches expirées
      const now = Date.now();
      const validSearches = parsed.searches.filter(
        (search) => now - search.timestamp < CACHE_EXPIRY_MS
      );

      return { searches: validSearches };
    } catch (error) {
      console.error("[Vertex Search Cache] Error reading cache:", error);
      return { searches: [] };
    }
  }, [rfpId]);

  /**
   * Sauvegarde le cache dans localStorage
   */
  const saveCache = useCallback(
    (cache: SearchCache) => {
      if (typeof window === "undefined") return;

      try {
        const cacheKey = getCacheKey(rfpId);
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      } catch (error) {
        console.error("[Vertex Search Cache] Error saving cache:", error);
        // Si quota dépassé, nettoyer les anciennes entrées
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
          console.warn("[Vertex Search Cache] Quota exceeded, clearing old searches");
          const reducedCache = {
            searches: cache.searches.slice(-5), // Garder seulement les 5 plus récentes
          };
          try {
            localStorage.setItem(cacheKey, JSON.stringify(reducedCache));
          } catch (retryError) {
            console.error("[Vertex Search Cache] Failed to save reduced cache:", retryError);
          }
        }
      }
    },
    [rfpId]
  );

  /**
   * Cherche un résultat en cache
   */
  const getCachedResult = useCallback(
    (query: string, supplierIds: string[]): SearchResult | null => {
      const cache = getCache();
      const normalizedQuery = normalizeQuery(query);

      const cached = cache.searches.find(
        (search) =>
          normalizeQuery(search.query) === normalizedQuery &&
          areSupplierIdsEqual(search.supplierIds, supplierIds)
      );

      if (cached) {
        console.log(
          `[Vertex Search Cache] Cache hit for query: "${query}" (${supplierIds.length} suppliers)`
        );
        return cached.result;
      }

      console.log(
        `[Vertex Search Cache] Cache miss for query: "${query}" (${supplierIds.length} suppliers)`
      );
      return null;
    },
    [getCache]
  );

  /**
   * Sauvegarde un résultat dans le cache
   */
  const setCachedResult = useCallback(
    (query: string, supplierIds: string[], result: SearchResult) => {
      const cache = getCache();

      // Vérifier si la recherche existe déjà (pour éviter les doublons)
      const normalizedQuery = normalizeQuery(query);
      const existingIndex = cache.searches.findIndex(
        (search) =>
          normalizeQuery(search.query) === normalizedQuery &&
          areSupplierIdsEqual(search.supplierIds, supplierIds)
      );

      if (existingIndex >= 0) {
        // Mettre à jour l'entrée existante
        cache.searches[existingIndex] = {
          query,
          supplierIds,
          result,
          timestamp: Date.now(),
        };
      } else {
        // Ajouter une nouvelle entrée
        cache.searches.push({
          query,
          supplierIds,
          result,
          timestamp: Date.now(),
        });
      }

      // Limiter le nombre de recherches stockées (garder les plus récentes)
      if (cache.searches.length > MAX_SEARCHES_PER_RFP) {
        cache.searches = cache.searches
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, MAX_SEARCHES_PER_RFP);
      }

      saveCache(cache);
      console.log(
        `[Vertex Search Cache] Cached result for query: "${query}" (${supplierIds.length} suppliers)`
      );
    },
    [getCache, saveCache]
  );

  /**
   * Vide le cache pour ce RFP
   */
  const clearCache = useCallback(() => {
    if (typeof window === "undefined") return;

    try {
      const cacheKey = getCacheKey(rfpId);
      localStorage.removeItem(cacheKey);
      console.log(`[Vertex Search Cache] Cleared cache for RFP: ${rfpId}`);
    } catch (error) {
      console.error("[Vertex Search Cache] Error clearing cache:", error);
    }
  }, [rfpId]);

  /**
   * Récupère toutes les recherches en cache (pour affichage historique)
   */
  const getCachedSearches = useCallback((): CachedSearch[] => {
    const cache = getCache();
    return cache.searches.sort((a, b) => b.timestamp - a.timestamp);
  }, [getCache]);

  return {
    getCachedResult,
    setCachedResult,
    clearCache,
    getCachedSearches,
  };
}
