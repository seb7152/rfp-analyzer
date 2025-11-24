"use client";

import React, { useCallback } from "react";
import { ChevronDown, ChevronRight, AlertCircle, Zap } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface TreeNode {
  id: string;
  type: "category" | "requirement";
  code: string;
  title: string;
  level: number;
  children?: TreeNode[];
}

interface WeightData {
  [nodeId: string]: number; // pondération locale (0-100)
}

interface EditableTableTreeProps {
  data: TreeNode[];
  expandedNodeIds: Set<string>;
  onToggleNode: (nodeId: string) => void;
  weights: WeightData;
  onWeightChange: (nodeId: string, weight: number) => void;
  onSelectRequirement?: (id: string) => void;
  selectedRequirementId?: string | null;
  onEquidistribute?: (parentId: string | null, childrenIds: string[]) => void;
}

export function EditableTableTree({
  data,
  expandedNodeIds,
  onToggleNode,
  weights,
  onWeightChange,
  onSelectRequirement,
  selectedRequirementId,
  onEquidistribute,
}: EditableTableTreeProps) {
  // Fonction pour calculer la pondération réelle (cascade)
  const calculateRealWeight = useCallback(
    (nodeId: string, parentId: string | null = null): number => {
      const localWeight = weights[nodeId] || 0;
      if (!parentId) return localWeight;

      const parentRealWeight = calculateRealWeight(parentId);
      return (localWeight * parentRealWeight) / 100;
    },
    [weights]
  );

  // Fonction pour obtenir le parent d'un nœud
  const getParentId = useCallback(
    (
      targetId: string,
      currentNodes: TreeNode[],
      parentId: string | null = null
    ): string | null => {
      for (const node of currentNodes) {
        if (node.id === targetId) return parentId;
        if (node.children) {
          const found = getParentId(targetId, node.children, node.id);
          if (found !== null) return found;
        }
      }
      return null;
    },
    []
  );

  // Fonction pour obtenir les enfants directs d'un nœud
  const getDirectChildren = useCallback(
    (parentId: string | null): TreeNode[] => {
      if (!parentId) return data;

      const findNode = (nodes: TreeNode[], id: string): TreeNode | null => {
        for (const node of nodes) {
          if (node.id === id) return node;
          if (node.children) {
            const found = findNode(node.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const parent = findNode(data, parentId);
      return parent?.children || [];
    },
    [data]
  );

  // Fonction pour valider qu'un niveau total = 100%
  const getChildrenTotal = useCallback(
    (parentId: string | null): number => {
      const children = getDirectChildren(parentId);
      return children.reduce((sum, child) => sum + (weights[child.id] || 0), 0);
    },
    [getDirectChildren, weights]
  );

  // Fonction pour vérifier si un nœud a un parent
  const getParentNode = useCallback(
    (
      targetId: string,
      nodes: TreeNode[] = data,
      parent: TreeNode | null = null
    ): TreeNode | null => {
      for (const node of nodes) {
        if (node.id === targetId) return parent;
        if (node.children) {
          const found = getParentNode(targetId, node.children, node);
          if (found) return found;
        }
      }
      return null;
    },
    [data]
  );

  const renderRows = (
    items: TreeNode[],
    level: number = 0,
    parentId: string | null = null
  ): React.ReactNode[] => {
    // Calcul du total pour ce niveau
    const levelTotal = getChildrenTotal(parentId);
    const isLevelValid = levelTotal === 100 || levelTotal === 0;
    const levelError =
      levelTotal > 0 && !isLevelValid ? levelTotal.toFixed(2) : null;

    const rows: React.ReactNode[] = [];
    const childrenIds = items.map((item) => item.id);

    // Afficher l'erreur ou le bouton d'équirépartition seulement si le niveau n'est pas valide
    if (levelError || (items.length > 0 && levelTotal === 0)) {
      rows.push(
        <TableRow
          key={`error-header-${parentId}`}
          className={`${levelError ? "bg-red-50 dark:bg-red-950" : "bg-amber-50 dark:bg-amber-950"}`}
        >
          <TableCell colSpan={5} className="py-2 px-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm">
                {levelError ? (
                  <>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-700 dark:text-red-200" />
                    <span className="text-red-700 dark:text-red-200">
                      Pondération invalide au niveau: Total = {levelError}%
                      (attendu: 100%)
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-700 dark:text-amber-200" />
                    <span className="text-amber-700 dark:text-amber-200">
                      Pondérations à équirépartir
                    </span>
                  </>
                )}
              </div>
              {onEquidistribute && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEquidistribute(parentId, childrenIds)}
                  className="flex items-center gap-2 whitespace-nowrap"
                >
                  <Zap className="w-4 h-4" />
                  Équirépartir
                </Button>
              )}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    // Ajouter les lignes du contenu
    items.forEach((item) => {
      const isExpanded = expandedNodeIds.has(item.id);
      const hasChildren = item.children && item.children.length > 0;
      const isSelected = selectedRequirementId === item.id;
      const localWeight = weights[item.id] || 0;
      const parentNode = getParentNode(item.id);
      const parentRealWeight = parentNode ? weights[parentNode.id] || 0 : 100;
      const realWeight = (localWeight * parentRealWeight) / 100;
      const indentPixels = level * 24;

      const isCategory = item.type === "category";
      const isRequirement = item.type === "requirement";

      let rowClassName = "";
      if (isSelected) {
        rowClassName = "bg-blue-50 dark:bg-blue-950";
      } else if (isRequirement) {
        rowClassName = "bg-gray-50 dark:bg-gray-900";
      } else {
        rowClassName = "bg-slate-50 dark:bg-slate-950 font-semibold";
      }

      rows.push(
        <TableRow
          key={item.id}
          className={`${rowClassName} cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
          onClick={() => onSelectRequirement?.(item.id)}
        >
          {/* Colonne: Expand/Collapse */}
          <TableCell className="w-[50px] pl-2">
            <div style={{ marginLeft: `${indentPixels}px` }}>
              {hasChildren ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleNode(item.id);
                  }}
                  className="p-0 hover:opacity-70 transition-opacity"
                  aria-label={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <div className="w-4" />
              )}
            </div>
          </TableCell>

          {/* Colonne: Code/ID */}
          <TableCell
            className={`w-[110px] text-sm ${isCategory ? "font-semibold" : ""}`}
          >
            {item.code}
          </TableCell>

          {/* Colonne: Titre */}
          <TableCell
            className={`text-sm ${isCategory ? "font-semibold" : isRequirement ? "italic" : ""}`}
          >
            {isRequirement && (
              <span className="inline-block mr-2 text-gray-400">→</span>
            )}
            {item.title}
          </TableCell>

          {/* Colonne: Pondération locale (éditable) */}
          <TableCell className="w-[140px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={localWeight}
                onChange={(e) => {
                  const value = Math.max(
                    0,
                    Math.min(100, parseFloat(e.target.value) || 0)
                  );
                  onWeightChange(item.id, value);
                }}
                className="w-20 h-8 text-sm text-right"
              />
              <span className="text-sm font-medium">%</span>
            </div>
          </TableCell>

          {/* Colonne: Pondération réelle (calculée) */}
          <TableCell className="w-[140px] text-right">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              {realWeight.toFixed(4)}%
            </span>
          </TableCell>
        </TableRow>
      );

      // Enfants récursifs
      if (hasChildren && isExpanded && item.children) {
        rows.push(...renderRows(item.children, level + 1, item.id));
      }
    });

    return rows;
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-100 dark:bg-slate-900">
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="w-[100px]">Code</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead className="w-[120px] text-right">
              Pondération locale
            </TableHead>
            <TableHead className="w-[120px] text-right">
              Pondération réelle
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            renderRows(data)
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                Aucune donnée disponible
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
