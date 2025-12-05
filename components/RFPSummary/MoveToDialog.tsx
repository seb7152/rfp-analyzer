"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, ChevronDown, Folder } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeNode {
  id: string;
  type: "category" | "requirement";
  code: string;
  title: string;
  children?: TreeNode[];
}

interface MoveToDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TreeNode[];
  onMove: (targetCategoryId: string | null) => void;
  sourceNodeIds: string[];
}

export function MoveToDialog({
  open,
  onOpenChange,
  data,
  onMove,
  sourceNodeIds,
}: MoveToDialogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Check if a node is a descendant of any source node (to prevent cycles)
  const isDescendantOfSource = (nodeId: string, nodes: TreeNode[]): boolean => {
    // This is a simplified check. In a real tree, we'd need to check if 'nodeId'
    // is inside the subtree of any 'sourceNodeId'.
    // Since we are moving 'sourceNodeIds', we cannot move them into themselves or their children.

    // Helper to find if 'targetId' is inside 'rootId' subtree
    const isInside = (
      rootId: string,
      targetId: string,
      currentNodes: TreeNode[]
    ): boolean => {
      const root = findNode(currentNodes, rootId);
      if (!root) return false;

      const findInSubtree = (n: TreeNode): boolean => {
        if (n.id === targetId) return true;
        return n.children?.some(findInSubtree) || false;
      };

      return findInSubtree(root);
    };

    return sourceNodeIds.some((sourceId) => isInside(sourceId, nodeId, nodes));
  };

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

  const renderTree = (nodes: TreeNode[], level = 0) => {
    return nodes
      .filter((node) => node.type === "category") // Only show categories as targets
      .map((node) => {
        const isSource = sourceNodeIds.includes(node.id);
        const isInvalidTarget = isSource || isDescendantOfSource(node.id, data);
        const isExpanded = expandedIds.has(node.id);
        const hasChildren =
          node.children && node.children.some((c) => c.type === "category");
        const isSelected = selectedCategoryId === node.id;

        return (
          <div key={node.id}>
            <div
              className={cn(
                "flex items-center py-1 px-2 rounded-md cursor-pointer transition-colors",
                isSelected
                  ? "bg-blue-100 dark:bg-blue-900"
                  : "hover:bg-slate-100 dark:hover:bg-slate-800",
                isInvalidTarget && "opacity-50 cursor-not-allowed"
              )}
              style={{ paddingLeft: `${level * 16 + 8}px` }}
              onClick={() => {
                if (!isInvalidTarget) {
                  setSelectedCategoryId(node.id);
                }
              }}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
                className={cn(
                  "mr-1 p-0.5 rounded-sm hover:bg-slate-200 dark:hover:bg-slate-700",
                  !hasChildren && "invisible"
                )}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
              <Folder className="h-4 w-4 mr-2 text-blue-500" />
              <span className="text-sm truncate">{node.title}</span>
              <span className="ml-2 text-xs text-slate-400">({node.code})</span>
            </div>
            {hasChildren && isExpanded && (
              <div>{renderTree(node.children!, level + 1)}</div>
            )}
          </div>
        );
      });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Déplacer vers...</DialogTitle>
          <DialogDescription>
            Sélectionnez la catégorie de destination pour les éléments
            sélectionnés.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[300px] border rounded-md p-2">
          <div
            className={cn(
              "flex items-center py-1 px-2 rounded-md cursor-pointer transition-colors mb-1",
              selectedCategoryId === null
                ? "bg-blue-100 dark:bg-blue-900"
                : "hover:bg-slate-100 dark:hover:bg-slate-800"
            )}
            onClick={() => setSelectedCategoryId(null)}
          >
            <Folder className="h-4 w-4 mr-2 text-slate-500" />
            <span className="text-sm font-medium">
              Racine (Niveau supérieur)
            </span>
          </div>
          {renderTree(data)}
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={() => {
              onMove(selectedCategoryId);
              onOpenChange(false);
            }}
          >
            Déplacer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
