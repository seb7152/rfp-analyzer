"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RequirementsTreeView } from "./RequirementsTreeView";
import {
  EvaluationFilters,
  type EvaluationFilterState,
} from "./EvaluationFilters";
import { useRequirementsTree } from "@/hooks/use-requirements";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ClientOnly } from "@/components/ClientOnly";
import type { TreeNode } from "@/hooks/use-requirements";
import type { ResponseWithSupplier } from "@/hooks/use-responses";
import type { RequirementReviewStatus } from "@/types/peer-review";

interface SidebarProps {
  rfpId: string | null;
  selectedRequirementId: string | null;
  onSelectRequirement: (id: string) => void;
  className?: string;
  responses?: ResponseWithSupplier[];
  isSingleSupplier?: boolean;
  peerReviewEnabled?: boolean;
  reviewStatuses?: Map<string, RequirementReviewStatus>;
}

export function Sidebar({
  rfpId,
  selectedRequirementId,
  onSelectRequirement,
  className = "",
  responses = [],
  isSingleSupplier = false,
  peerReviewEnabled = false,
  reviewStatuses,
}: SidebarProps) {
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set()
  );
  const [expandAll, setExpandAll] = useState(false);
  const [filters, setFilters] = useState<EvaluationFilterState>({
    status: [],
    scoreRange: { min: 0, max: 5 },
    hasQuestions: null,
    hasManualComments: null,
    hasManualScore: null,
  });
  const [appliedFilters, setAppliedFilters] = useState<EvaluationFilterState>({
    status: [],
    scoreRange: { min: 0, max: 5 },
    hasQuestions: null,
    hasManualComments: null,
    hasManualScore: null,
  });

  // Use the new tree hook that includes categories + requirements
  const { tree, isLoading, error } = useRequirementsTree(rfpId);

  // Find and expand path to selected requirement
  useEffect(() => {
    if (!selectedRequirementId || !tree.length) return;

    // Find the path to the selected node
    const findPath = (
      nodes: TreeNode[],
      targetId: string,
      path: string[] = []
    ): string[] | null => {
      for (const node of nodes) {
        const currentPath = [...path, node.id];

        if (node.id === targetId) {
          return currentPath;
        }

        if (node.children) {
          const result = findPath(node.children, targetId, currentPath);
          if (result) return result;
        }
      }
      return null;
    };

    const path = findPath(tree, selectedRequirementId);
    if (path) {
      // Expand all nodes in the path (except the last one which is the selected node)
      setExpandedNodeIds((prev) => {
        const newExpanded = new Set(prev);
        path.slice(0, -1).forEach((id) => newExpanded.add(id));
        return newExpanded;
      });
    }
  }, [selectedRequirementId, tree]);

  // Apply filters when user clicks the "Filtrer" button
  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
  };

  // Check if any applied filters are active
  const hasActiveAppliedFilters = useMemo(() => {
    return (
      appliedFilters.status.length > 0 ||
      appliedFilters.scoreRange.min > 0 ||
      appliedFilters.scoreRange.max < 5 ||
      appliedFilters.hasQuestions !== null ||
      appliedFilters.hasManualComments !== null
    );
  }, [appliedFilters]);

  // Build a set of requirement IDs that match the applied filters
  const filteredRequirementIds = useMemo(() => {
    if (
      !isSingleSupplier ||
      responses.length === 0 ||
      !hasActiveAppliedFilters
    ) {
      return new Set<string>();
    }

    // Create a map of responses by requirement_id
    const responsesByRequirementId = new Map<string, ResponseWithSupplier>();
    responses.forEach((response) => {
      responsesByRequirementId.set(response.requirement_id, response);
    });

    const matchingIds = new Set<string>();

    // For each requirement that has a response, check if it matches the filters
    responsesByRequirementId.forEach((response) => {
      // Check status filter first
      if (appliedFilters.status.length > 0) {
        // Normalize status - treat null/undefined as "pending"
        const responseStatus = response.status || "pending";
        if (!appliedFilters.status.includes(responseStatus)) {
          return;
        }
      }

      // Check score range filter
      // Only apply if score range is not the default (0-5)
      if (
        appliedFilters.scoreRange.min > 0 ||
        appliedFilters.scoreRange.max < 5
      ) {
        // Calculate score: manual score if available, otherwise AI score
        const score = response.manual_score ?? response.ai_score ?? null;

        // If no score and we're filtering by score, exclude this response
        if (score === null) {
          return;
        }

        if (
          score < appliedFilters.scoreRange.min ||
          score > appliedFilters.scoreRange.max
        ) {
          return;
        }
      }

      // Check questions filter
      if (appliedFilters.hasQuestions !== null) {
        const hasQuestions =
          !!response.question && response.question.trim().length > 0;
        if (appliedFilters.hasQuestions !== hasQuestions) {
          return;
        }
      }

      // Check manual comments filter
      if (appliedFilters.hasManualComments !== null) {
        const hasComments =
          !!response.manual_comment &&
          response.manual_comment.trim().length > 0;
        if (appliedFilters.hasManualComments !== hasComments) {
          return;
        }
      }

      matchingIds.add(response.requirement_id);
    });

    return matchingIds;
  }, [responses, appliedFilters, isSingleSupplier, hasActiveAppliedFilters]);

  // Count active filters for badge display
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status.length > 0) count += filters.status.length;
    if (filters.scoreRange.min > 0 || filters.scoreRange.max < 5) count += 1;
    if (filters.hasQuestions !== null) count += 1;
    if (filters.hasManualComments !== null) count += 1;
    return count;
  }, [filters]);

  // Filter tree based on search query and evaluation filters
  const filteredTree = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    const hasSearchQuery = searchQuery && searchQuery.trim().length > 0;
    // Distinguish between "no filters active" and "filters active but no matches"
    const hasMatchingFilters = filteredRequirementIds.size > 0;

    function filterNodes(nodes: TreeNode[]): TreeNode[] {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        // Check search match
        const matchesSearch =
          !hasSearchQuery ||
          node.code.toLowerCase().includes(lowerQuery) ||
          node.title.toLowerCase().includes(lowerQuery);

        // Check evaluation filter match (only for requirements, not categories)
        // If filters are active but no requirements match, requirements should be excluded
        const matchesEvaluation =
          node.type === "category" ||
          !hasActiveAppliedFilters ||
          (hasActiveAppliedFilters &&
            hasMatchingFilters &&
            filteredRequirementIds.has(node.id));

        // Filter children
        const filteredChildren = node.children
          ? filterNodes(node.children)
          : [];

        // Include node if it matches or has matching children
        if (
          (matchesSearch && matchesEvaluation) ||
          filteredChildren.length > 0
        ) {
          acc.push({
            ...node,
            children: filteredChildren,
          });
        }

        return acc;
      }, []);
    }

    return filterNodes(tree);
  }, [tree, searchQuery, filteredRequirementIds, hasActiveAppliedFilters]);

  // Auto-expand all nodes when searching
  const displayedExpandedNodeIds = useMemo(() => {
    if (searchQuery || expandAll) {
      // Auto-expand all nodes when searching or expandAll is active
      const allNodeIds = new Set<string>();

      function collectNodeIds(nodes: TreeNode[]) {
        for (const node of nodes) {
          allNodeIds.add(node.id);
          if (node.children) {
            collectNodeIds(node.children);
          }
        }
      }

      collectNodeIds(filteredTree);
      return allNodeIds;
    }
    return expandedNodeIds;
  }, [filteredTree, expandedNodeIds, searchQuery, expandAll]);

  const handleToggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodeIds);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodeIds(newExpanded);
    setExpandAll(false); // Disable auto-expand when user manually toggles
  };

  const handleExpandAll = () => {
    setExpandAll(true);
  };

  const handleCollapseAll = () => {
    setExpandAll(false);
    setExpandedNodeIds(new Set());
  };

  return (
    <ClientOnly>
      <div
        className={`flex flex-col h-full bg-white/50 text-slate-900 border-r border-slate-200 dark:bg-slate-900/40 dark:text-slate-50 dark:border-slate-800 ${className}`}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 p-4 space-y-3">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            Requirements
          </h2>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
            <Input
              placeholder="Search by ID or title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {/* Expand/Collapse Buttons + Filters */}
          <div className={cn("flex", isMobile ? "gap-1" : "gap-2")}>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExpandAll}
              className={cn("flex-1", isMobile && "px-1")}
              title="Expand all requirements"
            >
              <ChevronDown className="w-4 h-4" />
              <span className={isMobile ? "hidden sm:inline ml-1" : "ml-1"}>
                Expand All
              </span>
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCollapseAll}
              className={cn("flex-1", isMobile && "px-1")}
              title="Collapse all requirements"
            >
              <ChevronUp className="w-4 h-4" />
              <span className={isMobile ? "hidden sm:inline ml-1" : "ml-1"}>
                Collapse All
              </span>
            </Button>
            {isSingleSupplier && (
              <EvaluationFilters
                filters={filters}
                onFiltersChange={setFilters}
                onApplyFilters={handleApplyFilters}
                activeFilterCount={activeFilterCount}
              />
            )}
          </div>
        </div>

        {/* Requirements Tree */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-slate-500 dark:text-slate-400">
              Loading tree...
            </div>
          ) : error ? (
            <div className="p-4 text-red-600 dark:text-red-400">
              Error loading tree: {String(error)}
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="p-4 text-slate-500 dark:text-slate-400">
              {searchQuery
                ? "No items matching your search"
                : hasActiveAppliedFilters
                  ? "No requirements matching the applied filters"
                  : "No categories or requirements found"}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-2">
                <RequirementsTreeView
                  nodes={filteredTree}
                  selectedNodeId={selectedRequirementId}
                  expandedNodeIds={displayedExpandedNodeIds}
                  onSelectNode={onSelectRequirement}
                  onToggleNode={handleToggleNode}
                />
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </ClientOnly>
  );
}
