"use client";

import React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RequirementWithChildren } from "@/lib/supabase/types";

interface RequirementTreeProps {
  requirements: RequirementWithChildren[];
  selectedRequirementId: string | null;
  expandedNodeIds: Set<string>;
  onSelectRequirement: (id: string) => void;
  onToggleNode: (nodeId: string) => void;
  level?: number;
}

export function RequirementTree({
  requirements,
  selectedRequirementId,
  expandedNodeIds,
  onSelectRequirement,
  onToggleNode,
  level = 0,
}: RequirementTreeProps) {
  return (
    <div className="space-y-1">
      {requirements.map((req) => {
        const isExpanded = expandedNodeIds.has(req.id);
        const hasChildren = req.children && req.children.length > 0;
        const isSelected = selectedRequirementId === req.id;

        // Calculate indentation based on level (hierarchy depth)
        const indentPixels = level * 16;

        return (
          <div key={req.id}>
            {/* Requirement Node */}
            <Button
              variant={isSelected ? "default" : "ghost"}
              size="sm"
              onClick={() => onSelectRequirement(req.id)}
              className="w-full justify-start px-2 py-1.5 h-auto text-left text-sm font-normal"
              style={{ paddingLeft: `${indentPixels + 8}px` }}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Expand/Collapse Chevron */}
                {hasChildren ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleNode(req.id);
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
                  // Empty space for alignment when no children
                  <div className="w-4 flex-shrink-0" />
                )}

                {/* Requirement ID and Title */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold flex-shrink-0">
                      {req.requirement_id_external}
                    </span>
                    <span className="truncate">{req.title}</span>
                  </div>
                </div>
              </div>
            </Button>

            {/* Recursive Children */}
            {hasChildren && isExpanded && (
              <RequirementTree
                requirements={req.children!}
                selectedRequirementId={selectedRequirementId}
                expandedNodeIds={expandedNodeIds}
                onSelectRequirement={onSelectRequirement}
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
