"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useVersion } from "@/contexts/VersionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Supplier } from "@/types/supplier";
import { Response } from "@/types/response";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { CategoryCard } from "./CategoryCard";
import { CategoryRequirementsModal } from "./CategoryRequirementsModal";
import { ClientOnly } from "../ClientOnly";

// Types
interface TreeNode {
  id: string;
  code: string;
  title: string;
  type: "category" | "requirement";
  children?: TreeNode[];
  level?: number; // Added for flat list processing
}

interface CategoryHeatmapProps {
  rfpId: string;
  onCategorySelect?: (categoryId: string | null) => void;
  selectedCategoryId?: string | null;
}

// Helper functions for colors (reused/adapted from RequirementsHeatmap)
const getScoreColor = (score: number | null) => {
  if (score === null) return "bg-slate-200 text-slate-600"; // N/A

  if (score >= 3.5) return "bg-emerald-600 text-white"; // Excellent
  if (score >= 3.0) return "bg-emerald-500 text-white"; // Vert moyen
  if (score >= 2.5) return "bg-emerald-400 text-white"; // Vert clair
  if (score >= 2.0) return "bg-yellow-400 text-slate-900"; // Jaune
  if (score >= 1.0) return "bg-orange-400 text-white"; // Orange
  return "bg-red-500 text-white"; // Rouge
};

const formatScore = (score: number | null | undefined) => {
  if (score == null) return "-";
  return score.toFixed(1);
};

