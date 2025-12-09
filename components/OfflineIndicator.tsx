"use client";

import { useOnlineStatus } from "@/hooks/use-online-status";
import { useOfflineQueueStatus } from "@/hooks/use-offline-sync";
import { Badge } from "@/components/ui/badge";
import { WifiOff, Loader2 } from "lucide-react";

interface OfflineIndicatorProps {
  /**
   * Compact mode for mobile (icon + count only)
   */
  compact?: boolean;
}

/**
 * Indicator showing network status and pending offline mutations
 *
 * States:
 * - Online with no pending: Nothing shown (or subtle green icon)
 * - Offline: Orange badge "Offline" + pending count
 * - Syncing: Blue badge "Synchronisation..." + spinner
 */
export function OfflineIndicator({ compact = false }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();
  const { pendingCount, hasPending } = useOfflineQueueStatus();

  // Don't show anything if online and no pending mutations
  if (isOnline && !hasPending) {
    return null;
  }

  // Offline state
  if (!isOnline) {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-300"
      >
        <WifiOff className="h-3.5 w-3.5" />
        {!compact && <span>Offline</span>}
        {hasPending && (
          <span className="ml-1 rounded-full bg-orange-200 px-1.5 py-0.5 text-xs font-semibold dark:bg-orange-800">
            {pendingCount}
          </span>
        )}
      </Badge>
    );
  }

  // Online but has pending mutations (currently syncing or failed)
  if (hasPending) {
    return (
      <Badge
        variant="outline"
        className="gap-1.5 border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {!compact && <span>Synchronisation</span>}
        {hasPending && (
          <span className="ml-1 rounded-full bg-blue-200 px-1.5 py-0.5 text-xs font-semibold dark:bg-blue-800">
            {pendingCount}
          </span>
        )}
      </Badge>
    );
  }

  return null;
}
