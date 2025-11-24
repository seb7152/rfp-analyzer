"use client";

import React from "react";
import { ChevronRight, ChevronDown, Folder, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TreeNode } from "@/hooks/use-requirements";

interface TreeViewProps {
  nodes: TreeNode[];
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;
  onSelectNode: (id: string) => void;
  onToggleNode: (nodeId: string) => void;
  level?: number;
}

export function RequirementsTreeView({
  nodes,
  selectedNodeId,
  expandedNodeIds,
  onSelectNode,
  onToggleNode,
  level = 0,
}: TreeViewProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => {
        const isExpanded = expandedNodeIds.has(node.id);
        const hasChildren = node.children && node.children.length > 0;
        const isSelected = selectedNodeId === node.id;
        const indentPixels = level * 16;

        return (
          <div key={node.id}>
            {/* Node Button */}
            <Button
              variant={isSelected ? "primary" : "ghost"}
              size="sm"
              onClick={() => onSelectNode(node.id)}
              className={`w-full justify-start px-2 py-1.5 h-auto text-left text-sm font-normal ${
                isSelected ? "text-white dark:text-slate-900" : ""
              }`}
              style={{ paddingLeft: `${indentPixels + 8}px` }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Expand/Collapse Chevron */}
                {hasChildren ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleNode(node.id);
                    }}
                    className="flex-shrink-0 p-0 hover:opacity-70 transition-opacity"
                    aria-label={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  // Empty space for alignment
                  <div className="w-4 flex-shrink-0" />
                )}

                {/* Icon */}
                {node.type === "category" ? (
                  <Folder
                    className={`w-4 h-4 flex-shrink-0 ${
                      isSelected
                        ? "text-white dark:text-slate-900"
                        : "text-slate-500 dark:text-slate-400"
                    }`}
                  />
                ) : (
                  <FileText
                    className={`w-4 h-4 flex-shrink-0 ${
                      isSelected
                        ? "text-white dark:text-slate-900"
                        : "text-slate-400 dark:text-slate-500"
                    }`}
                  />
                )}

                {/* Code and Title */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`font-semibold flex-shrink-0 ${
                        isSelected
                          ? "text-white dark:text-slate-900"
                          : "text-slate-900 dark:text-slate-100"
                      }`}
                    >
                      {node.code}
                    </span>
                    <span
                      className={`truncate ${
                        node.type === "requirement" ? "italic" : ""
                      } ${
                        isSelected
                          ? "text-white dark:text-slate-900"
                          : "text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {node.title}
                    </span>
                  </div>
                </div>
              </div>
            </Button>

            {/* Recursive Children */}
            {hasChildren && isExpanded && (
              <RequirementsTreeView
                nodes={node.children!}
                selectedNodeId={selectedNodeId}
                expandedNodeIds={expandedNodeIds}
                onSelectNode={onSelectNode}
                onToggleNode={onToggleNode}
                level={level + 1}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
