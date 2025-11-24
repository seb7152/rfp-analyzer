"use client";

import React, { useState } from "react";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Star,
  ChevronUp,
  Copy,
  Zap,
  Clock,
} from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { StatusSwitch } from "@/components/ui/status-switch";
import { RoundCheckbox } from "@/components/ui/round-checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Requirement,
  Response,
  getRequirementPath,
  getRequirementById,
  generateResponses,
  suppliersData,
} from "@/lib/fake-data";

interface ComparisonViewProps {
  selectedRequirementId: string;
  allRequirements: Requirement[];
  onRequirementChange: (id: string) => void;
}

export function ComparisonView({
  selectedRequirementId,
  allRequirements,
  onRequirementChange,
}: ComparisonViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [contextExpanded, setContextExpanded] = useState(false);
  const [responses, setResponses] = useState<Response[]>(generateResponses());
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<
    Record<string, "pass" | "partial" | "fail" | "pending">
  >({});
  const [responseChecks, setResponseChecks] = useState<Record<string, boolean>>(
    {}
  );

  const requirement = getRequirementById(
    selectedRequirementId,
    allRequirements
  );
  const path = getRequirementPath(selectedRequirementId, allRequirements);
  const requirementResponses = responses.filter(
    (r) => r.requirementId === selectedRequirementId
  );

  // Pagination
  const flatReqs = allRequirements.filter((r) => r.level === 4);
  const currentIndex = flatReqs.findIndex(
    (r) => r.id === selectedRequirementId
  );
  const totalPages = flatReqs.length;

  const goToRequirement = (index: number) => {
    if (index >= 0 && index < flatReqs.length) {
      onRequirementChange(flatReqs[index].id);
    }
  };

  const toggleRow = (supplierId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(supplierId)) {
      newExpanded.delete(supplierId);
    } else {
      newExpanded.add(supplierId);
    }
    setExpandedRows(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 4)
      return "bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100";
    if (score >= 3)
      return "bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100";
    return "bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100";
  };

  const getStatusBadge = (response: Response) => {
    const status = statuses[response.id] ?? "pending";

    return status === "pass" ? (
      <Badge className="bg-green-500 px-3 py-1.5">
        <CheckCircle2 className="w-4 h-4 mr-1.5" />
        Conforme
      </Badge>
    ) : status === "partial" ? (
      <Badge className="bg-blue-500 px-3 py-1.5">
        <Zap className="w-4 h-4 mr-1.5" />
        Partiel
      </Badge>
    ) : status === "fail" ? (
      <Badge className="bg-red-500 px-3 py-1.5">
        <AlertCircle className="w-4 h-4 mr-1.5" />
        Non conforme
      </Badge>
    ) : (
      <Badge variant="outline" className="px-3 py-1.5">
        <Clock className="w-4 h-4 mr-1.5" />
        Attente
      </Badge>
    );
  };
  // Check if all responses for current requirement are checked
  const allResponsesChecked =
    requirementResponses.length > 0 &&
    requirementResponses.every((r) => responseChecks[r.id]);

  const renderStars = (score: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${
              i <= score
                ? "fill-yellow-400 text-yellow-400"
                : "text-slate-300 dark:text-slate-600"
            }`}
          />
        ))}
      </div>
    );
  };

  if (!requirement) {
    return <div className="p-6">Exigence non trouvée</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <Breadcrumb>
          <BreadcrumbList>
            {path.map((item, idx) => (
              <React.Fragment key={item.id}>
                {idx > 0 && <BreadcrumbSeparator />}
                {idx === path.length - 1 ? (
                  <BreadcrumbPage className="text-slate-900 dark:text-white font-medium">
                    {item.id}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbLink className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                      {item.id}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                )}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header with simple pagination */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {requirement.title}
              </h2>
              {allResponsesChecked ? (
                <Badge className="bg-green-500 px-2 py-1">
                  <CheckCircle2 className="w-4 h-4" />
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="px-2 py-1 border-dashed border-slate-300 dark:border-slate-600"
                >
                  <Clock className="w-4 h-4" />
                </Badge>
              )}
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
              {requirement.description}
            </p>
          </div>

          {/* Simple pagination - chevrons only */}
          <div className="flex items-center gap-2 ml-6 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goToRequirement(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="h-8 w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-slate-600 dark:text-slate-400 min-w-[50px] text-center">
              {currentIndex + 1}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goToRequirement(currentIndex + 1)}
              disabled={currentIndex === totalPages - 1}
              className="h-8 w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Context section - Collapsible */}
      <div className="border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setContextExpanded(!contextExpanded)}
          className="w-full px-6 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
        >
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            Contexte du cahier des charges
          </span>
          {contextExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          )}
        </button>

        {contextExpanded && (
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 space-y-3">
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {requirement.context}
            </p>
            <Button variant="outline" size="sm">
              Ouvrir dans le PDF
            </Button>
          </div>
        )}
      </div>

      {/* Comparison Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-2">
          {suppliersData.map((supplier) => {
            const response = requirementResponses.find(
              (r) => r.supplierId === supplier.id
            );
            if (!response) return null;

            const isExpanded = expandedRows.has(supplier.id);
            const finalScore = manualScores[response.id] ?? response.aiScore;

            return (
              <div
                key={supplier.id}
                className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden"
              >
                {/* Main row */}
                <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-950">
                  {/* Expand button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleRow(supplier.id)}
                    className="flex-shrink-0"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Checkbox - left side */}
                  <RoundCheckbox
                    checked={responseChecks[response.id] ?? false}
                    onChange={(checked) =>
                      setResponseChecks({
                        ...responseChecks,
                        [response.id]: checked,
                      })
                    }
                  />

                  {/* Supplier name */}
                  <div className="font-medium text-slate-900 dark:text-white text-sm flex-shrink-0 w-44">
                    {supplier.name}
                  </div>

                  {/* Response text excerpt */}
                  <div className="flex-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-xl">
                    {response.responseText}
                  </div>

                  {/* Stars and score - center right */}
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-shrink-0 w-48"
                    title="Cliquez pour changer le score"
                  >
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4, 5].map((i) => {
                        const currentScore =
                          manualScores[response.id] ?? response.aiScore;
                        const isFilled =
                          manualScores[response.id] === 0
                            ? false
                            : i <= currentScore;
                        return (
                          <button
                            key={i}
                            onClick={() => {
                              if (currentScore === i) {
                                // If clicking the current score, toggle to 0
                                setManualScores({
                                  ...manualScores,
                                  [response.id]: 0,
                                });
                              } else {
                                // Otherwise set the new score
                                setManualScores({
                                  ...manualScores,
                                  [response.id]: i,
                                });
                              }
                            }}
                            className="p-1 hover:opacity-80 transition-opacity"
                          >
                            <Star
                              className={`w-5 h-5 ${
                                isFilled
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-slate-300 dark:text-slate-600"
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-9 text-center flex-shrink-0">
                      {manualScores[response.id] === 0
                        ? "0"
                        : (manualScores[response.id] ?? response.aiScore)}
                      /5
                    </span>
                  </div>

                  {/* Status badge - right side */}
                  <div className="flex-shrink-0 w-40 flex justify-end">
                    {getStatusBadge(response)}
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex gap-4 min-h-64">
                      {/* Left: Response text (2/3 width) */}
                      <div className="flex-1 flex flex-col basis-2/3">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                          Réponse complète
                        </div>
                        <textarea
                          readOnly
                          value={response.responseText}
                          className="flex-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-300 resize"
                        />
                      </div>

                      {/* Right: Status and AI comment (1/3 width) */}
                      <div className="flex-1 basis-1/3 flex flex-col space-y-4">
                        {/* Status switch */}
                        <div>
                          <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                            Statut
                          </div>
                          <StatusSwitch
                            value={statuses[response.id] ?? "pending"}
                            onChange={(newStatus) => {
                              setStatuses({
                                ...statuses,
                                [response.id]: newStatus,
                              });
                              // Auto-check when status is set
                              if (newStatus !== "pending") {
                                setResponseChecks({
                                  ...responseChecks,
                                  [response.id]: true,
                                });
                              }
                            }}
                          />
                        </div>

                        {/* AI comment */}
                        <div className="flex flex-col flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              Commentaire IA
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(
                                  response.aiComment
                                );
                              }}
                              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                              title="Copier le commentaire"
                            >
                              <Copy className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                            </button>
                          </div>
                          <ScrollArea className="flex-1 rounded border border-slate-200 dark:border-slate-700">
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed p-3">
                              {response.aiComment}
                            </p>
                          </ScrollArea>
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Reviewer comments (full width) */}
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                          Votre commentaire
                        </div>
                        <Textarea
                          value={comments[response.id] ?? ""}
                          onChange={(e) =>
                            setComments({
                              ...comments,
                              [response.id]: e.target.value,
                            })
                          }
                          placeholder="Ajoutez vos observations..."
                          className="text-sm h-24"
                        />
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                          Questions / Doutes
                        </div>
                        <Textarea
                          placeholder="Posez vos questions..."
                          className="text-sm h-24"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
