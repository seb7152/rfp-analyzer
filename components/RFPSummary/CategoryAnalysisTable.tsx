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
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
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

  // Get attention points (questions from responses) for a category
  const getAttentionPoints = (categoryId: string): string[] => {
    const questions = new Set<string>();
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

    // Get unique questions from responses for these requirements
    responses.forEach((response) => {
      if (
        requirementIds.has(response.requirement_id) &&
        response.question &&
        response.question.trim()
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
      "| Catégorie | Forces | Faiblesses | Points d'attention |\n";
    markdown += "|-----------|--------|-----------|--------------------|\n";

    for (const category of flatCategories) {
      const attentionPoints = getAttentionPoints(category.id);
      const indent = "  ".repeat(category.level);
      const pointsList =
        attentionPoints.length > 0
          ? attentionPoints.map((p) => `• ${p}`).join("\n")
          : "";

      markdown += `| ${indent}**${category.code}** - ${category.title} | | | ${pointsList} |\n`;
    }

    return markdown;
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
    <Card className="w-full overflow-hidden mb-8">
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
      <CardContent>
        <div className="relative w-full overflow-auto border rounded-md">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium sticky left-0 bg-slate-50 z-30 border-b border-r min-w-[300px]">
                  Catégorie
                </th>
                <th className="px-4 py-3 font-medium border-b border-r min-w-[100px] text-center">
                  Note
                </th>
                <th className="px-4 py-3 font-medium border-b border-r min-w-[200px]">
                  Forces
                </th>
                <th className="px-4 py-3 font-medium border-b border-r min-w-[200px]">
                  Faiblesses
                </th>
                <th className="px-4 py-3 font-medium border-b min-w-[300px]">
                  Points d'attention
                </th>
              </tr>
            </thead>
            <tbody>
              {flatCategories.map((category) => {
                const attentionPoints = getAttentionPoints(category.id);
                const score =
                  selectedSupplierId && selectedSupplierId !== ""
                    ? getCategoryScore(category.id, selectedSupplierId)
                    : null;
                return (
                  <tr
                    key={category.id}
                    className="border-b transition-colors bg-white hover:bg-slate-50"
                  >
                    <td
                      className={cn(
                        "px-4 py-3 font-medium text-slate-900 sticky left-0 z-10 border-r bg-white hover:bg-slate-50 min-w-[300px]"
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
                          category.children.some((c) => c.type === "category") ? (
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
                        <span
                          className="truncate max-w-[200px]"
                          title={category.title}
                        >
                          {category.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r text-center">
                      <div
                        className={cn(
                          "w-10 h-8 rounded flex items-center justify-center text-xs font-bold mx-auto",
                          getScoreColor(score)
                        )}
                      >
                        {formatScore(score)}
                      </div>
                    </td>
                    <td className="px-4 py-3 border-r text-slate-600">
                      {/* Forces - to be filled by AI later */}
                      <span className="text-slate-400 italic">À compléter</span>
                    </td>
                    <td className="px-4 py-3 border-r text-slate-600">
                      {/* Weaknesses - to be filled by AI later */}
                      <span className="text-slate-400 italic">À compléter</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {attentionPoints.length > 0 ? (
                        <ul className="space-y-1 max-h-40 overflow-y-auto">
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
