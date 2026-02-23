"use client";

import { MessageCircle, AlertOctagon } from "lucide-react";
import type { ResponseThreadWithDetails } from "@/types/response-thread";

interface ThreadIndicatorProps {
  threads: ResponseThreadWithDetails[];
  onClick: () => void;
}

export function ThreadIndicator({ threads, onClick }: ThreadIndicatorProps) {
  const openThreads = threads.filter((t) => t.status === "open");
  const hasBlocking = openThreads.some((t) => t.priority === "blocking");
  const openCount = openThreads.length;
  const totalCount = threads.length;

  if (totalCount === 0) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800 transition-colors"
        title="Ouvrir une discussion"
      >
        <MessageCircle size={14} />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
        hasBlocking
          ? "text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900"
          : openCount > 0
            ? "text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900"
            : "text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
      }`}
      title={`${openCount} point${openCount !== 1 ? "s" : ""} ouvert${openCount !== 1 ? "s" : ""}${hasBlocking ? " (bloquant)" : ""}`}
    >
      {hasBlocking ? <AlertOctagon size={14} /> : <MessageCircle size={14} />}
      <span>{openCount > 0 ? openCount : totalCount}</span>
      {openCount === 0 && <span className="text-[10px] text-green-500">✓</span>}
    </button>
  );
}
