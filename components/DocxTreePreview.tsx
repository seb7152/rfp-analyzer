"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SectionTreeNode } from "@/lib/docx-tree-builder";

interface Category {
  id: string;
  code: string;
  title: string;
}

interface DocxTreePreviewProps {
  tree: SectionTreeNode[];
  existingCategories: Category[];
  onTreeChange: (tree: SectionTreeNode[]) => void;
}

export function DocxTreePreview({
  tree,
  existingCategories,
  onTreeChange,
}: DocxTreePreviewProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const updateNode = (
    nodes: SectionTreeNode[],
    nodeId: string,
    updates: Partial<SectionTreeNode>
  ): SectionTreeNode[] => {
    return nodes.map((node) => {
      if (node.id === nodeId) {
        return { ...node, ...updates };
      }
      if (node.children.length > 0) {
        return {
          ...node,
          children: updateNode(node.children, nodeId, updates),
        };
      }
      return node;
    });
  };

  // Generate a category code from the section title
  const generateCategoryCode = (title: string): string => {
    // Remove common words and special characters
    const words = title
      .toUpperCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(
        (word) =>
          word &&
          !["DE", "DU", "LA", "LE", "LES", "ET", "OU", "POUR", "DANS"].includes(
            word
          )
      );

    if (words.length === 0) return "CAT";

    // Take first 4 letters of first word, or first letter of each word
    if (words.length === 1) {
      return words[0].substring(0, 4);
    } else {
      // Take first letter of each word, max 6 letters
      return words
        .slice(0, 6)
        .map((w) => w[0])
        .join("");
    }
  };

  const findNodeById = (
    nodes: SectionTreeNode[],
    id: string
  ): SectionTreeNode | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children.length > 0) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const handleCategoryToggle = (nodeId: string, isCategory: boolean) => {
    const node = findNodeById(tree, nodeId);
    const generatedCode = node ? generateCategoryCode(node.title) : "";

    const updatedTree = updateNode(tree, nodeId, {
      isCategory,
      categoryMapping: isCategory
        ? { type: "new", newCode: generatedCode }
        : undefined,
    });
    onTreeChange(updatedTree);
  };

  const handleMappingTypeChange = (
    nodeId: string,
    type: "existing" | "new"
  ) => {
    const node = findNodeById(tree, nodeId);
    const generatedCode =
      node && type === "new" ? generateCategoryCode(node.title) : "";

    const updatedTree = updateNode(tree, nodeId, {
      categoryMapping:
        type === "new" ? { type, newCode: generatedCode } : { type },
    });
    onTreeChange(updatedTree);
  };

  const handleExistingCategoryChange = (nodeId: string, existingId: string) => {
    const updatedTree = updateNode(tree, nodeId, {
      categoryMapping: { type: "existing", existingId },
    });
    onTreeChange(updatedTree);
  };

  const handleNewCategoryCodeChange = (nodeId: string, newCode: string) => {
    const updatedTree = updateNode(tree, nodeId, {
      categoryMapping: { type: "new", newCode },
    });
    onTreeChange(updatedTree);
  };

  const renderTree = (
    nodes: SectionTreeNode[],
    level: number = 0
  ): React.ReactNode => {
    return nodes.map((node) => {
      const isExpanded = expandedIds.has(node.id);
      const hasChildren = node.children.length > 0;
      const hasRequirements = node.requirements.length > 0;

      return (
        <div key={node.id} className="mb-2">
          {/* Section Node */}
          <div
            className="flex items-start gap-2 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
            style={{ paddingLeft: `${level * 24 + 8}px` }}
          >
            {/* Expand/Collapse Button */}
            <button
              onClick={() => toggleExpanded(node.id)}
              className="mt-1 p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
              disabled={!hasChildren && !hasRequirements}
            >
              {hasChildren || hasRequirements ? (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )
              ) : (
                <div className="h-4 w-4" />
              )}
            </button>

            {/* Category Checkbox */}
            <div className="flex items-center gap-2 mt-1">
              <input
                type="checkbox"
                checked={node.isCategory}
                onChange={(e) =>
                  handleCategoryToggle(node.id, e.target.checked)
                }
                className="h-4 w-4 rounded cursor-pointer"
              />
            </div>

            {/* Section Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  H{node.level}
                </span>
                <span className="font-medium text-sm">{node.title}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  ({node.requirements.length} exigence
                  {node.requirements.length > 1 ? "s" : ""})
                </span>
              </div>

              {/* Category Mapping Options - Only if checkbox is checked */}
              {node.isCategory && (
                <div className="mt-2 p-3 bg-slate-100 dark:bg-slate-900 rounded-md space-y-2">
                  <Label className="text-xs font-semibold">
                    Mapper cette section vers :
                  </Label>

                  {/* Mapping Type Selector */}
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleMappingTypeChange(node.id, "existing")
                      }
                      className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
                        node.categoryMapping?.type === "existing"
                          ? "bg-blue-100 border-blue-400 dark:bg-blue-900 dark:border-blue-600"
                          : "bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600"
                      }`}
                    >
                      Catégorie existante
                    </button>
                    <button
                      onClick={() => handleMappingTypeChange(node.id, "new")}
                      className={`flex-1 px-3 py-2 text-xs rounded-md border transition-colors ${
                        node.categoryMapping?.type === "new"
                          ? "bg-blue-100 border-blue-400 dark:bg-blue-900 dark:border-blue-600"
                          : "bg-white border-slate-300 dark:bg-slate-800 dark:border-slate-600"
                      }`}
                    >
                      Nouvelle catégorie
                    </button>
                  </div>

                  {/* Existing Category Selector */}
                  {node.categoryMapping?.type === "existing" && (
                    <Select
                      value={node.categoryMapping?.existingId || ""}
                      onValueChange={(value) =>
                        handleExistingCategoryChange(node.id, value)
                      }
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue placeholder="Sélectionner une catégorie..." />
                      </SelectTrigger>
                      <SelectContent>
                        {existingCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.code} - {cat.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* New Category Code Input */}
                  {node.categoryMapping?.type === "new" && (
                    <div>
                      <Input
                        placeholder="Code de la nouvelle catégorie (ex: FONC)"
                        value={node.categoryMapping?.newCode || ""}
                        onChange={(e) =>
                          handleNewCategoryCodeChange(node.id, e.target.value)
                        }
                        className="text-xs"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Titre : {node.title}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Requirements (when expanded) */}
          {isExpanded && hasRequirements && (
            <div
              className="mt-1 space-y-1"
              style={{ paddingLeft: `${(level + 1) * 24 + 32}px` }}
            >
              {node.requirements.map((req, idx) => (
                <div
                  key={idx}
                  className="text-xs py-1 px-2 bg-slate-50 dark:bg-slate-900/50 rounded"
                >
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {req.code}
                  </span>
                  {req.title && (
                    <span className="ml-2 text-slate-700 dark:text-slate-300">
                      {req.title}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Children Sections */}
          {isExpanded && hasChildren && (
            <div className="mt-1">{renderTree(node.children, level + 1)}</div>
          )}
        </div>
      );
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (nodes: SectionTreeNode[]) => {
      nodes.forEach((node) => {
        allIds.add(node.id);
        if (node.children.length > 0) collectIds(node.children);
      });
    };
    collectIds(tree);
    setExpandedIds(allIds);
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Control Buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={expandAll}
          className="gap-2"
        >
          <ChevronDown className="h-4 w-4" />
          Tout développer
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={collapseAll}
          className="gap-2"
        >
          <ChevronRight className="h-4 w-4" />
          Tout réduire
        </Button>
      </div>

      {/* Tree View */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 max-h-[500px] overflow-y-auto">
        {tree.length > 0 ? (
          renderTree(tree)
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aucune section trouvée
          </p>
        )}
      </div>

      {/* Help Text */}
      <div className="text-xs text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md">
        <p className="font-semibold mb-1">💡 Comment ça marche :</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Cochez les sections qui doivent devenir des catégories</li>
          <li>
            Les exigences seront assignées à la première section parente cochée
          </li>
          <li>Mappez vers une catégorie existante ou créez-en une nouvelle</li>
          <li>
            Les sections non cochées verront leurs exigences remonter au parent
          </li>
        </ul>
      </div>
    </div>
  );
}
