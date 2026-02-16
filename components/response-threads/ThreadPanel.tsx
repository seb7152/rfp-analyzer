"use client";

import { useState, useCallback } from "react";
import { X, ChevronRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThreadList } from "./ThreadList";
import { ThreadCreateForm } from "./ThreadCreateForm";
import {
  useResponseThreads,
  useCreateThread,
  useUpdateThread,
} from "@/hooks/use-response-threads";
import type { ThreadPriority, ThreadsQueryFilters } from "@/types/response-thread";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ThreadPanelContextResponse {
  responseId: string;
  supplierName: string;
  requirementTitle: string;
}

interface ThreadPanelContextGlobal {
  globalView: true;
}

export type ThreadPanelContext =
  | ThreadPanelContextResponse
  | ThreadPanelContextGlobal;

interface ThreadPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rfpId: string;
  context: ThreadPanelContext;
  currentUserId: string;
  /** Called when user clicks "Voir" on a thread in global view */
  onNavigateToThread?: (requirementId: string, responseId: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ThreadPanel({
  isOpen,
  onOpenChange,
  rfpId,
  context,
  currentUserId,
  onNavigateToThread: _onNavigateToThread,
}: ThreadPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  const isGlobal = "globalView" in context;

  // Build query filters based on context
  const filters: ThreadsQueryFilters | undefined = isGlobal
    ? undefined
    : { response_id: context.responseId };

  const { threads, counts, isLoading } = useResponseThreads(rfpId, filters);

  const { mutate: createThread, isPending: isCreating } =
    useCreateThread(rfpId);
  const { mutate: updateThread } = useUpdateThread(rfpId);

  const handleCreateThread = useCallback(
    (data: { title?: string; content: string; priority: ThreadPriority }) => {
      if (isGlobal) return; // Can't create from global view
      createThread({
        response_id: (context as ThreadPanelContextResponse).responseId,
        title: data.title,
        content: data.content,
        priority: data.priority,
      });
    },
    [createThread, context, isGlobal]
  );

  const handleResolve = useCallback(
    (threadId: string) => {
      updateThread({ threadId, status: "resolved" });
    },
    [updateThread]
  );

  const handleReopen = useCallback(
    (threadId: string) => {
      updateThread({ threadId, status: "open" });
    },
    [updateThread]
  );

  const handleClose = () => {
    onOpenChange(false);
    setIsMinimized(false);
  };

  // Panel title
  const title = isGlobal
    ? "Points de discussion"
    : `Discussion`;
  const subtitle = isGlobal
    ? null
    : `${(context as ThreadPanelContextResponse).supplierName} · ${(context as ThreadPanelContextResponse).requirementTitle}`;

  return (
    <>
      {/* Main panel — fixed right 30% */}
      <div
        className={`fixed top-0 right-0 bottom-0 w-[30%] min-w-[360px] bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 transition-transform duration-300 z-40 flex flex-col ${
          isOpen && !isMinimized ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          pointerEvents: isOpen && !isMinimized ? "auto" : "none",
        }}
      >
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between gap-2 shrink-0">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsMinimized(true)}
              title="Minimiser"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClose}
              title="Fermer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <ThreadList
            threads={threads}
            counts={counts}
            rfpId={rfpId}
            currentUserId={currentUserId}
            onResolve={handleResolve}
            onReopen={handleReopen}
            isLoading={isLoading}
            showContext={isGlobal}
          />
        </div>

        {/* Create form — only in response-specific mode */}
        {!isGlobal && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 shrink-0">
            <ThreadCreateForm
              onSubmit={handleCreateThread}
              isPending={isCreating}
            />
          </div>
        )}
      </div>

      {/* Overlay backdrop */}
      {isOpen && !isMinimized && (
        <div
          className="fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsMinimized(true)}
        />
      )}

      {/* Minimized button */}
      {isMinimized && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsMinimized(false)}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg rounded-lg px-4 py-2"
            title="Restaurer les discussions"
          >
            <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
            <MessageSquare className="h-4 w-4 mr-1" />
            Discussions
            {counts.open > 0 && (
              <span className="ml-1.5 bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">
                {counts.open}
              </span>
            )}
          </Button>
        </div>
      )}
    </>
  );
}
