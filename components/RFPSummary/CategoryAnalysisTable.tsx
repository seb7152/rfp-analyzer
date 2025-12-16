"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const treeRes = await fetch(`/api/rfps/${rfpId}/tree`);
        const treeData = await treeRes.json();
        setTree(treeData || []);

        // Initialize expanded categories (expand top level by default)
        const topLevelIds = (treeData || []).map((n: TreeNode) => n.id);
        setExpandedCategories(new Set(topLevelIds));
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

  // Get attention points (requirements) for a category
  const getAttentionPoints = (categoryId: string): string[] => {
    const points: string[] = [];

    const traverse = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        if (node.id === categoryId && node.children) {
          // Get all requirements under this category
          const collectRequirements = (children: TreeNode[]) => {
            for (const child of children) {
              if (child.type === "requirement") {
                points.push(child.title);
              } else if (child.children) {
                collectRequirements(child.children);
              }
            }
          };
          collectRequirements(node.children);
        } else if (node.children) {
          traverse(node.children);
        }
      }
    };

    traverse([
      {
        id: categoryId,
        code: "",
        title: "",
        type: "category",
        children: findNodeById(tree, categoryId)?.children,
      } as TreeNode,
    ]);

    // If the above didn't work, try direct traversal
    if (points.length === 0) {
      const node = findNodeById(tree, categoryId);
      if (node) {
        const collectRequirements = (children: TreeNode[] | undefined) => {
          if (!children) return;
          for (const child of children) {
            if (child.type === "requirement") {
              points.push(child.title);
            } else if (child.children) {
              collectRequirements(child.children);
            }
          }
        };
        collectRequirements(node.children);
      }
    }

    return points;
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
      const pointsList = attentionPoints
        .map((p) => `• ${p}`)
        .join("\n");

      markdown += `| ${indent}**${category.code}** - ${category.title} | | | ${pointsList ? "```\n" + pointsList + "\n```" : ""} |\n`;
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
      <CardHeader className="pb-4 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">
          Analyse par Catégorie
        </CardTitle>
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
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto border rounded-md">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-4 py-3 font-medium sticky left-0 bg-slate-50 z-30 border-b border-r min-w-[300px]">
                  Catégorie
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
                      ) : (
                        <span className="text-slate-400 italic">
                          Aucune exigence
                        </span>
                      )}
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
