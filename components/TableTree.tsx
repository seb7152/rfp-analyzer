"use client";

import React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TreeNode {
  id: string;
  type: "category" | "requirement";
  code: string;
  title: string;
  level: number;
  children?: TreeNode[];
}

interface TableTreeProps {
  data: TreeNode[];
  expandedNodeIds: Set<string>;
  onToggleNode: (nodeId: string) => void;
  onSelectRequirement?: (id: string) => void;
  selectedRequirementId?: string | null;
  getWeight?: (nodeId: string) => number;
}

export function TableTree({
  data,
  expandedNodeIds,
  onToggleNode,
  onSelectRequirement,
  selectedRequirementId,
  getWeight = () => 0,
}: TableTreeProps) {
  const renderRows = (
    items: TreeNode[],
    level: number = 0,
  ): React.ReactNode[] => {
    return items.flatMap((item) => {
      const isExpanded = expandedNodeIds.has(item.id);
      const hasChildren = item.children && item.children.length > 0;
      const isSelected = selectedRequirementId === item.id;
      const weight = getWeight(item.id);
      const indentPixels = level * 24;

      const isCategory = item.type === "category";
      const rowClassName = isCategory
        ? "bg-slate-50 dark:bg-slate-950 font-semibold"
        : "";

      return [
        <TableRow
          key={item.id}
          className={`${
            isSelected ? "bg-blue-50 dark:bg-blue-950" : rowClassName
          } cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors`}
          onClick={() => onSelectRequirement?.(item.id)}
        >
          {/* Colonne: Expand/Collapse + Type */}
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
            className={`w-[100px] text-sm ${isCategory ? "font-semibold" : ""}`}
          >
            {item.code}
          </TableCell>

          {/* Colonne: Titre */}
          <TableCell className={`text-sm ${isCategory ? "font-semibold" : ""}`}>
            {item.title}
          </TableCell>

          {/* Colonne: Pondération */}
          <TableCell className="text-right w-[120px]">
            <span className="text-sm font-medium">{weight}%</span>
          </TableCell>
        </TableRow>,
        ...(hasChildren && isExpanded && item.children
          ? renderRows(item.children, level + 1)
          : []),
      ];
    });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-100 dark:bg-slate-900">
            <TableHead className="w-[50px]"></TableHead>
            <TableHead className="w-[100px]">Code</TableHead>
            <TableHead>Titre</TableHead>
            <TableHead className="w-[120px] text-right">Pondération</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            renderRows(data)
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                Aucune donnée disponible
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
