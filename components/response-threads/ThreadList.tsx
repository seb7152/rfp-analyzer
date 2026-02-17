"use client";

import { useState } from "react";
import { ThreadCard } from "./ThreadCard";
import type {
  ResponseThreadWithDetails,
  ThreadCounts,
} from "@/types/response-thread";

interface ThreadListProps {
  threads: ResponseThreadWithDetails[];
  counts: ThreadCounts;
  rfpId: string;
  currentUserId: string;
  onResolve: (threadId: string) => void;
  onReopen: (threadId: string) => void;
  isLoading?: boolean;
  showContext?: boolean;
  onNavigateToThread?: (requirementId: string, responseId: string) => void;
}

type StatusFilter = "all" | "open" | "resolved";

export function ThreadList({
  threads,
  counts,
  rfpId,
  currentUserId,
  onResolve,
  onReopen,
  isLoading,
  showContext = false,
  onNavigateToThread,
}: ThreadListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");

  const filteredThreads = threads.filter((t) => {
    if (statusFilter === "all") return true;
    return t.status === statusFilter;
  });

  // Sort: blocking first, then important, then by date
  const sortedThreads = [...filteredThreads].sort((a, b) => {
    if (a.status !== b.status) {
      return a.status === "open" ? -1 : 1;
    }
    const priorityOrder = { blocking: 0, important: 1, normal: 2 };
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="flex flex-col h-full">
      {/* SegmentedControl filter */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-md p-0.5">
          {(
            [
              { value: "open", label: "Ouverts", count: counts.open },
              { value: "resolved", label: "Résolus", count: counts.resolved },
              { value: "all", label: "Tous", count: counts.total },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`flex-1 text-xs font-medium py-1.5 px-2 rounded transition-colors ${
                statusFilter === opt.value
                  ? "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {opt.label}{" "}
              <span className="text-[10px] opacity-70">{opt.count}</span>
            </button>
          ))}
        </div>

        {/* Blocking count indicator */}
        {counts.blocking > 0 && (
          <div className="mt-1.5 flex items-center gap-2 text-[10px]">
            <span className="inline-flex items-center gap-0.5 text-red-600">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {counts.blocking} bloquant{counts.blocking > 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="text-center text-xs text-gray-400 py-8">
            Chargement...
          </div>
        ) : sortedThreads.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-8">
            {statusFilter === "open"
              ? "Aucun point ouvert"
              : statusFilter === "resolved"
                ? "Aucun point résolu"
                : "Aucun point de discussion"}
          </div>
        ) : (
          sortedThreads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              rfpId={rfpId}
              currentUserId={currentUserId}
              onResolve={onResolve}
              onReopen={onReopen}
              showContext={showContext}
              onNavigateToThread={onNavigateToThread}
            />
          ))
        )}
      </div>
    </div>
  );
}
