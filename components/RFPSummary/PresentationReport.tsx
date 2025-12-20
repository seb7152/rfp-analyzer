"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader,
  MessageSquare,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
}

interface Analysis {
  id: string;
  analysis_id: string;
  supplier_id: string;
  status: string;
  transcript: string;
  analysis_data: {
    summary?: string;
    keyPoints?: string[];
    suggestionsCount?: {
      responses: number;
      comments: number;
      questions: number;
    };
  };
  suggestions_count: number;
}

interface Suggestion {
  id: string;
  analysis_id: string;
  requirement_id: string;
  original_response?: string;
  suggested_response?: string;
  original_comment?: string;
  suggested_comment?: string;
  original_question?: string;
  answered_question?: string;
  status: string;
}

export function PresentationReport({
  rfpId,
  suppliers,
}: {
  rfpId: string;
  suppliers: Supplier[];
}) {
  const [activeTab, setActiveTab] = useState<string>(suppliers[0]?.id || "");
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<string>>(
    new Set()
  );

  // Fetch analyses and suggestions
  const fetchResults = async (suppressLoading = false) => {
    if (!suppressLoading) setLoading(true);
    setRefreshing(true);

    try {
      const response = await fetch(
        `/api/rfps/${rfpId}/analyze-presentation/results/latest?supplierId=${activeTab}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch results");
      }

      const data = await response.json();
      setAnalyses(data.analyses || []);
      setSuggestions(data.suggestions || []);
    } catch (error) {
      console.error("Error fetching results:", error);
      toast.error("Erreur lors de la récupération des résultats");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch results when tab changes
  useEffect(() => {
    if (activeTab) {
      fetchResults();
    }
  }, [activeTab, rfpId]);

  // Auto-refresh every 5 seconds when analyses are processing
  useEffect(() => {
    const hasProcessing = analyses.some((a) => a.status === "processing");

    if (!hasProcessing) return;

    const interval = setInterval(() => {
      fetchResults(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [analyses, activeTab, rfpId]);

  const currentAnalysis = analyses[0];
  const suggestionsByType = {
    responses: suggestions.filter((s) => s.suggested_response),
    comments: suggestions.filter((s) => s.suggested_comment),
    questions: suggestions.filter((s) => s.answered_question),
  };

  const toggleSuggestion = (suggestionId: string) => {
    setExpandedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(suggestionId)) {
        next.delete(suggestionId);
      } else {
        next.add(suggestionId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {suppliers.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex w-full gap-2 border-b border-slate-200 bg-transparent p-0 dark:border-slate-800">
            {suppliers.map((supplier) => {
              const supplierAnalyses = analyses.filter(
                (a) => a.supplier_id === supplier.id
              );
              const status = supplierAnalyses[0]?.status;

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
                <>
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

                    {/* Key Points */}
                    {currentAnalysis.analysis_data?.keyPoints &&
                      currentAnalysis.analysis_data.keyPoints.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            Points clés
                          </h3>
                          <ul className="space-y-1">
                            {currentAnalysis.analysis_data.keyPoints.map(
                              (point, i) => (
                                <li key={i} className="text-sm text-slate-600 dark:text-slate-300 flex gap-2">
                                  <span className="text-slate-400">•</span>
                                  {point}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </Card>

                  {/* Suggestions Summary */}
                  {suggestions.length > 0 && (
                    <Card className="rounded-2xl border border-blue-200 bg-blue-50/50 p-6 dark:border-blue-900 dark:bg-blue-950/20">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="space-y-3 flex-1">
                          <h3 className="font-medium text-slate-900 dark:text-white">
                            Suggestions de mise à jour
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            {suggestionsByType.responses.length > 0 && (
                              <Badge variant="secondary">
                                {suggestionsByType.responses.length} réponses
                              </Badge>
                            )}
                            {suggestionsByType.comments.length > 0 && (
                              <Badge variant="secondary">
                                {suggestionsByType.comments.length} commentaires
                              </Badge>
                            )}
                            {suggestionsByType.questions.length > 0 && (
                              <Badge variant="secondary">
                                {suggestionsByType.questions.length} questions
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </Card>
                  )}

                  {/* Suggestions Details */}
                  {suggestions.length > 0 && (
                    <div className="space-y-4">
                      {/* Response Suggestions */}
                      {suggestionsByType.responses.length > 0 && (
                        <Card className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                          <h3 className="font-medium text-slate-900 dark:text-white mb-4">
                            Réponses suggérées ({suggestionsByType.responses.length})
                          </h3>
                          <div className="space-y-3">
                            {suggestionsByType.responses.map((sugg) => (
                              <div
                                key={sugg.id}
                                className="border border-slate-200 rounded-lg p-4 dark:border-slate-700"
                              >
                                <button
                                  onClick={() => toggleSuggestion(sugg.id)}
                                  className="w-full text-left font-medium text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between"
                                >
                                  <span>Exigence {sugg.requirement_id.substring(0, 8)}</span>
                                  <span className="text-xs text-slate-500">
                                    {expandedSuggestions.has(sugg.id) ? "−" : "+"}
                                  </span>
                                </button>

                                {expandedSuggestions.has(sugg.id) && (
                                  <div className="mt-3 space-y-2 text-sm">
                                    {sugg.original_response && (
                                      <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                          Réponse actuelle
                                        </p>
                                        <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                          {sugg.original_response}
                                        </p>
                                      </div>
                                    )}
                                    {sugg.suggested_response && (
                                      <div>
                                        <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">
                                          Réponse suggérée
                                        </p>
                                        <p className="text-slate-700 dark:text-slate-300 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                                          {sugg.suggested_response}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Comment Suggestions */}
                      {suggestionsByType.comments.length > 0 && (
                        <Card className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                          <h3 className="font-medium text-slate-900 dark:text-white mb-4">
                            Commentaires suggérés ({suggestionsByType.comments.length})
                          </h3>
                          <div className="space-y-3">
                            {suggestionsByType.comments.map((sugg) => (
                              <div
                                key={sugg.id}
                                className="border border-slate-200 rounded-lg p-4 dark:border-slate-700"
                              >
                                <button
                                  onClick={() => toggleSuggestion(sugg.id)}
                                  className="w-full text-left font-medium text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between"
                                >
                                  <span>Exigence {sugg.requirement_id.substring(0, 8)}</span>
                                  <span className="text-xs text-slate-500">
                                    {expandedSuggestions.has(sugg.id) ? "−" : "+"}
                                  </span>
                                </button>

                                {expandedSuggestions.has(sugg.id) && (
                                  <div className="mt-3 space-y-2 text-sm">
                                    {sugg.original_comment && (
                                      <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                          Commentaire actuel
                                        </p>
                                        <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                          {sugg.original_comment}
                                        </p>
                                      </div>
                                    )}
                                    {sugg.suggested_comment && (
                                      <div>
                                        <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">
                                          Commentaire suggéré
                                        </p>
                                        <p className="text-slate-700 dark:text-slate-300 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                                          {sugg.suggested_comment}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}

                      {/* Question Suggestions */}
                      {suggestionsByType.questions.length > 0 && (
                        <Card className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
                          <h3 className="font-medium text-slate-900 dark:text-white mb-4">
                            Questions répondues ({suggestionsByType.questions.length})
                          </h3>
                          <div className="space-y-3">
                            {suggestionsByType.questions.map((sugg) => (
                              <div
                                key={sugg.id}
                                className="border border-slate-200 rounded-lg p-4 dark:border-slate-700"
                              >
                                <button
                                  onClick={() => toggleSuggestion(sugg.id)}
                                  className="w-full text-left font-medium text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 flex items-center justify-between"
                                >
                                  <span>Exigence {sugg.requirement_id.substring(0, 8)}</span>
                                  <span className="text-xs text-slate-500">
                                    {expandedSuggestions.has(sugg.id) ? "−" : "+"}
                                  </span>
                                </button>

                                {expandedSuggestions.has(sugg.id) && (
                                  <div className="mt-3 space-y-2 text-sm">
                                    {sugg.original_question && (
                                      <div>
                                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                          Question
                                        </p>
                                        <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-2 rounded">
                                          {sugg.original_question}
                                        </p>
                                      </div>
                                    )}
                                    {sugg.answered_question && (
                                      <div>
                                        <p className="text-xs font-medium text-green-600 uppercase tracking-wider mb-1">
                                          Réponse proposée
                                        </p>
                                        <p className="text-slate-700 dark:text-slate-300 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                                          {sugg.answered_question}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </Card>
                      )}
                    </div>
                  )}
                </>
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
