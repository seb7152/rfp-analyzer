"use client";

import React, { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Search,
  Expand,
  Minimize,
} from "lucide-react";
import {
  Requirement,
  flattenRequirements,
  requirementsData,
} from "@/lib/fake-data";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  selectedRequirementId?: string;
  onSelectRequirement: (id: string) => void;
}

export function Sidebar({
  selectedRequirementId,
  onSelectRequirement,
}: SidebarProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(["DOM-1", "DOM-2", "DOM-3"]),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const allFlat = flattenRequirements(requirementsData);

  const toggleNode = (id: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allIds = new Set(allFlat.map((r) => r.id));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  function renderNode(req: Requirement, depth: number) {
    const hasChildren = req.children && req.children.length > 0;
    const isExpanded = expandedNodes.has(req.id);
    const isLeaf = !hasChildren || req.level === 4;
    const isSelected = selectedRequirementId === req.id;

    return (
      <div key={req.id}>
        <button
          className={`w-full flex items-center gap-2 px-2 py-2 rounded text-sm transition-colors ${
            isSelected
              ? "bg-slate-700 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => {
            if (isLeaf) {
              onSelectRequirement(req.id);
            } else {
              toggleNode(req.id);
            }
          }}
        >
          {/* Chevron or spacer */}
          <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
            {hasChildren && !isLeaf ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : null}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 text-left">
            <div className="font-mono text-xs text-slate-400">{req.id}</div>
            <div className="truncate text-sm">{req.title}</div>
          </div>

          {/* Weight badge for leaf nodes */}
          {req.weight && req.level === 4 && (
            <div className="text-xs font-semibold text-slate-400 flex-shrink-0 ml-2">
              {(req.weight * 100).toFixed(0)}%
            </div>
          )}
        </button>

        {/* Children */}
        {isExpanded && hasChildren && !isLeaf && (
          <div>
            {req.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800">
      {/* Search */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <Input
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
        </div>

        {/* Expand/Collapse buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="flex-1 h-7 text-xs gap-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            <Expand className="w-3 h-3" />
            Déplier
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="flex-1 h-7 text-xs gap-1 bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            <Minimize className="w-3 h-3" />
            Replier
          </Button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {requirementsData.map((req) => renderNode(req, 0))}
        </div>
      </div>
    </div>
  );
}
