"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useVertexSearchCache } from "@/hooks/useVertexSearchCache";

interface VertexRAGSearchProps {
  rfpId: string;
  supplierId?: string;
  suppliers?: Array<{ id: string; name: string }>;
  defaultOpen?: boolean;
}

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

export function VertexRAGSearch({
  rfpId,
  supplierId,
  suppliers = [],
}: VertexRAGSearchProps) {
  const [query, setQuery] = useState("");
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>(
    supplierId ? [supplierId] : []
  );
  const [cachedResult, setCachedResult] = useState<SearchResult | null>(null);

  // Hook de cache localStorage
  const { getCachedResult, setCachedResult: saveCachedResult } =
    useVertexSearchCache(rfpId);

  // Multi-select supplier logic
  const toggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Search query - disabled by default, only runs on manual refetch
  const { data, isLoading, error, refetch, isFetching } =
    useQuery<SearchResult>({
      queryKey: ["vertex-search", rfpId, query, selectedSupplierIds],
      queryFn: async () => {
        const res = await fetch(`/api/rfps/${rfpId}/vertex-search`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            supplierIds:
              selectedSupplierIds.length > 0 ? selectedSupplierIds : undefined,
            pageSize: 5,
            summaryResultCount: 5,
          }),
        });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || "Erreur lors de la recherche");
        }
        const result = await res.json();

        // Sauvegarder dans le cache localStorage
        saveCachedResult(query, selectedSupplierIds, result);

        return result;
      },
      enabled: false, // Only run on manual refetch
      staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
      retry: 1, // Only retry once on failure
    });

  const handleSearch = () => {
    if (!query.trim()) return;

    // D'abord vérifier le cache localStorage
    const cached = getCachedResult(query, selectedSupplierIds);

    if (cached) {
      // Afficher immédiatement le résultat du cache
      setCachedResult(cached);
    } else {
      // Pas de cache, faire la vraie requête
      setCachedResult(null);
      refetch();
    }
  };

  // Effet pour mettre à jour cachedResult quand data change
  useEffect(() => {
    if (data) {
      setCachedResult(data);
    }
  }, [data]);

  // Rendu du résumé avec ReactMarkdown (citations inline en texte simple)
  const renderSummary = (summary: string) => {
    return (
      <div className="prose dark:prose-invert max-w-none text-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Tailles réduites pour un meilleur formatage
            h1: ({ children }) => (
              <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-base font-bold mt-3 mb-2 border-b pb-1">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="mb-2 leading-relaxed text-sm">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-outside mb-3 space-y-0.5 pl-4">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-outside mb-3 space-y-0.5 pl-4">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="mb-0.5 text-sm">{children}</li>,
            code: ({ className, children, ...props }: any) => {
              const inline = !className;
              return inline ? (
                <code className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1 py-0.5 rounded text-xs font-medium">
                  {children}
                </code>
              ) : (
                <code className="block bg-slate-100 dark:bg-slate-800 p-2 rounded text-xs overflow-x-auto">
                  {children}
                </code>
              );
            },
          }}
        >
          {summary}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <Card className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Recherche dans les documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Posez une question sur les documents fournisseurs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isFetching && handleSearch()}
            className="flex-1"
            disabled={isFetching}
          />
          <Button onClick={handleSearch} disabled={isFetching || !query.trim()}>
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Supplier Selector (multi-supplier mode only) */}
        {!supplierId && suppliers.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Filtrer par fournisseur (optionnel) :
            </p>
            <div className="flex flex-wrap gap-2">
              {suppliers.map((supplier) => (
                <Badge
                  key={supplier.id}
                  variant={
                    selectedSupplierIds.includes(supplier.id)
                      ? "default"
                      : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleSupplier(supplier.id)}
                >
                  {supplier.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {isFetching && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {error && !isFetching && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p>
              {error instanceof Error
                ? error.message
                : "Erreur lors de la recherche. Veuillez réessayer."}
            </p>
          </div>
        )}

        {cachedResult && !isFetching && (
          <div className="space-y-6">
            {/* Summary Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h3 className="text-base font-semibold">Résumé</h3>
                {(() => {
                  const citationMatches =
                    cachedResult.summary.match(/\[\d+\]/g) || [];
                  const uniqueCitations = [...new Set(citationMatches)];
                  const citationCount = uniqueCitations.length;
                  const sourceCount = cachedResult.sources.length;

                  if (citationCount > sourceCount && sourceCount > 0) {
                    return (
                      <Badge variant="secondary" className="text-xs">
                        {sourceCount} source{sourceCount > 1 ? "s" : ""}{" "}
                        disponible{sourceCount > 1 ? "s" : ""}
                      </Badge>
                    );
                  }
                  return null;
                })()}
              </div>
              {renderSummary(cachedResult.summary)}
              {(() => {
                const citationMatches =
                  cachedResult.summary.match(/\[\d+\]/g) || [];
                const uniqueCitations = [...new Set(citationMatches)];
                const citationCount = uniqueCitations.length;
                const sourceCount = cachedResult.sources.length;

                if (citationCount > sourceCount && sourceCount > 0) {
                  return (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 italic">
                      Note : Le résumé cite {citationCount} sources mais seules{" "}
                      {sourceCount} correspondent aux fournisseurs sélectionnés.
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            {/* Sources Section */}
            {cachedResult.sources.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-semibold">
                  Sources ({cachedResult.sources.length})
                </h3>
                <ScrollArea className="h-96">
                  <div className="space-y-3 pr-4">
                    {cachedResult.sources.map((source, index) => (
                      <div
                        key={source.id}
                        id={`source-${index + 1}`}
                        className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
                                {index + 1}
                              </span>
                              <p className="font-medium text-sm text-slate-900 dark:text-slate-100">
                                {source.title}
                              </p>
                              {source.supplierName && (
                                <Badge variant="secondary" className="text-xs">
                                  {source.supplierName}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 pl-8">
                              Page {source.pageNumber}
                            </p>
                            {source.excerpt && (
                              <p className="text-xs text-slate-700 dark:text-slate-300 italic pl-8">
                                &ldquo;{source.excerpt.substring(0, 150)}
                                {source.excerpt.length > 150 ? "..." : ""}
                                &rdquo;
                              </p>
                            )}
                          </div>
                          {source.documentId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5 text-xs h-8"
                              onClick={() => {
                                // Ouvrir PDF à la page spécifique
                                window.open(
                                  `/dashboard/rfp/${rfpId}/documents/${source.documentId}?page=${source.pageNumber}`,
                                  "_blank"
                                );
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                              Voir
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        {!isFetching && !error && cachedResult && cachedResult.sources.length === 0 && (
          <div className="text-center p-8 text-slate-500 dark:text-slate-400">
            Aucun résultat trouvé. Essayez une autre recherche.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
