"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CheckCircle2,
  Clock,
  Loader,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { SuggestionsPanel } from "./SuggestionsPanel";

interface Supplier {
  id: string;
  name: string;
}

interface Analysis {
  id: string;
  supplier_id: string;
  status: string;
  created_at: string;
  analysis_data: {
    summary?: string;
    report?: string; // Markdown formatted
    suggestions?: Array<{
      requirementId: string;
      suggestedResponse?: string;
      suggestedComment?: string;
      answeredQuestion?: string;
    }>;
  };
  suggestions_status?: Record<string, string>; // {requirementId: "inserted"|"pending"|"rejected"}
}

export function PresentationReport({
  rfpId,
  suppliers,
  versionId,
}: {
  rfpId: string;
  suppliers: Supplier[];
  versionId?: string;
}) {
  const [activeTab, setActiveTab] = useState<string>(suppliers[0]?.id || "");
  const [analyses, setAnalyses] = useState<Map<string, Analysis>>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch analyses
  const fetchResults = async (suppressLoading = false) => {
    if (!suppressLoading) setLoading(true);
    setRefreshing(true);

    try {
      const url = new URL(
        `/api/rfps/${rfpId}/analyze-presentation/results/latest`,
        window.location.origin
      );
      if (versionId) {
        url.searchParams.append("versionId", versionId);
      }
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error("Failed to fetch results");
      }

      const data = await response.json();
      const analysesMap = new Map<string, Analysis>();

      (data.analyses || []).forEach((analysis: Analysis) => {
        analysesMap.set(analysis.supplier_id, analysis);
      });

      setAnalyses(analysesMap);
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error("Erreur lors de la récupération des résultats");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch results when mounted or when versionId changes
  useEffect(() => {
    fetchResults();
  }, [rfpId, versionId]);

  // Auto-refresh every 5 seconds when processing
  useEffect(() => {
    const currentAnalysis = analyses.get(activeTab);
    if (!currentAnalysis || currentAnalysis.status !== "processing") return;

    const interval = setInterval(() => {
      fetchResults(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [analyses, activeTab, rfpId]);

  const currentAnalysis = analyses.get(activeTab);
  const suggestions = currentAnalysis?.analysis_data?.suggestions || [];

  return (
    <div className="space-y-6">
      {suppliers.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full gap-2 border-b border-slate-200 bg-transparent p-0 dark:border-slate-800">
            {suppliers.map((supplier) => {
              const supplierAnalysis = analyses.get(supplier.id);
              const status = supplierAnalysis?.status;

              return (
                <TabsTrigger
                  key={supplier.id}
                  value={supplier.id}
                  className="flex items-center gap-2 rounded-none border-b-2 border-b-transparent px-4 py-3 text-sm font-medium text-slate-500 transition hover:text-slate-700 data-[state=active]:border-b-slate-900 data-[state=active]:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:data-[state=active]:border-b-white dark:data-[state=active]:text-white"
                >
                  {supplier.name}
                  {status === "completed" && (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  )}
                  {status === "processing" && (
                    <Loader className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                  {status === "failed" && (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {suppliers.map((supplier) => (
            <TabsContent
              key={supplier.id}
              value={supplier.id}
              className="space-y-6 mt-6"
            >
              {loading ? (
                <>
                  <Skeleton className="h-32 rounded-2xl" />
                  <Skeleton className="h-48 rounded-2xl" />
                </>
              ) : !currentAnalysis ? (
                <Card className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
                  <Clock className="h-12 w-12 mx-auto text-slate-400 mb-3" />
                  <p className="text-slate-600 dark:text-slate-400">
                    Aucune analyse disponible pour ce fournisseur
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Status Card */}
                  <Card className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {currentAnalysis.status === "completed" && (
                          <>
                            <CheckCircle2 className="h-6 w-6 text-green-600" />
                            <span className="font-medium text-green-600">
                              Analyse complétée
                            </span>
                          </>
                        )}
                        {currentAnalysis.status === "processing" && (
                          <>
                            <Loader className="h-6 w-6 animate-spin text-blue-600" />
                            <span className="font-medium text-blue-600">
                              Analyse en cours...
                            </span>
                          </>
                        )}
                        {currentAnalysis.status === "failed" && (
                          <>
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                            <span className="font-medium text-red-600">
                              Erreur lors de l'analyse
                            </span>
                          </>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchResults()}
                        disabled={refreshing}
                        className="gap-2"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            refreshing ? "animate-spin" : ""
                          }`}
                        />
                        Actualiser
                      </Button>
                    </div>

                    {/* Summary */}
                    {currentAnalysis.analysis_data?.summary && (
                      <div className="space-y-2">
                        <h3 className="font-medium text-slate-900 dark:text-white">
                          Résumé de la soutenance
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300">
                          {currentAnalysis.analysis_data.summary}
                        </p>
                      </div>
                    )}
                  </Card>

                  {/* Two-column layout: Report (2/3) and Suggestions (1/3) */}
                  <div
                    className="grid grid-cols-3 gap-6"
                    style={{ height: "600px" }}
                  >
                    {/* Report - Left (2 columns) */}
                    <div className="col-span-2 overflow-hidden flex flex-col">
                      {currentAnalysis.analysis_data?.report && (
                        <Card className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800 flex flex-col h-full overflow-hidden">
                          <h3 className="font-medium text-slate-900 dark:text-white mb-4 flex-shrink-0">
                            Compte rendu
                          </h3>
                          <div className="overflow-y-auto flex-1 prose prose-sm dark:prose-invert max-w-none text-sm text-slate-600 dark:text-slate-300">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({ children }) => (
                                  <h1 className="text-2xl font-bold mt-4 mb-2 first:mt-0">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="text-xl font-bold mt-3 mb-2">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="text-lg font-semibold mt-2 mb-1">
                                    {children}
                                  </h3>
                                ),
                                p: ({ children }) => (
                                  <p className="mb-3">{children}</p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="list-disc list-inside mb-3 space-y-1">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="list-decimal list-inside mb-3 space-y-1">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => (
                                  <li className="ml-2">{children}</li>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic my-3">
                                    {children}
                                  </blockquote>
                                ),
                                code: ({ children, ...props }: any) => {
                                  const inline =
                                    !props.className?.includes("language-");
                                  return inline ? (
                                    <code className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-sm font-mono">
                                      {children}
                                    </code>
                                  ) : (
                                    <code
                                      className="block bg-slate-100 dark:bg-slate-800 p-3 rounded mb-3 overflow-x-auto font-mono text-sm"
                                      {...props}
                                    >
                                      {children}
                                    </code>
                                  );
                                },
                                table: ({ children }) => (
                                  <table className="border-collapse border border-slate-300 dark:border-slate-600 w-full mb-3">
                                    {children}
                                  </table>
                                ),
                                th: ({ children }) => (
                                  <th className="border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-left">
                                    {children}
                                  </th>
                                ),
                                td: ({ children }) => (
                                  <td className="border border-slate-300 dark:border-slate-600 px-3 py-2">
                                    {children}
                                  </td>
                                ),
                              }}
                            >
                              {currentAnalysis.analysis_data.report}
                            </ReactMarkdown>
                          </div>
                        </Card>
                      )}
                    </div>

                    {/* Suggestions - Right (1 column) */}
                    <div className="col-span-1 overflow-hidden flex flex-col">
                      <div className="overflow-y-auto flex-1">
                        <SuggestionsPanel
                          rfpId={rfpId}
                          supplierId={activeTab}
                          analysisId={currentAnalysis.id}
                          suggestions={suggestions}
                          suggestionsStatus={currentAnalysis.suggestions_status}
                          versionId={versionId}
                          onInsertSuggestion={() => fetchResults(true)}
                          onDeleteSuggestion={() => fetchResults(true)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {suppliers.length === 0 && (
        <Card className="rounded-2xl border border-dashed border-slate-300 p-8 text-center dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">
            Aucun fournisseur disponible
          </p>
        </Card>
      )}
    </div>
  );
}
