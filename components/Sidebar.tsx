"use client";

import React, { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RequirementTree } from "./RequirementTree";
import {
  useRequirements,
  searchRequirementTree,
} from "@/hooks/use-requirements";
import type { RequirementWithChildren } from "@/lib/supabase/types";

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

  const { requirements, isLoading, error } = useRequirements(
    rfpId,
    searchQuery,
  );

  // Apply search filtering to the tree
  const filteredRequirements = useMemo(() => {
    if (!searchQuery) {
      return requirements;
    }
    return searchRequirementTree(requirements, searchQuery);
  }, [requirements, searchQuery]);

  // Auto-expand all nodes when searching
  const displayedExpandedNodeIds = useMemo(() => {
    if (searchQuery || expandAll) {
      // Auto-expand all nodes when searching or expandAll is active
      const allNodeIds = new Set<string>();

      function collectNodeIds(nodes: RequirementWithChildren[]) {
        for (const node of nodes) {
          allNodeIds.add(node.id);
          if (node.children) {
            collectNodeIds(node.children);
          }
        }
      }

      collectNodeIds(filteredRequirements);
      return allNodeIds;
    }
    return expandedNodeIds;
  }, [filteredRequirements, expandedNodeIds, searchQuery, expandAll]);

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
      className={`flex flex-col h-full bg-slate-900 text-white border-r border-slate-800 ${className}`}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-slate-800 p-4 space-y-3">
        <h2 className="text-lg font-semibold text-white">Requirements</h2>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by ID or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-slate-800 border-slate-700 text-white placeholder-slate-400"
          />
        </div>

        {/* Expand/Collapse Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExpandAll}
            className={`flex-1 bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700 ${
              expandAll ? "bg-slate-700" : ""
            }`}
          >
            <ChevronDown className="w-4 h-4 mr-1" />
            Expand All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCollapseAll}
            className="flex-1 bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
          >
            <ChevronUp className="w-4 h-4 mr-1" />
            Collapse All
          </Button>
        </div>
      </div>

      {/* Requirements Tree */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="p-4 text-slate-400">Loading requirements...</div>
        ) : error ? (
          <div className="p-4 text-red-400">
            Error loading requirements: {error.message}
          </div>
        ) : filteredRequirements.length === 0 ? (
          <div className="p-4 text-slate-400">
            {searchQuery
              ? "No requirements matching your search"
              : "No requirements found"}
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="p-2">
              <RequirementTree
                requirements={filteredRequirements}
                selectedRequirementId={selectedRequirementId}
                expandedNodeIds={displayedExpandedNodeIds}
                onSelectRequirement={onSelectRequirement}
                onToggleNode={handleToggleNode}
              />
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
