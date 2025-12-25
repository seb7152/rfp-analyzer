"use client";

import React, { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Supplier } from "@/types/supplier";
import { Response } from "@/types/response";

interface TreeNode {
  id: string;
  code: string;
  title: string;
  type: "category" | "requirement";
  children?: TreeNode[];
}

interface CategoryRequirementsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categoryCode: string;
  categoryTitle: string;
  tree: TreeNode[];
  suppliers: Supplier[];
  responses: Response[];
}

const getScoreColor = (score: number | null) => {
  if (score === null) return "bg-slate-200 text-slate-600";
  if (score >= 3.5) return "bg-emerald-600 text-white";
  if (score >= 3.0) return "bg-emerald-500 text-white";
  if (score >= 2.5) return "bg-emerald-400 text-white";
  if (score >= 2.0) return "bg-yellow-400 text-slate-900";
  if (score >= 1.0) return "bg-orange-400 text-white";
  return "bg-red-500 text-white";
};

const getStatusColor = (status: string | null) => {
  switch (status) {
    case "pass":
      return "bg-emerald-500 text-white";
    case "partial":
      return "bg-orange-500 text-white";
    case "fail":
      return "bg-red-500 text-white";
    default:
      return "bg-slate-200 text-slate-600";
  }
};

const formatScore = (score: number | null) => {
  if (score === null) return "-";
  return score.toFixed(1);
};

const getStatusLabel = (status: string | null) => {
  switch (status) {
    case "pass":
      return "✓";
    case "partial":
      return "≈";
    case "fail":
      return "✗";
    default:
      return "⏳";
  }
};

export function CategoryRequirementsModal({
  isOpen,
  onOpenChange,
  categoryId,
  categoryCode,
  categoryTitle,
  tree,
  suppliers,
  responses,
}: CategoryRequirementsModalProps) {
  // Find all requirements that belong to this category
  const categoryRequirements = useMemo(() => {
    const requirements: TreeNode[] = [];

    function findRequirements(nodes: TreeNode[], targetCategoryId: string) {
      for (const node of nodes) {
        if (node.type === "category" && node.id === targetCategoryId) {
          // Found the category, collect its requirements
          function collectRequirements(categoryNode: TreeNode) {
            if (categoryNode.children) {
              for (const child of categoryNode.children) {
                if (child.type === "requirement") {
                  requirements.push(child);
                } else if (child.type === "category") {
                  collectRequirements(child);
                }
              }
            }
          }
          collectRequirements(node);
          return;
        }

        // Recursively search in children
        if (node.children) {
          findRequirements(node.children, targetCategoryId);
        }
      }
    }

    findRequirements(tree, categoryId);
    return requirements;
  }, [tree, categoryId]);

  // Build response map for quick lookup
  const responseMap = useMemo(() => {
    const map = new Map<string, Map<string, Response>>();
    responses.forEach((response) => {
      if (!map.has(response.requirement_id)) {
        map.set(response.requirement_id, new Map());
      }
      map.get(response.requirement_id)!.set(response.supplier_id, response);
    });
    return map;
  }, [responses]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-full h-[90vh] overflow-hidden flex flex-col p-0 sm:rounded-lg">
        <DialogHeader className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <div>
            <Badge variant="secondary" className="text-xs font-mono mb-2">
              {categoryCode}
            </Badge>
            <DialogTitle className="text-lg">{categoryTitle}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Scrollable requirements list */}
        <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
          {categoryRequirements.length === 0 ? (
            <p className="text-sm text-slate-500">
              Aucune exigence trouvée pour cette catégorie
            </p>
          ) : (
            categoryRequirements.map((requirement) => {
              const requirementResponses = responseMap.get(requirement.id);

              return (
                <div
                  key={requirement.id}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 space-y-3"
                >
                  {/* Requirement header */}
                  <div className="flex items-start gap-2 mb-3">
                    <Badge variant="outline" className="text-xs font-mono flex-shrink-0">
                      {requirement.code}
                    </Badge>
                    <p className="text-sm font-medium line-clamp-2">
                      {requirement.title}
                    </p>
                  </div>

                  {/* Supplier scores */}
                  <div className="space-y-2">
                    {suppliers.map((supplier) => {
                      const response = requirementResponses?.get(supplier.id);
                      const score = response
                        ? response.manual_score ?? response.ai_score ?? null
                        : null;
                      const status = response?.status || null;

                      return (
                        <div
                          key={supplier.id}
                          className="flex items-center justify-between gap-2 text-xs"
                        >
                          <span className="text-slate-700 dark:text-slate-300 flex-1">
                            {supplier.name}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Score or status */}
                            {score !== null ? (
                              <div
                                className={cn(
                                  "px-2 py-1 rounded text-center min-w-10 font-semibold",
                                  getScoreColor(score)
                                )}
                              >
                                {formatScore(score)}/4
                              </div>
                            ) : status ? (
                              <div
                                className={cn(
                                  "px-2 py-1 rounded min-w-10 text-center font-semibold",
                                  getStatusColor(status)
                                )}
                              >
                                {getStatusLabel(status)}
                              </div>
                            ) : (
                              <div className="px-2 py-1 rounded min-w-10 text-center text-slate-500">
                                -
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