export function CategoryHeatmap({
  rfpId,
  onCategorySelect,
  selectedCategoryId,
}: CategoryHeatmapProps) {
  const { activeVersion } = useVersion();
  const isMobile = useIsMobile();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedModalCategoryId, setSelectedModalCategoryId] = useState<
    string | null
  >(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Build URLs with versionId if available
        let responsesUrl = `/api/rfps/${rfpId}/responses`;
        let suppliersUrl = `/api/rfps/${rfpId}/suppliers`;
        if (activeVersion?.id) {
          responsesUrl += `?versionId=${activeVersion.id}`;
          suppliersUrl += `?versionId=${activeVersion.id}`;
        }

        const [suppliersRes, treeRes, responsesRes, weightsRes] =
          await Promise.all([
            fetch(suppliersUrl),
            fetch(`/api/rfps/${rfpId}/tree`),
            fetch(responsesUrl),
            fetch(`/api/rfps/${rfpId}/weights`),
          ]);

        const suppliersData = await suppliersRes.json();
        const treeData = await treeRes.json();
        const responsesData = await responsesRes.json();
        const weightsData = await weightsRes.json();

        setSuppliers(suppliersData.suppliers || []);
        setTree(treeData || []);
        setResponses(responsesData.responses || []);

        // Flatten weights (requirements only are needed for calculation, but we might store all)
        const flatWeights: Record<string, number> = {};
        if (weightsData.requirements) {
          Object.assign(flatWeights, weightsData.requirements);
        }
        setWeights(flatWeights);

        // Initialize expanded categories (expand top level by default)
        const topLevelIds = (treeData || []).map((n: TreeNode) => n.id);
        setExpandedCategories(new Set(topLevelIds));
      } catch (error) {
        console.error("Error fetching category heatmap data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (rfpId) {
      fetchData();
    }
  }, [rfpId, activeVersion?.id]);

  // Process data to calculate category scores
  const categoryScores = useMemo(() => {
    const scores: Record<string, Record<string, number | null>> = {}; // categoryId -> { supplierId -> score }

    // Map responses for quick lookup: requirementId -> { supplierId -> score }
    const responseMap = new Map<string, Map<string, number>>();
    responses.forEach((r) => {
      if (!responseMap.has(r.requirement_id)) {
        responseMap.set(r.requirement_id, new Map());
      }
      const score = r.manual_score ?? r.ai_score ?? null;
      if (score !== null) {
        responseMap.get(r.requirement_id)!.set(r.supplier_id, score);
      }
    });

    // Recursive function to calculate scores for a node
    // Returns a map of supplierId -> { weightedSum, totalWeight } for the node
    const calculateNodeScores = (
      node: TreeNode
    ): Map<string, { weightedSum: number; totalWeight: number }> => {
      const nodeScores = new Map<
        string,
        { weightedSum: number; totalWeight: number }
      >();

      if (node.type === "requirement") {
        const weight = weights[node.id] || 0;
        // If weight is 0, it doesn't contribute to the score
        if (weight > 0) {
          const supplierScores = responseMap.get(node.id);
          if (supplierScores) {
            supplierScores.forEach((score, supplierId) => {
              nodeScores.set(supplierId, {
                weightedSum: score * weight,
                totalWeight: weight,
              });
            });
          }
        }
      } else if (node.children) {
        // It's a category, aggregate children
        node.children.forEach((child) => {
          const childScores = calculateNodeScores(child);
          childScores.forEach((data, supplierId) => {
            const current = nodeScores.get(supplierId) || {
              weightedSum: 0,
              totalWeight: 0,
            };
            nodeScores.set(supplierId, {
              weightedSum: current.weightedSum + data.weightedSum,
              totalWeight: current.totalWeight + data.totalWeight,
            });
          });
        });

        // Calculate final score for this category
        const categorySupplierScores: Record<string, number | null> = {};
        suppliers.forEach((supplier) => {
          const data = nodeScores.get(supplier.id);
          if (data && data.totalWeight > 0) {
            categorySupplierScores[supplier.id] =
              data.weightedSum / data.totalWeight;
          } else {
            categorySupplierScores[supplier.id] = null;
          }
        });
        scores[node.id] = categorySupplierScores;
      }

      return nodeScores;
    };

    tree.forEach((node) => calculateNodeScores(node));

    return scores;
  }, [tree, responses, weights]);

  // Calculate global scores
  const globalScores = useMemo(() => {
    const scores: Record<string, number | null> = {}; // supplierId -> score

    // Map responses for quick lookup: requirementId -> { supplierId -> score }
    const responseMap = new Map<string, Map<string, number>>();
    responses.forEach((r) => {
      if (!responseMap.has(r.requirement_id)) {
        responseMap.set(r.requirement_id, new Map());
      }
      const score = r.manual_score ?? r.ai_score ?? null;
      if (score !== null) {
        responseMap.get(r.requirement_id)!.set(r.supplier_id, score);
      }
    });

    const supplierTotals = new Map<
      string,
      { weightedSum: number; totalWeight: number }
    >();

    const traverse = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.type === "requirement") {
          const weight = weights[node.id] || 0;
          if (weight > 0) {
            const supplierScores = responseMap.get(node.id);
            if (supplierScores) {
              supplierScores.forEach((score, supplierId) => {
                const current = supplierTotals.get(supplierId) || {
                  weightedSum: 0,
                  totalWeight: 0,
                };
                supplierTotals.set(supplierId, {
                  weightedSum: current.weightedSum + score * weight,
                  totalWeight: current.totalWeight + weight,
                });
              });
            }
          }
        } else if (node.children) {
          traverse(node.children);
        }
      }
    };

    traverse(tree);

    suppliers.forEach((supplier) => {
      const data = supplierTotals.get(supplier.id);
      if (data && data.totalWeight > 0) {
        scores[supplier.id] = data.weightedSum / data.totalWeight;
      } else {
        scores[supplier.id] = null;
      }
    });

    return scores;
  }, [tree, responses, weights]);

  // Flatten categories for display (filtering out requirements)
  const flatCategories = useMemo(() => {
    const flat: (TreeNode & { level: number })[] = [];

    const traverse = (nodes: TreeNode[], level: number) => {
      for (const node of nodes) {
        if (node.type === "category") {
          flat.push({ ...node, level });
          if (expandedCategories.has(node.id) && node.children) {
            traverse(node.children, level + 1);
          }
        }
      }
    };

    traverse(tree, 0);
    return flat;
  }, [tree, expandedCategories]);

  // Check if weights are missing (all weights are 0 or undefined)
  const hasNoWeights = useMemo(() => {
    // Count requirements and check if any have weight > 0
    let requirementCount = 0;
    let weightedCount = 0;

    const countRequirements = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.type === "requirement") {
          requirementCount++;
          if (weights[node.id] && weights[node.id] > 0) {
            weightedCount++;
          }
        }
        if (node.children) {
          countRequirements(node.children);
        }
      }
    };

    countRequirements(tree);

    // Return true if there are requirements but none have weights
    return requirementCount > 0 && weightedCount === 0;
  }, [tree, weights]);

  // Get selected category details for modal
  const selectedModalCategory = useMemo(() => {
    if (!selectedModalCategoryId) return null;
    const findCategory = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === selectedModalCategoryId) return node;
        if (node.children) {
          const found = findCategory(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findCategory(tree);
  }, [selectedModalCategoryId, tree]);

  if (loading) {
    return (
      <div className="py-8 text-center text-slate-500">
        Chargement de la synthèse...
      </div>
    );
  }

  const toggleCategory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCategoryClick = (id: string) => {
    if (onCategorySelect) {
      onCategorySelect(id === selectedCategoryId ? null : id);
    }
  };

  // Handle modal opening
  const handleOpenModal = (categoryId: string) => {
    setSelectedModalCategoryId(categoryId);
    setIsModalOpen(true);
  };

  return (
    <>
      <Card className="w-full overflow-hidden mb-8">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-medium">
            Synthèse par Catégorie
          </CardTitle>
        </CardHeader>
        {hasNoWeights && (
          <div className="px-6 pb-4 -mt-2">
            <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800 flex items-center">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Les pondérations des exigences ne sont pas définies. Veuillez les configurer dans l&apos;onglet{" "}
                <strong>Pondérations</strong> pour afficher les scores par catégorie.
              </AlertDescription>
            </Alert>
          </div>
        )}
        <ClientOnly>
          <CardContent>
            {isMobile ? (
              /* Mobile: Cards layout */
              <div className="space-y-3">
                {flatCategories.map((category) => (
                  <CategoryCard
                    key={category.id}
                    categoryCode={category.code}
                    categoryTitle={category.title}
                    suppliers={suppliers}
                    scores={categoryScores[category.id] || {}}
                    onClick={() => handleOpenModal(category.id)}
                  />
                ))}
              </div>
            ) : (
              /* Desktop: Table layout */
              <div className="relative w-full overflow-auto max-h-[600px] border rounded-md">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-20 shadow-sm">
                    <tr>
                      <th className="px-4 py-3 font-medium sticky left-0 bg-slate-50 z-30 border-b border-r min-w-[300px]">
                        Catégorie
                      </th>
                      {suppliers.map((supplier) => (
                        <th
                          key={supplier.id}
                          className="px-2 py-3 w-24 text-center border-b border-r last:border-r-0 min-w-[96px]"
                        >
                          <div
                            className="truncate max-w-[90px] mx-auto"
                            title={supplier.name}
                          >
                            {supplier.name}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {flatCategories.map((category) => (
                      <tr
                        key={category.id}
                        className={cn(
                          "border-b transition-colors cursor-pointer",
                          selectedCategoryId === category.id
                            ? "bg-blue-50 hover:bg-blue-100"
                            : "bg-white hover:bg-slate-50"
                        )}
                        onClick={() => handleCategoryClick(category.id)}
                      >
                        <td
                          className={cn(
                            "px-4 py-2 font-medium text-slate-900 sticky left-0 z-10 border-r min-w-[300px]",
                            selectedCategoryId === category.id
                              ? "bg-blue-50 group-hover:bg-blue-100"
                              : "bg-white group-hover:bg-slate-50"
                          )}
                        >
                          <div
                            className="flex items-center gap-2 select-none"
                            style={{ paddingLeft: `${category.level * 20}px` }}
                          >
                            <div
                              className="cursor-pointer p-1 hover:bg-slate-200 rounded"
                              onClick={(e) => toggleCategory(category.id, e)}
                            >
                              {category.children &&
                              category.children.some(
                                (c) => c.type === "category"
                              ) ? (
                                expandedCategories.has(category.id) ? (
                                  <ChevronDown className="h-4 w-4 text-slate-400" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-slate-400" />
                                )
                              ) : (
                                <span className="w-4 h-4 block" /> // Spacer
                              )}
                            </div>

                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                              {category.code}
                            </span>
                            <span
                              className="truncate max-w-[200px]"
                              title={category.title}
                            >
                              {category.title}
                            </span>
                          </div>
                        </td>
                        {suppliers.map((supplier) => {
                          const score =
                            categoryScores[category.id]?.[supplier.id] ?? null;
                          return (
                            <td
                              key={`${category.id}-${supplier.id}`}
                              className="p-1 border-r last:border-r-0 text-center align-middle w-24 min-w-[96px]"
                            >
                              <div
                                className={cn(
                                  "w-full h-8 rounded flex items-center justify-center text-xs font-bold transition-colors cursor-help shadow-sm",
                                  getScoreColor(score)
                                )}
                                title={`${supplier.name} - ${category.title}\nNote: ${formatScore(score)}`}
                              >
                                {formatScore(score)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 sticky bottom-0 z-10">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-sm text-slate-700 sticky left-0 bg-slate-50 z-20 border-r">
                        Note Globale / 5
                      </td>
                      {suppliers.map((supplier) => {
                        const score = globalScores[supplier.id] ?? null;
                        return (
                          <td
                            key={`global-5-${supplier.id}`}
                            className="p-2 border-r last:border-r-0 w-24 min-w-[96px] text-center"
                          >
                            <div
                              className={cn(
                                "w-full h-8 rounded flex items-center justify-center text-xs font-bold shadow-sm",
                                getScoreColor(score)
                              )}
                            >
                              {formatScore(score)}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-semibold text-sm text-slate-700 sticky left-0 bg-slate-50 z-20 border-r">
                        Note Globale / 20
                      </td>
                      {suppliers.map((supplier) => {
                        const score = globalScores[supplier.id] ?? null;
                        const score20 = score !== null ? score * 4 : null;
                        return (
                          <td
                            key={`global-20-${supplier.id}`}
                            className="p-2 border-r last:border-r-0 w-24 min-w-[96px] text-center"
                          >
                            <div className="text-sm font-bold text-slate-700">
                              {score20 !== null ? score20.toFixed(1) : "-"}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </ClientOnly>
      </Card>

      {/* Modal for mobile - requires requirementsHeatmap to show filtered requirements */}
      {isMobile && selectedModalCategory && (
        <CategoryRequirementsModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          rfpId={rfpId}
          categoryId={selectedModalCategory.id}
          categoryCode={selectedModalCategory.code}
          categoryTitle={selectedModalCategory.title}
          tree={tree}
          suppliers={suppliers}
          responses={responses}
        />
      )}
    </>
  );
}
