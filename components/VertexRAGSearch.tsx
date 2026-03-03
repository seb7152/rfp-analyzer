"use client";

import { useState } from "react";
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
  const [submitted, setSubmitted] = useState(false);

  // Multi-select supplier logic
  const toggleSupplier = (id: string) => {
    setSelectedSupplierIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  // Search query
  const { data, isLoading, error, refetch } = useQuery<SearchResult>({
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
      return res.json();
    },
    enabled: submitted && query.length > 0,
    staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
  });

  const handleSearch = () => {
    if (query.trim()) {
      setSubmitted(true);
      refetch();
    }
  };

  // Rendu du résumé avec ReactMarkdown (citations inline en texte simple)
  const renderSummary = (summary: string) => {
    return (
      <div className="prose dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Réutiliser les composants de SoutenanceBriefSection.tsx
            h1: ({ children }) => (
              <h1 className="text-2xl font-bold mt-6 mb-3 first:mt-0">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold mt-5 mb-3 border-b pb-1">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="mb-3 leading-relaxed">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-outside mb-4 space-y-1 pl-5">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-outside mb-4 space-y-1 pl-5">
                {children}
              </ol>
            ),
            li: ({ children }) => <li className="mb-1">{children}</li>,
            code: ({ className, children, ...props }: any) => {
              const inline = !className;
              return inline ? (
                <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-sm">
                  {children}
                </code>
              ) : (
                <code className="block bg-slate-100 dark:bg-slate-800 p-3 rounded-lg overflow-x-auto">
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
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} disabled={isLoading || !query.trim()}>
            {isLoading ? (
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
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <p>
              {error instanceof Error
                ? error.message
                : "Erreur lors de la recherche. Veuillez réessayer."}
            </p>
          </div>
        )}

        {data && !isLoading && (
          <div className="space-y-6">
            {/* Summary Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">Résumé</h3>
              {renderSummary(data.summary)}
            </div>

            {/* Sources Section */}
            {data.sources.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold">
                  Sources ({data.sources.length})
                </h3>
                <ScrollArea className="h-96">
                  <div className="space-y-3 pr-4">
                    {data.sources.map((source, index) => (
                      <div
                        key={source.id}
                        id={`source-${index + 1}`}
                        className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline">[{index + 1}]</Badge>
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {source.title}
                              </p>
                              {source.supplierName && (
                                <Badge variant="secondary" className="text-xs">
                                  {source.supplierName}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Page {source.pageNumber}
                            </p>
                            {source.excerpt && (
                              <p className="text-sm text-slate-700 dark:text-slate-300 italic">
                                &ldquo;{source.excerpt.substring(0, 200)}
                                {source.excerpt.length > 200 ? "..." : ""}
                                &rdquo;
                              </p>
                            )}
                          </div>
                          {source.documentId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-2"
                              onClick={() => {
                                // Ouvrir PDF à la page spécifique
                                window.open(
                                  `/dashboard/rfp/${rfpId}/documents/${source.documentId}?page=${source.pageNumber}`,
                                  "_blank"
                                );
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
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

        {submitted && !isLoading && !error && !data && (
          <div className="text-center p-8 text-slate-500 dark:text-slate-400">
            Aucun résultat trouvé. Essayez une autre recherche.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
