"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Copy, Check, Sparkles } from "lucide-react";
import { Supplier } from "@/types/supplier";

// Types
interface TreeNode {
  id: string;
  code: string;
  title: string;
  type: "category" | "requirement";
  description?: string;
  children?: TreeNode[];
  level?: number;
}

interface CategoryAnalysisTableProps {
  rfpId: string;
}

interface CategoryAnalysis {
  forces: string[];
  faiblesses: string[];
}

export function CategoryAnalysisTable({ rfpId }: CategoryAnalysisTableProps) {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [copied, setCopied] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null
  );
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [categoryAnalyses, setCategoryAnalyses] = useState<
    Record<string, CategoryAnalysis>
  >({});

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [treeRes, responsesRes, suppliersRes, weightsRes] =
          await Promise.all([
            fetch(`/api/rfps/${rfpId}/tree`),
            fetch(`/api/rfps/${rfpId}/responses`),
            fetch(`/api/rfps/${rfpId}/suppliers`),
            fetch(`/api/rfps/${rfpId}/weights`),
          ]);
        const treeData = await treeRes.json();
        const responsesData = await responsesRes.json();
        const suppliersData = await suppliersRes.json();
        const weightsData = await weightsRes.json();

        setTree(treeData || []);
        setResponses(responsesData.responses || []);
        setSuppliers(suppliersData.suppliers || []);

        // Flatten weights (requirements only)
        const flatWeights: Record<string, number> = {};
        if (weightsData.requirements) {
          Object.assign(flatWeights, weightsData.requirements);
        }
        setWeights(flatWeights);

        // Initialize expanded categories (expand top level by default)
        const topLevelIds = (treeData || []).map((n: TreeNode) => n.id);
        setExpandedCategories(new Set(topLevelIds));

        // Set first supplier as selected by default
        if (suppliersData.suppliers && suppliersData.suppliers.length > 0) {
          setSelectedSupplierId(suppliersData.suppliers[0].id);
        }
      } catch (error) {
        console.error("Error fetching category analysis data:", error);
      } finally {
        setLoading(false);
      }
    }

    if (rfpId) {
      fetchData();
    }
  }, [rfpId]);

  // Flatten categories for display
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

  // Helper function to get category score for a supplier
  const getCategoryScore = (
    categoryId: string,
    supplierId: string
  ): number | null => {
    const requirementIds = new Set<string>();

    // Collect all requirement IDs under this category
    const collectRequirementIds = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.type === "requirement") {
          requirementIds.add(node.id);
        } else if (node.children) {
          collectRequirementIds(node.children);
        }
      }
    };

    const categoryNode = findNodeById(tree, categoryId);
    if (categoryNode && categoryNode.children) {
      collectRequirementIds(categoryNode.children);
    }

    // Calculate weighted score
    let weightedSum = 0;
    let totalWeight = 0;

    responses.forEach((response) => {
      if (
        response.supplier_id === supplierId &&
        requirementIds.has(response.requirement_id)
      ) {
        const weight = weights[response.requirement_id] || 0;
        if (weight > 0) {
          const score = response.manual_score ?? response.ai_score ?? null;
          if (score !== null) {
            weightedSum += score * weight;
            totalWeight += weight;
          }
        }
      }
    });

    if (totalWeight > 0) {
      return weightedSum / totalWeight;
    }
    return null;
  };

  // Helper function to get average category score across all suppliers
  const getAverageCategoryScore = (categoryId: string): number | null => {
    const requirementIds = new Set<string>();

    // Collect all requirement IDs under this category
    const collectRequirementIds = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.type === "requirement") {
          requirementIds.add(node.id);
        } else if (node.children) {
          collectRequirementIds(node.children);
        }
      }
    };

    const categoryNode = findNodeById(tree, categoryId);
    if (categoryNode && categoryNode.children) {
      collectRequirementIds(categoryNode.children);
    }

    // Calculate average score across all suppliers
    const supplierScores: Record<
      string,
      { weightedSum: number; totalWeight: number }
    > = {};

    responses.forEach((response) => {
      if (requirementIds.has(response.requirement_id)) {
        const weight = weights[response.requirement_id] || 0;
        if (weight > 0) {
          const score = response.manual_score ?? response.ai_score ?? null;
          if (score !== null) {
            if (!supplierScores[response.supplier_id]) {
              supplierScores[response.supplier_id] = {
                weightedSum: 0,
                totalWeight: 0,
              };
            }
            supplierScores[response.supplier_id].weightedSum += score * weight;
            supplierScores[response.supplier_id].totalWeight += weight;
          }
        }
      }
    });

    // Calculate final scores for each supplier
    const scores: number[] = [];
    for (const supplierId in supplierScores) {
      const data = supplierScores[supplierId];
      if (data.totalWeight > 0) {
        scores.push(data.weightedSum / data.totalWeight);
      }
    }

    // Return average
    if (scores.length > 0) {
      return scores.reduce((a, b) => a + b, 0) / scores.length;
    }
    return null;
  };

  // Color function for scores
  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-slate-200 text-slate-600";

    if (score >= 3.5) return "bg-emerald-600 text-white";
    if (score >= 3.0) return "bg-emerald-500 text-white";
    if (score >= 2.5) return "bg-emerald-400 text-white";
    if (score >= 2.0) return "bg-yellow-400 text-slate-900";
    if (score >= 1.0) return "bg-orange-400 text-white";
    return "bg-red-500 text-white";
  };

  const formatScore = (score: number | null) => {
    if (score === null) return "-";
    return score.toFixed(1);
  };

  // Get attention points (questions from responses) for a category and supplier
  // If category is expanded, only show direct child requirements
  // If category is collapsed, show all descendant requirements
  const getAttentionPoints = (
    categoryId: string,
    supplierId?: string,
    isExpanded?: boolean
  ): string[] => {
    const questions = new Set<string>();
    const requirementIds = new Set<string>();

    const categoryNode = findNodeById(tree, categoryId);
    if (!categoryNode || !categoryNode.children) {
      return [];
    }

    // Collect requirement IDs based on expansion state
    if (isExpanded) {
      // Category is expanded: only collect direct child requirements (not from subcategories)
      const collectDirectRequirements = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.type === "requirement") {
            requirementIds.add(node.id);
          }
          // Don't recurse into subcategories when expanded
        }
      };
      collectDirectRequirements(categoryNode.children);
    } else {
      // Category is collapsed: collect all descendant requirements
      const collectAllRequirements = (nodes: TreeNode[]) => {
        for (const node of nodes) {
          if (node.type === "requirement") {
            requirementIds.add(node.id);
          } else if (node.children) {
            collectAllRequirements(node.children);
          }
        }
      };
      collectAllRequirements(categoryNode.children);
    }

    // Get unique questions from responses for these requirements
    responses.forEach((response) => {
      if (
        requirementIds.has(response.requirement_id) &&
        response.question &&
        response.question.trim() &&
        (!supplierId || response.supplier_id === supplierId)
      ) {
        questions.add(response.question);
      }
    });

    return Array.from(questions);
  };

  // Helper to find a node by ID
  const findNodeById = (nodes: TreeNode[], id: string): TreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Get direct child titles (either requirements or subcategories)
  const getChildTitles = (categoryId: string): string[] => {
    const categoryNode = findNodeById(tree, categoryId);
    if (!categoryNode || !categoryNode.children) {
      return [];
    }

    const titles: string[] = [];
    for (const child of categoryNode.children) {
      if (child.type === "requirement") {
        titles.push(child.title);
      } else if (child.type === "category") {
        titles.push(child.title);
      }
    }
    return titles;
  };

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

  // Generate markdown table
  const generateMarkdown = (): string => {
    let markdown =
      "| Catégorie | Détail | Note | Forces | Faiblesses | Points d'attention |\n";
    markdown +=
      "|-----------|--------|------|--------|-----------|--------------------|\n";

    for (const category of flatCategories) {
      const isExpanded = expandedCategories.has(category.id);
      const attentionPoints = getAttentionPoints(
        category.id,
        selectedSupplierId || undefined,
        isExpanded
      );
      const childTitles = getChildTitles(category.id);
      const indent = "  ".repeat(category.level);
      const pointsList =
        attentionPoints.length > 0
          ? attentionPoints.map((p) => `• ${p}`).join("\n")
          : "";
      const detailList =
        childTitles.length > 0
          ? childTitles.map((p) => `• ${p}`).join("\n")
          : "";

      const score =
        selectedSupplierId && selectedSupplierId !== ""
          ? getCategoryScore(category.id, selectedSupplierId)
          : null;
      const averageScore = getAverageCategoryScore(category.id);
      const scoreStr =
        score !== null && averageScore !== null
          ? `${formatScore(score)} / ${formatScore(averageScore)}`
          : "-";

      markdown += `| ${indent}**${category.code}** - ${category.title} | ${detailList} | ${scoreStr} | | | ${pointsList} |\n`;
    }

    return markdown;
  };

  // Get direct child requirements for a category (not recursively)
  const getDirectRequirements = (categoryId: string): TreeNode[] => {
    const categoryNode = findNodeById(tree, categoryId);
    if (!categoryNode || !categoryNode.children) {
      return [];
    }

    return categoryNode.children.filter(
      (child) => child.type === "requirement"
    );
  };

  // Build payload for N8N analysis
  const buildAnalysisPayload = (categoryId: string) => {
    const categoryNode = findNodeById(tree, categoryId);
    if (!categoryNode) return null;

    if (!selectedSupplierId) return null;

    const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);
    if (!selectedSupplier) return null;

    const categoryScore = getCategoryScore(categoryId, selectedSupplierId);
    const averageScore = getAverageCategoryScore(categoryId);

    // Get direct child requirements
    const directRequirements = getDirectRequirements(categoryId);

    // Get requirement IDs (including descendants for response filtering)
    const requirementIds = new Set<string>();
    const collectRequirementIds = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.type === "requirement") {
          requirementIds.add(node.id);
        } else if (node.children) {
          collectRequirementIds(node.children);
        }
      }
    };
    if (categoryNode.children) {
      collectRequirementIds(categoryNode.children);
    }

    // Build requirements array (direct children only)
    const requirementsArray = directRequirements.map((req) => ({
      id: req.id,
      code: req.code,
      title: req.title,
      description: req.description || "",
    }));

    // Build responses array (filtered by category requirements and selected supplier)
    const responsesArray = responses
      .filter(
        (r) =>
          r.supplier_id === selectedSupplierId &&
          requirementIds.has(r.requirement_id)
      )
      .map((r) => ({
        requirement_id: r.requirement_id,
        response_text: r.response_text,
        question: r.question,
        comment: r.manual_comment || r.ai_comment || "",
        score: r.manual_score ?? r.ai_score,
      }));

    return {
      rfp_id: rfpId,
      supplier_id: selectedSupplierId,
      supplier_name: selectedSupplier.name,
      category_id: categoryId,
      category_code: categoryNode.code,
      category_name: categoryNode.title,
      category_score: categoryScore,
      average_score: averageScore,
      requirements: requirementsArray,
      responses: responsesArray,
      timestamp: new Date().toISOString(),
    };
  };

  // Trigger N8N analysis
  const triggerAnalysis = async (categoryId: string) => {
    try {
      setAnalysisLoading(true);

      const payload = buildAnalysisPayload(categoryId);
      if (!payload) {
        console.error("Failed to build analysis payload");
        return;
      }

      console.log("Sending payload to N8N:", payload);

      // Call N8N webhook
      const response = await fetch(
        "https://n8n.srv828065.hstgr.cloud/webhook/1240b9c7-ca02-429a-a4e9-2d6afb74f311",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        console.error("N8N response error:", response.status);
        return;
      }

      const result = await response.json();
      console.log("N8N analysis result:", result);

      // Update category analysis with results
      if (result.forces && result.faiblesses) {
        setCategoryAnalyses((prev) => ({
          ...prev,
          [categoryId]: {
            forces: result.forces,
            faiblesses: result.faiblesses,
          },
        }));
      }
    } catch (error) {
      console.error("Error triggering analysis:", error);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      const markdown = generateMarkdown();
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  if (loading) {
    return (
      <div className="py-8 text-center text-slate-500">
        Chargement de l'analyse...
      </div>
    );
  }

  return (
    <Card className="w-full overflow-hidden mb-8 h-full">
      <CardHeader className="pb-4">
        <div className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-lg font-medium">
            Analyse par Catégorie
          </CardTitle>
          <div className="flex items-center gap-3">
            {suppliers.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-slate-700">
                  Soumissionnaire:
                </label>
                <Select
                  value={selectedSupplierId || ""}
                  onValueChange={setSelectedSupplierId}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Sélectionner un soumissionnaire" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                selectedSupplierId &&
                triggerAnalysis(flatCategories[0]?.id || "")
              }
              disabled={
                analysisLoading ||
                !selectedSupplierId ||
                flatCategories.length === 0
              }
              className="gap-2"
            >
              {analysisLoading ? (
                <>
                  <span className="animate-spin">✨</span>
                  Analyse...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Analyser
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyToClipboard}
              className="gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copié!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copier en Markdown
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="relative w-full overflow-auto flex-1 border-t border-slate-200">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-6 py-4 font-medium sticky left-0 bg-slate-50 z-30 border-b border-r min-w-[350px]">
                  Catégorie
                </th>
                <th className="px-6 py-4 font-medium border-b border-r min-w-[300px]">
                  Détail
                </th>
                <th className="px-6 py-4 font-medium border-b border-r min-w-[160px] text-center">
                  Note
                </th>
                <th className="px-6 py-4 font-medium border-b border-r min-w-[250px]">
                  Forces
                </th>
                <th className="px-6 py-4 font-medium border-b border-r min-w-[250px]">
                  Faiblesses
                </th>
                <th className="px-6 py-4 font-medium border-b min-w-[400px]">
                  Points d'attention
                </th>
              </tr>
            </thead>
            <tbody>
              {flatCategories.map((category) => {
                const isExpanded = expandedCategories.has(category.id);
                const attentionPoints = getAttentionPoints(
                  category.id,
                  selectedSupplierId || undefined,
                  isExpanded
                );
                const score =
                  selectedSupplierId && selectedSupplierId !== ""
                    ? getCategoryScore(category.id, selectedSupplierId)
                    : null;
                const averageScore = getAverageCategoryScore(category.id);
                return (
                  <tr
                    key={category.id}
                    className="border-b transition-colors bg-white hover:bg-slate-50"
                  >
                    <td
                      className={cn(
                        "px-6 py-4 font-medium text-slate-900 sticky left-0 z-10 border-r bg-white hover:bg-slate-50 min-w-[350px]"
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
                            <span className="w-4 h-4 block" />
                          )}
                        </div>

                        <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
                          {category.code}
                        </span>
                        <span className="whitespace-normal break-words">
                          {category.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r text-slate-600">
                      {(() => {
                        const childTitles = getChildTitles(category.id);
                        return childTitles.length > 0 ? (
                          <ul className="space-y-1 text-xs">
                            {childTitles.map((title, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="flex-shrink-0">•</span>
                                <span className="break-words">{title}</span>
                              </li>
                            ))}
                          </ul>
                        ) : null;
                      })()}
                    </td>
                    <td className="px-6 py-4 border-r text-center">
                      <div className="flex items-center justify-center gap-1 mx-auto">
                        <div
                          className={cn(
                            "w-12 h-8 rounded flex items-center justify-center text-xs font-bold",
                            getScoreColor(score)
                          )}
                        >
                          {formatScore(score)}
                        </div>
                        <span className="text-slate-400 text-xs font-medium">
                          /
                        </span>
                        <div
                          className={cn(
                            "w-12 h-8 rounded flex items-center justify-center text-xs font-bold",
                            getScoreColor(averageScore)
                          )}
                        >
                          {formatScore(averageScore)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 border-r text-slate-600">
                      {categoryAnalyses[category.id]?.forces ? (
                        <ul className="space-y-1 text-xs">
                          {categoryAnalyses[category.id].forces.map(
                            (force, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="flex-shrink-0">✓</span>
                                <span className="break-words">{force}</span>
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <span className="text-slate-400 italic">
                          À compléter
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 border-r text-slate-600">
                      {categoryAnalyses[category.id]?.faiblesses ? (
                        <ul className="space-y-1 text-xs">
                          {categoryAnalyses[category.id].faiblesses.map(
                            (weakness, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="flex-shrink-0">✗</span>
                                <span className="break-words">{weakness}</span>
                              </li>
                            )
                          )}
                        </ul>
                      ) : (
                        <span className="text-slate-400 italic">
                          À compléter
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {attentionPoints.length > 0 ? (
                        <ul className="space-y-1 max-h-48 overflow-y-auto">
                          {attentionPoints.map((point, idx) => (
                            <li key={idx} className="text-xs flex gap-2">
                              <span className="flex-shrink-0">•</span>
                              <span className="break-words">{point}</span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
