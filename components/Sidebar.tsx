"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RequirementsTreeView } from "./RequirementsTreeView";
import {
  useRequirementsTree,
} from "@/hooks/use-requirements";
import type { TreeNode } from "@/hooks/use-requirements";

interface SidebarProps {
  rfpId: string | null;
  selectedRequirementId: string | null;
  onSelectRequirement: (id: string) => void;
  className?: string;
}

export function Sidebar({
  rfpId,
  selectedRequirementId,
  onSelectRequirement,
  className = "",
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandAll, setExpandAll] = useState(false);

  // Use the new tree hook that includes categories + requirements
  const { tree, isLoading, error } = useRequirementsTree(rfpId);

  // Find and expand path to selected requirement
  useEffect(() => {
    if (!selectedRequirementId || !tree.length) return;

    // Find the path to the selected node
    const findPath = (
      nodes: TreeNode[],
      targetId: string,
      path: string[] = [],
    ): string[] | null => {
      for (const node of nodes) {
        const currentPath = [...path, node.id];

        if (node.id === targetId) {
          return currentPath;
        }

        if (node.children) {
          const result = findPath(node.children, targetId, currentPath);
          if (result) return result;
        }
      }
      return null;
    };

    const path = findPath(tree, selectedRequirementId);
    if (path) {
      // Expand all nodes in the path (except the last one which is the selected node)
      setExpandedNodeIds((prev) => {
        const newExpanded = new Set(prev);
        path.slice(0, -1).forEach((id) => newExpanded.add(id));
        return newExpanded;
      });
      setExpandAll(false);
    }
  }, [selectedRequirementId, tree]);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return tree;
    }

    const lowerQuery = searchQuery.toLowerCase();

    function filterNodes(nodes: TreeNode[]): TreeNode[] {
      return nodes.reduce<TreeNode[]>((acc, node) => {
        const matches =
          node.code.toLowerCase().includes(lowerQuery) ||
          node.title.toLowerCase().includes(lowerQuery);

        const filteredChildren = node.children
          ? filterNodes(node.children)
          : [];

        // Include node if it matches or has matching children
        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...node,
            children:
              filteredChildren.length > 0 ? filteredChildren : node.children,
          });
        }

        return acc;
      }, []);
    }

    return filterNodes(tree);
  }, [tree, searchQuery]);

  // Auto-expand all nodes when searching
  const displayedExpandedNodeIds = useMemo(() => {
    if (searchQuery || expandAll) {
      // Auto-expand all nodes when searching or expandAll is active
      const allNodeIds = new Set<string>();

      function collectNodeIds(nodes: TreeNode[]) {
        for (const node of nodes) {
          allNodeIds.add(node.id);
          if (node.children) {
            collectNodeIds(node.children);
          }
        }
      }

      collectNodeIds(filteredTree);
      return allNodeIds;
    }
    return expandedNodeIds;
  }, [filteredTree, expandedNodeIds, searchQuery, expandAll]);

  const handleToggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodeIds);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodeIds(newExpanded);
    setExpandAll(false); // Disable auto-expand when user manually toggles
  };

  const handleExpandAll = () => {
    setExpandAll(true);
  };

  const handleCollapseAll = () => {
    setExpandAll(false);
    setExpandedNodeIds(new Set());
  };

  return (
    <div
      className={`flex flex-col h-full bg-white/50 text-slate-900 border-r border-slate-200 dark:bg-slate-900/40 dark:text-slate-50 dark:border-slate-800 ${className}`}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          Requirements
        </h2>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500 dark:text-slate-400" />
          <Input
            placeholder="Search by ID or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Expand/Collapse Buttons */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExpandAll}
            className="flex-1"
          >
            <ChevronDown className="w-4 h-4 mr-1" />
            Expand All
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCollapseAll}
            className="flex-1"
          >
            <ChevronUp className="w-4 h-4 mr-1" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Requirements Tree */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-slate-500 dark:text-slate-400">
            Loading tree...
          </div>
        ) : error ? (
          <div className="p-4 text-red-600 dark:text-red-400">
            Error loading tree: {error.message}
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="p-4 text-slate-500 dark:text-slate-400">
            {searchQuery
              ? "No items matching your search"
              : "No categories or requirements found"}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-2">
              <RequirementsTreeView
                nodes={filteredTree}
                selectedNodeId={selectedRequirementId}
                expandedNodeIds={displayedExpandedNodeIds}
                onSelectNode={onSelectRequirement}
                onToggleNode={handleToggleNode}
              />
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
