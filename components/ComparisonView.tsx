"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  ExternalLink,
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
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SupplierResponseCard } from "@/components/SupplierResponseCard";
import {
  useCategoryRequirements,
  useRequirementsTree,
} from "@/hooks/use-requirements";
import { useResponses } from "@/hooks/use-responses";
import { useResponseMutation } from "@/hooks/use-response-mutation";
import type { TreeNode } from "@/hooks/use-requirements";
import {
  Requirement,
  Response,
  getRequirementPath,
  getRequirementById,
} from "@/lib/fake-data";

interface ComparisonViewProps {
  selectedRequirementId: string;
  allRequirements: Requirement[];
  onRequirementChange: (id: string) => void;
  rfpId?: string;
}

interface ResponseState {
  [responseId: string]: {
    expanded: boolean;
    manualScore: number;
    status: "pass" | "partial" | "fail" | "pending";
    isChecked: boolean;
    manualComment: string;
    question: string;
    isSaving: boolean;
    showSaved: boolean;
  };
}

export function ComparisonView({
  selectedRequirementId,
  allRequirements,
  onRequirementChange,
  rfpId,
}: ComparisonViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contextExpanded, setContextExpanded] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [responseStates, setResponseStates] = useState<ResponseState>({});

  // Initialize mutation hook for persisting changes
  const mutation = useResponseMutation();

  // Timers for hiding "Saved" indicator
  const savedTimers = useRef<Record<string, NodeJS.Timeout>>({});

  // Fetch the tree to determine if selected item is a category
  const { tree } = useRequirementsTree(rfpId || null);

  // Fetch responses for the selected requirement
  const { data: responsesData, isLoading: responsesLoading } = useResponses(
    rfpId || "",
    selectedRequirementId,
  );

  const responses = responsesData?.responses || [];
  const suppliers = useMemo(() => {
    // Extract unique suppliers from responses
    const supplierMap = new Map();
    responses.forEach((response) => {
      if (response.supplier && !supplierMap.has(response.supplier.id)) {
        supplierMap.set(response.supplier.id, response.supplier);
      }
    });
    return Array.from(supplierMap.values());
  }, [responses]);

  // Find the selected node in the tree to check its type
  const isCategory = useMemo(() => {
    if (!selectedRequirementId || !tree.length) return false;

    const findNode = (nodes: TreeNode[], targetId: string): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return node;
        }
        if (node.children) {
          const result = findNode(node.children, targetId);
          if (result) return result;
        }
      }
      return null;
    };

    const node = findNode(tree, selectedRequirementId);
    return node?.type === "category";
  }, [selectedRequirementId, tree]);

  // Fetch category requirements if a category is selected
  const {
    requirements: categoryRequirements,
    isLoading: categoryLoading,
    error: categoryError,
  } = useCategoryRequirements(
    rfpId || null,
    isCategory ? selectedRequirementId : null,
  );

  const requirement = getRequirementById(
    selectedRequirementId,
    allRequirements,
  );
  const path = getRequirementPath(selectedRequirementId, allRequirements);
  // Filter responses for current requirement (already filtered by useResponses hook)
  const requirementResponses = responses || [];

  // Build breadcrumb path with codes from tree
  const breadcrumbPath = useMemo(() => {
    if (!selectedRequirementId || !tree.length || isCategory) return [];

    const findPathWithCodes = (
      nodes: TreeNode[],
      targetId: string,
      path: Array<{ id: string; code: string; title: string }> = [],
    ): Array<{ id: string; code: string; title: string }> | null => {
      for (const node of nodes) {
        const currentPath = [
          ...path,
          { id: node.id, code: node.code, title: node.title },
        ];

        if (node.id === targetId) {
          return currentPath;
        }

        if (node.children) {
          const result = findPathWithCodes(
            node.children,
            targetId,
            currentPath,
          );
          if (result) return result;
        }
      }
      return null;
    };

    return findPathWithCodes(tree, selectedRequirementId) || [];
  }, [selectedRequirementId, tree, isCategory]);

  // Pagination: Get all leaf requirements in tree order (not hierarchy order)
  // This ensures pagination matches the sidebar navigation order
  const flatReqs = useMemo(() => {
    if (!tree.length) return [];

    const leaves: TreeNode[] = [];

    const traverse = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        // Only add leaf requirements (not categories)
        if (node.type === "requirement" && node.level === 4) {
          leaves.push(node);
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(tree);
    return leaves;
  }, [tree]);

  const currentIndex = flatReqs.findIndex(
    (r) => r.id === selectedRequirementId,
  );
  const totalPages = flatReqs.length;

  const goToRequirement = (index: number) => {
    if (index >= 0 && index < flatReqs.length) {
      setIsLoading(true);
      setError(null);
      // Simulate loading delay
      setTimeout(() => {
        onRequirementChange(flatReqs[index].id);
        setIsLoading(false);
      }, 300);
    }
  };

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Only trigger on arrow keys (left/right)
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        // Prevent default scrolling behavior
        event.preventDefault();

        const isLeftArrow = event.key === "ArrowLeft";

        if (isLeftArrow && currentIndex > 0) {
          // Previous requirement
          goToRequirement(currentIndex - 1);
        } else if (!isLeftArrow && currentIndex < totalPages - 1) {
          // Next requirement
          goToRequirement(currentIndex + 1);
        }
      }
    },
    [currentIndex, totalPages, flatReqs],
  );

  // Keyboard navigation: arrow keys for previous/next
  useEffect(() => {
    // Only add listener when we have requirements to navigate
    if (flatReqs.length === 0) return;

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown, flatReqs.length]);

  const updateResponseState = (
    responseId: string,
    updates: Partial<ResponseState[string]>,
    immediate: boolean = false,
  ) => {
    // Update local state immediately for UI responsiveness
    setResponseStates((prev) => ({
      ...prev,
      [responseId]: {
        ...prev[responseId],
        ...updates,
      },
    }));

    // Persist to database (optimistic update handled by mutation hook)
    const dbUpdates: Record<string, any> = {};
    if (updates.manualScore !== undefined)
      dbUpdates.manual_score = updates.manualScore;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.isChecked !== undefined)
      dbUpdates.is_checked = updates.isChecked;
    if (updates.manualComment !== undefined)
      dbUpdates.manual_comment = updates.manualComment;
    if (updates.question !== undefined) dbUpdates.question = updates.question;

    // Only call mutation if we have actual DB fields to update
    if (Object.keys(dbUpdates).length > 0) {
      // Check if this update includes comment fields
      const isCommentUpdate =
        updates.manualComment !== undefined || updates.question !== undefined;

      // For comment fields, only save on blur (immediate flag)
      // For other fields (score, status, checkbox), save immediately
      if (isCommentUpdate && !immediate) {
        // Don't save on onChange for comments, wait for blur
        return;
      } else {
        // Immediate update for:
        // - non-comment fields (score, status, checkbox)
        // - comment fields with immediate flag (onBlur)

        // Show saving indicator when API call starts
        setResponseStates((prev) => ({
          ...prev,
          [responseId]: {
            ...prev[responseId],
            isSaving: true,
          },
        }));

        mutation.mutate(
          {
            responseId,
            ...dbUpdates,
          },
          {
            onSuccess: () => {
              // Show "Saved" indicator
              setResponseStates((prev) => ({
                ...prev,
                [responseId]: {
                  ...prev[responseId],
                  isSaving: false,
                  showSaved: true,
                },
              }));

              // Clear existing timer
              if (savedTimers.current[responseId]) {
                clearTimeout(savedTimers.current[responseId]);
              }

              // Hide "Saved" after 2 seconds
              savedTimers.current[responseId] = setTimeout(() => {
                setResponseStates((prev) => ({
                  ...prev,
                  [responseId]: {
                    ...prev[responseId],
                    showSaved: false,
                  },
                }));
                delete savedTimers.current[responseId];
              }, 2000);
            },
            onError: () => {
              // Hide saving indicator on error
              setResponseStates((prev) => ({
                ...prev,
                [responseId]: {
                  ...prev[responseId],
                  isSaving: false,
                  showSaved: false,
                },
              }));
            },
          },
        );
      }
    }
  };

  // Check if all responses for current requirement are checked
  const allResponsesChecked =
    requirementResponses.length > 0 &&
    requirementResponses.every((r) => responseStates[r.id]?.isChecked ?? false);

  // If a category is selected, show requirements table
  if (isCategory) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Exigences de la catégorie
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Vue d'ensemble des exigences et de leur statut
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {categoryLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : categoryError ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400">
                Erreur lors du chargement des exigences
              </p>
            </div>
          ) : categoryRequirements.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-12 text-center max-w-md">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <svg
                    className="h-8 w-8 text-slate-400 dark:text-slate-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-lg font-medium text-slate-900 dark:text-slate-50 mb-2">
                  Aucune exigence trouvée
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Cette catégorie ne contient pas encore d'exigences
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Code</TableHead>
                    <TableHead className="w-[250px]">Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-[160px]">Statut</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryRequirements.map((req) => (
                    <TableRow
                      key={req.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <TableCell className="font-medium">
                        {req.requirement_id_external}
                      </TableCell>
                      <TableCell className="font-medium">{req.title}</TableCell>
                      <TableCell className="text-slate-500 dark:text-slate-500 text-xs">
                        <div className="line-clamp-2">
                          {req.description || (
                            <span className="italic text-slate-400">
                              Aucune description
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {req.status === "pass" && (
                          <Badge className="bg-green-500 text-white px-3 py-1.5 text-sm font-medium">
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Validé
                          </Badge>
                        )}
                        {req.status === "partial" && (
                          <Badge className="bg-amber-500 text-white px-3 py-1.5 text-sm font-medium">
                            <Clock className="w-4 h-4 mr-1.5" />
                            Partiel
                          </Badge>
                        )}
                        {req.status === "fail" && (
                          <Badge className="bg-red-500 text-white px-3 py-1.5 text-sm font-medium">
                            <AlertTriangle className="w-4 h-4 mr-1.5" />
                            Échoué
                          </Badge>
                        )}
                        {req.status === "pending" && (
                          <Badge
                            variant="outline"
                            className="px-3 py-1.5 text-sm font-medium"
                          >
                            <Clock className="w-4 h-4 mr-1.5" />
                            En attente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRequirementChange(req.id)}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!requirement) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-400">
          Exigence non trouvée
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Breadcrumb */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbPath.map((item, idx) => (
              <React.Fragment key={item.id}>
                {idx > 0 && <BreadcrumbSeparator />}
                {idx === breadcrumbPath.length - 1 ? (
                  <BreadcrumbPage className="text-slate-900 dark:text-white font-medium">
                    {item.code}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbItem>
                    <BreadcrumbLink className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                      {item.code}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                )}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {/* Header with pagination */}
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
            <div className="relative">
              <p
                className={`text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap ${
                  !descriptionExpanded ? "line-clamp-5" : ""
                }`}
              >
                {requirement.description}
              </p>
              {requirement.description &&
                requirement.description.split("\n").length > 5 && (
                  <div className="flex justify-end">
                    <button
                      onClick={() =>
                        setDescriptionExpanded(!descriptionExpanded)
                      }
                      className="mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {descriptionExpanded ? "Voir moins" : "Voir plus"}
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${
                          descriptionExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                )}
            </div>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-2 ml-6 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => goToRequirement(currentIndex - 1)}
              disabled={currentIndex === 0 || isLoading}
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
              disabled={currentIndex === totalPages - 1 || isLoading}
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
            <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400 rotate-0" />
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

      {/* Main content area */}
      <div className="flex-1 overflow-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {error && (
          <div className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">{error}</p>
          </div>
        )}

        {!isLoading && !error && (
          <div className="p-6">
            {requirementResponses.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 p-12 text-center max-w-md">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                    <svg
                      className="h-8 w-8 text-slate-400 dark:text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-slate-900 dark:text-slate-50 mb-2">
                    Aucune réponse disponible
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Les fournisseurs n'ont pas encore soumis de réponses pour
                    cette exigence
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {suppliers.map((supplier) => {
                  const response = requirementResponses.find(
                    (r) => r.supplier_id === supplier.id,
                  );
                  if (!response) return null;

                  const state = responseStates[response.id] || {
                    expanded: false,
                    manualScore: response.manual_score ?? undefined,
                    status: (response.status || "pending") as const,
                    isChecked: response.is_checked || false,
                    manualComment: response.manual_comment || "",
                    question: response.question || "",
                    isSaving: false,
                    showSaved: false,
                  };

                  return (
                    <SupplierResponseCard
                      key={response.id}
                      supplierId={supplier.id}
                      supplierName={supplier.name}
                      responseId={response.id}
                      responseText={response.response_text || ""}
                      aiScore={response.ai_score || undefined}
                      aiComment={response.ai_comment || undefined}
                      status={state.status}
                      isChecked={state.isChecked}
                      manualScore={state.manualScore}
                      manualComment={state.manualComment}
                      questionText={state.question}
                      isSaving={state.isSaving}
                      showSaved={state.showSaved}
                      isExpanded={state.expanded}
                      onExpandChange={(expanded) =>
                        updateResponseState(response.id, { expanded })
                      }
                      onStatusChange={(status) =>
                        updateResponseState(response.id, { status })
                      }
                      onCheckChange={(isChecked) =>
                        updateResponseState(response.id, { isChecked })
                      }
                      onScoreChange={(manualScore) =>
                        updateResponseState(response.id, { manualScore })
                      }
                      onCommentChange={(manualComment) =>
                        updateResponseState(response.id, { manualComment })
                      }
                      onQuestionChange={(question) =>
                        updateResponseState(response.id, { question })
                      }
                      onCommentBlur={() =>
                        updateResponseState(
                          response.id,
                          { manualComment: state.manualComment },
                          true,
                        )
                      }
                      onQuestionBlur={() =>
                        updateResponseState(
                          response.id,
                          { question: state.question },
                          true,
                        )
                      }
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
