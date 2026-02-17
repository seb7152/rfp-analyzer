"use client";

import React from "react";
import { ChevronRight, ChevronDown, Folder, FileText, MessageCircle, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TreeNode } from "@/hooks/use-requirements";
import type { RequirementReviewStatus, PeerReviewStatus } from "@/types/peer-review";

export interface RequirementThreadCount {
  open: number;
  hasBlocking: boolean;
}

const PEER_REVIEW_STATUS_CONFIG: Record<PeerReviewStatus, {
  icon: React.ElementType;
  dotClass: string;
  label: string;
}> = {
  draft: {
    icon: FileText,
    dotClass: "",
    label: "",
  },
  submitted: {
    icon: Clock,
    dotClass: "bg-blue-500",
    label: "À valider",
  },
  approved: {
    icon: CheckCircle2,
    dotClass: "bg-green-500",
    label: "Validé",
  },
  rejected: {
    icon: AlertTriangle,
    dotClass: "bg-red-500",
    label: "Refusé",
  },
};

interface TreeViewProps {
  nodes: TreeNode[];
  selectedNodeId: string | null;
  expandedNodeIds: Set<string>;
  onSelectNode: (id: string) => void;
  onToggleNode: (nodeId: string) => void;
  level?: number;
  /** Map of requirementId -> thread counts (for sidebar indicators) */
  threadCounts?: Map<string, RequirementThreadCount>;
  /** Whether peer review is enabled for this RFP */
  peerReviewEnabled?: boolean;
  /** Map of requirementId -> review status */
  reviewStatuses?: Map<string, RequirementReviewStatus>;
}

export function RequirementsTreeView({
  nodes,
  selectedNodeId,
  expandedNodeIds,
  onSelectNode,
  onToggleNode,
  level = 0,
  threadCounts,
  peerReviewEnabled,
  reviewStatuses,
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
                    {/* Right-side indicators (peer review + threads) */}
                    {node.type === "requirement" && (
                      <span className="ml-auto flex-shrink-0 inline-flex items-center gap-1">
                        {/* Peer review status indicator */}
                        {peerReviewEnabled && (() => {
                          const reviewStatus = reviewStatuses?.get(node.id);
                          const status: PeerReviewStatus = reviewStatus?.status ?? "draft";
                          const config = PEER_REVIEW_STATUS_CONFIG[status];
                          if (status === "draft") return null;
                          const Icon = config.icon;
                          return (
                            <span
                              title={config.label}
                              className={`inline-flex items-center justify-center rounded-full w-4 h-4 flex-shrink-0 text-white ${config.dotClass}`}
                            >
                              <Icon className="w-2.5 h-2.5" />
                            </span>
                          );
                        })()}
                        {/* Thread indicator */}
                        {threadCounts && (() => {
                          const tc = threadCounts.get(node.id);
                          if (!tc || tc.open === 0) return null;
                          return (
                            <span
                              className={`inline-flex items-center gap-0.5 text-[10px] font-medium rounded px-1 ${
                                tc.hasBlocking
                                  ? "text-red-600 bg-red-100 dark:bg-red-900/50"
                                  : "text-blue-600 bg-blue-100 dark:bg-blue-900/50"
                              }`}
                            >
                              <MessageCircle size={10} />
                              {tc.open}
                            </span>
                          );
                        })()}
                      </span>
                    )}
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
                threadCounts={threadCounts}
                peerReviewEnabled={peerReviewEnabled}
                reviewStatuses={reviewStatuses}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
