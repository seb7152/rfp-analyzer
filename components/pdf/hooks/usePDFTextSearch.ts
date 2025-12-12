"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { debounce } from "lodash";
import type {
  UsePDFTextSearchProps,
  UsePDFTextSearchReturn,
  TextItem,
  SearchResult,
  TextCache,
} from "../types/search.types";

// Implémentation simple du cache LRU
class LRUCache implements TextCache {
  private cache = new Map<number, TextItem[]>();
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  get(pageNumber: number): TextItem[] | undefined {
    const value = this.cache.get(pageNumber);
    if (value !== undefined) {
      // Déplacer à la fin (plus récemment utilisé)
      this.cache.delete(pageNumber);
      this.cache.set(pageNumber, value);
    }
    return value;
  }

  set(pageNumber: number, items: TextItem[]): void {
    if (this.cache.has(pageNumber)) {
      this.cache.delete(pageNumber);
    } else if (this.cache.size >= this.maxSize) {
      // Supprimer le plus ancien (premier élément)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(pageNumber, items);
  }

  clear(): void {
    this.cache.clear();
  }

  has(pageNumber: number): boolean {
    return this.cache.has(pageNumber);
  }
}

export function usePDFTextSearch({
  onPageChange,
}: UsePDFTextSearchProps): UsePDFTextSearchReturn {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);

  // Cache LRU pour le texte extrait
  const textCache = useRef<LRUCache>(new LRUCache(10));
  const extractedTextRef = useRef<Map<number, TextItem[]>>(new Map());

  // Nettoyer le cache quand le document change
  const handleDocumentChange = useCallback(() => {
    textCache.current.clear();
    extractedTextRef.current.clear();
    setSearchResults([]);
    setCurrentResultIndex(-1);
    setSearchQuery("");
  }, []);

  // Fonction pour générer le contexte autour du texte trouvé
  const generateContext = useCallback(
    (text: string, items: TextItem[]): string => {
      const allText = items.map((item) => item.text).join(" ");
      const textIndex = allText.indexOf(text);
      if (textIndex === -1) return text;

      const contextStart = Math.max(0, textIndex - 20);
      const contextEnd = Math.min(allText.length, textIndex + text.length + 20);

      let context = allText.substring(contextStart, contextEnd);
      if (contextStart > 0) context = "..." + context;
      if (contextEnd < allText.length) context = context + "...";

      return context;
    },
    []
  );

  // Fonction de recherche principale
  const performSearch = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setCurrentResultIndex(-1);
        return;
      }

      setIsSearching(true);
      const normalizedQuery = query
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      const results: SearchResult[] = [];
      let resultId = 0;

      // Parcourir toutes les pages en cache
      for (const [, items] of extractedTextRef.current) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const normalizedText = item.text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

          if (normalizedText.includes(normalizedQuery)) {
            const context = generateContext(item.text, items);

            results.push({
              id: `search-${resultId++}`,
              text: item.text,
              pageNumber: item.pageNumber,
              rects: item.rects,
              context,
              pageIndex: i,
            });
          }
        }
      }

      // Trier par numéro de page puis par index
      results.sort((a, b) => {
        if (a.pageNumber !== b.pageNumber) {
          return a.pageNumber - b.pageNumber;
        }
        return a.pageIndex - b.pageIndex;
      });

      setSearchResults(results);
      setCurrentResultIndex(results.length > 0 ? 0 : -1);
      setIsSearching(false);
    },
    [generateContext]
  );

  // Enregistrer le texte extrait d'une page
  const registerPageText = useCallback(
    (pageNumber: number, items: TextItem[]) => {
      textCache.current.set(pageNumber, items);
      extractedTextRef.current.set(pageNumber, items);

      // Si une recherche est active, relancer la recherche
      if (searchQuery.trim()) {
        performSearch(searchQuery);
      }
    },
    [searchQuery, performSearch]
  );

  // Version debouncée de la recherche
  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        performSearch(query);
      }, 300),
    [performSearch]
  );

  // Fonction publique de recherche
  const search = useCallback(
    (query: string) => {
      setSearchQuery(query);
      debouncedSearch(query);
    },
    [debouncedSearch]
  );

  // Navigation vers un résultat spécifique
  const navigateToResult = useCallback(
    (index: number) => {
      if (index >= 0 && index < searchResults.length) {
        console.log("[usePDFTextSearch] Navigating to result:", {
          index,
          result: searchResults[index],
          currentPage: searchResults[index].pageNumber,
        });
        setCurrentResultIndex(index);
        const result = searchResults[index];
        onPageChange?.(result.pageNumber);
      }
    },
    [searchResults, onPageChange]
  );

  // Résultat suivant
  const nextResult = useCallback(() => {
    if (searchResults.length === 0) return;

    const nextIndex =
      currentResultIndex >= searchResults.length - 1
        ? 0
        : currentResultIndex + 1;
    navigateToResult(nextIndex);
  }, [searchResults, currentResultIndex, navigateToResult]);

  // Résultat précédent
  const previousResult = useCallback(() => {
    if (searchResults.length === 0) return;

    const prevIndex =
      currentResultIndex <= 0
        ? searchResults.length - 1
        : currentResultIndex - 1;
    navigateToResult(prevIndex);
  }, [searchResults, currentResultIndex, navigateToResult]);

  // Effacer la recherche
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setCurrentResultIndex(-1);
    debouncedSearch.cancel();
  }, [debouncedSearch]);

  // Nettoyer quand le document change
  useEffect(() => {
    handleDocumentChange();
  }, [handleDocumentChange]);

  return {
    searchQuery,
    searchResults,
    currentResultIndex,
    isSearching,
    totalResults: searchResults.length,
    search,
    navigateToResult,
    nextResult,
    previousResult,
    clearSearch,
    registerPageText, // Pour être utilisé par PDFTextLayer
  };
}
