"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  Trash2,
  Plus,
  Info,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface Suggestion {
  requirementId: string;
  suggestedResponse?: string;
  suggestedComment?: string;
  answeredQuestion?: string;
}

interface Requirement {
  id: string;
  requirement_id_external: string;
  title: string;
}

interface Response {
  id: string;
  response_id: string;
  manual_comment: string | null;
  question: string | null;
}

interface SuggestionsPanelProps {
  rfpId: string;
  supplierId: string;
  analysisId: string;
  suggestions: Suggestion[];
  suggestionsStatus?: Record<string, string>; // {requirementId: "inserted"|"pending"|"rejected"}
  onDeleteSuggestion?: (requirementId: string) => void;
  onInsertSuggestion?: (requirementId: string, suggestion: Suggestion) => void;
  versionId?: string;
}

export function SuggestionsPanel({
  rfpId,
  supplierId,
  analysisId,
  suggestions,
  suggestionsStatus,
  onDeleteSuggestion,
  onInsertSuggestion,
  versionId,
}: SuggestionsPanelProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [requirementTitles, setRequirementTitles] = useState<
    Map<string, Requirement>
  >(new Map());
  const [currentValues, setCurrentValues] = useState<Map<string, Response>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [insertingId, setInsertingId] = useState<string | null>(null);
  const [deletedSuggestions, setDeletedSuggestions] = useState<Set<string>>(
    new Set(
      suggestionsStatus
        ? Object.entries(suggestionsStatus)
            .filter(([, status]) => status === "rejected")
            .map(([id]) => id)
        : []
    )
  );

  // Local optimistic updates for immediate UI feedback
  const [optimisticStatus, setOptimisticStatus] = useState<
    Record<string, string>
  >({});

  // Merge suggestionsStatus with optimistic updates
  const effectiveStatus = { ...suggestionsStatus, ...optimisticStatus };

  // Update inserted/deleted suggestions when suggestionsStatus prop changes
  useEffect(() => {
    if (suggestionsStatus) {
      const deleted = new Set(
        Object.entries(suggestionsStatus)
          .filter(([, status]) => status === "rejected")
          .map(([id]) => id)
      );
      setDeletedSuggestions(deleted);
    }
  }, [suggestionsStatus]);

  // Fetch requirement titles
  useEffect(() => {
    const fetchRequirements = async () => {
      try {
        const url = new URL(
          `/api/rfps/${rfpId}/requirements`,
          window.location.origin
        );
        if (versionId) {
          url.searchParams.append("versionId", versionId);
        }
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Failed to fetch requirements");

        const data: Requirement[] = await response.json();
        const titleMap = new Map(data.map((req) => [req.id, req]));
        setRequirementTitles(titleMap);
      } catch (error) {
        console.error("Error fetching requirements:", error);
        toast.error("Erreur lors du chargement des exigences");
      }
    };

    if (suggestions.length > 0) {
      fetchRequirements();
    }
  }, [rfpId, suggestions, versionId]);

  // Fetch current comment/question values
  useEffect(() => {
    const fetchCurrentValues = async () => {
      try {
        const url = new URL(
          `/api/rfps/${rfpId}/responses`,
          window.location.origin
        );
        if (versionId) {
          url.searchParams.append("versionId", versionId);
        }
        const response = await fetch(url.toString());
        if (!response.ok) throw new Error("Failed to fetch responses");

        const { responses } = await response.json();

        // Filter responses for this supplier only
        const supplierResponses = (responses || []).filter(
          (r: any) => r.supplier_id === supplierId
        );

        const valuesMap = new Map<string, Response>();
        supplierResponses.forEach((resp: any) => {
          valuesMap.set(resp.requirement_id, {
            id: resp.requirement_id,
            response_id: resp.id,
            manual_comment: resp.manual_comment,
            question: resp.question,
          });
        });
        setCurrentValues(valuesMap);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching current values:", error);
        setLoading(false);
      }
    };

    if (suggestions.length > 0) {
      fetchCurrentValues();
    } else {
      setLoading(false);
    }
  }, [rfpId, supplierId, suggestions, versionId]);

  const toggleExpanded = (requirementId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(requirementId)) {
        next.delete(requirementId);
      } else {
        next.add(requirementId);
      }
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedItems.size === suggestions.length) {
      setExpandedItems(new Set());
    } else {
      setExpandedItems(new Set(suggestions.map((s) => s.requirementId)));
    }
  };

  const handleDelete = async (requirementId: string) => {
    try {
      // Update suggestion status in database
      const statusResponse = await fetch(
        `/api/rfps/${rfpId}/analyze-presentation/${analysisId}/suggestion-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requirementId,
            status: "rejected",
          }),
        }
      );

      if (!statusResponse.ok) {
        throw new Error("Failed to update suggestion status");
      }

      // Optimistic update for immediate UI feedback
      setOptimisticStatus((prev) => ({ ...prev, [requirementId]: "rejected" }));
      setDeletedSuggestions((prev) => new Set([...prev, requirementId]));
      toast.success("Suggestion supprimée");

      if (onDeleteSuggestion) {
        onDeleteSuggestion(requirementId);
      }
    } catch (error) {
      console.error("Error deleting suggestion:", error);
      toast.error("Erreur lors de la suppression de la suggestion");
    }
  };

  const handleInsert = async (
    requirementId: string,
    suggestion: Suggestion
  ) => {
    setInsertingId(requirementId);
    try {
      const currentValue = currentValues.get(requirementId);
      const suggestionToInsert =
        suggestion.suggestedComment || suggestion.answeredQuestion;

      if (!suggestionToInsert) {
        toast.error("Aucune suggestion à insérer");
        setInsertingId(null);
        return;
      }

      // Build the new comment with existing value + suggested value
      const existingText = currentValue?.manual_comment || "";
      const newComment = existingText
        ? `${existingText}\n\n${suggestionToInsert}`
        : suggestionToInsert;

      // Update the response with the new comment
      const response = await fetch(
        `/api/rfps/${rfpId}/responses/${currentValue?.response_id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            manual_comment: newComment,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update response");
      }

      // Update suggestion status in database
      const statusResponse = await fetch(
        `/api/rfps/${rfpId}/analyze-presentation/${analysisId}/suggestion-status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requirementId,
            status: "inserted",
          }),
        }
      );

      if (!statusResponse.ok) {
        console.warn("Failed to persist suggestion status");
      } else {
        console.log(
          "✅ Suggestion status updated successfully for requirementId:",
          requirementId
        );

        // Optimistic update for immediate UI feedback
        setOptimisticStatus((prev) => ({
          ...prev,
          [requirementId]: "inserted",
        }));

        // Refresh suggestionsStatus by calling parent's refresh function
        if (onInsertSuggestion) {
          onInsertSuggestion(requirementId, suggestion);
        }
      }

      toast.success("Suggestion insérée avec succès");
    } catch (error) {
      console.error("Error inserting suggestion:", error);
      toast.error("Erreur lors de l'insertion de la suggestion");
    } finally {
      setInsertingId(null);
    }
  };

  if (suggestions.length === 0) {
    return (
      <Card className="rounded-2xl border border-slate-200 p-6 dark:border-slate-800">
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
          Aucune suggestion disponible
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with expand/collapse all */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-slate-900 dark:text-white">
          Suggestions ({suggestions.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleExpandAll}
          className="gap-2 text-xs"
        >
          {expandedItems.size === suggestions.length ? (
            <>
              <ChevronUp className="h-4 w-4" />
              Tout replier
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              Tout déplier
            </>
          )}
        </Button>
      </div>

      {/* Suggestions list */}
      <div className="space-y-2">
        {suggestions.map((suggestion, idx) => {
          const requirement = requirementTitles.get(suggestion.requirementId);
          const currentValue = currentValues.get(suggestion.requirementId);
          const isExpanded = expandedItems.has(suggestion.requirementId);

          const isDeleted = deletedSuggestions.has(suggestion.requirementId);

          return (
            <Card
              key={`${suggestion.requirementId}-${idx}`}
              className={`rounded-lg border p-4 transition-colors ${
                isDeleted
                  ? "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30 opacity-60"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <button
                  onClick={() =>
                    !isDeleted && toggleExpanded(suggestion.requirementId)
                  }
                  className="flex-1 text-left"
                  disabled={isDeleted}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                    <div className="flex-1">
                      {loading ? (
                        <Skeleton className="h-4 w-48" />
                      ) : (
                        <>
                          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            {requirement?.requirement_id_external ||
                              "ID inconnu"}
                          </p>
                          <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
                            {requirement?.title || "Exigence non trouvée"}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-2">
                  {/* Info Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isDeleted}
                        className="h-5 w-5 rounded-full p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-4" align="start">
                      <div className="space-y-3">
                        {/* Requirement info */}
                        {requirement && (
                          <div>
                            <h4 className="font-medium text-sm">
                              {requirement.requirement_id_external}:{" "}
                              {requirement.title}
                            </h4>
                          </div>
                        )}

                        {/* Current comment */}
                        {currentValue?.manual_comment && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              Commentaire actuel
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/20 p-2 rounded">
                              {currentValue.manual_comment}
                            </p>
                          </div>
                        )}

                        {/* Current question */}
                        {currentValue?.question && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                              Question actuelle
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/20 p-2 rounded">
                              {currentValue.question}
                            </p>
                          </div>
                        )}

                        {/* Link to evaluate */}
                        {requirement && (
                          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                            <Link
                              href={`/dashboard/rfp/${rfpId}/evaluate?requirementId=${requirement.id}`}
                              target="_blank"
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Voir dans l'évaluation
                              </Button>
                            </Link>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Delete or Check button */}
                  {effectiveStatus?.[suggestion.requirementId] ===
                  "rejected" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      className="text-slate-400 dark:text-slate-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : effectiveStatus?.[suggestion.requirementId] ===
                    "inserted" ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled
                      className="text-green-600"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(suggestion.requirementId)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && !isDeleted && (
                <div className="mt-4 space-y-3 border-t border-slate-200 pt-3 dark:border-slate-700">
                  {/* Current value */}
                  {(currentValue?.manual_comment || currentValue?.question) && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-slate-600 uppercase tracking-wider dark:text-slate-400">
                        Valeur actuelle
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/20 p-2 rounded">
                        {currentValue.manual_comment ||
                          currentValue.question ||
                          "—"}
                      </p>
                    </div>
                  )}

                  {/* Suggested response */}
                  {suggestion.suggestedResponse && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wider">
                        Réponse suggérée
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                        {suggestion.suggestedResponse}
                      </p>
                    </div>
                  )}

                  {/* Suggested comment */}
                  {suggestion.suggestedComment && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wider">
                        Commentaire suggéré
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                        {suggestion.suggestedComment}
                      </p>
                    </div>
                  )}

                  {/* Suggested answer */}
                  {suggestion.answeredQuestion && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-green-600 uppercase tracking-wider">
                        Réponse proposée
                      </p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 bg-green-50 dark:bg-green-950/20 p-2 rounded">
                        {suggestion.answeredQuestion}
                      </p>
                    </div>
                  )}

                  {/* Insert button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleInsert(suggestion.requirementId, suggestion)
                    }
                    disabled={
                      effectiveStatus?.[suggestion.requirementId] ===
                        "inserted" || insertingId === suggestion.requirementId
                    }
                    className="w-full gap-2"
                  >
                    {insertingId === suggestion.requirementId ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900 dark:border-slate-600 dark:border-t-white" />
                        Insertion...
                      </>
                    ) : effectiveStatus?.[suggestion.requirementId] ===
                      "inserted" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        Insérée
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Insérer la suggestion
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
