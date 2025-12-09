"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useOnlineStatus } from "./use-online-status";
import { offlineQueue, type QueuedMutation } from "@/lib/offline-queue";

const MAX_RETRIES = 3;

interface SyncStatus {
  isSyncing: boolean;
  syncedCount: number;
  failedCount: number;
}

/**
 * Hook to synchronize offline mutations when connection is restored
 *
 * Automatically detects when the app goes online and processes
 * all queued mutations with retry logic and error handling.
 *
 * @returns {SyncStatus} Current synchronization status
 */
export function useOfflineSync(): SyncStatus {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const syncInProgress = useRef(false);

  /**
   * Process a single mutation from the queue
   */
  const processMutation = useCallback(
    async (mutation: QueuedMutation): Promise<boolean> => {
      try {
        console.log("[useOfflineSync] Processing mutation:", mutation.id);

        const response = await fetch(mutation.endpoint, {
          method: mutation.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mutation.body),
        });

        if (!response.ok) {
          // Check for auth errors (don't retry these)
          if (response.status === 401 || response.status === 403) {
            console.error(
              "[useOfflineSync] Auth error, removing from queue:",
              mutation.id
            );
            offlineQueue.remove(mutation.id);
            return false;
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Success - remove from queue
        offlineQueue.remove(mutation.id);
        console.log("[useOfflineSync] Mutation successful:", mutation.id);
        return true;
      } catch (error) {
        console.error("[useOfflineSync] Mutation failed:", mutation.id, error);

        // Increment retry count
        offlineQueue.incrementRetry(mutation.id);

        // Remove if max retries exceeded
        if (mutation.retryCount >= MAX_RETRIES - 1) {
          console.error(
            "[useOfflineSync] Max retries exceeded, removing:",
            mutation.id
          );
          offlineQueue.remove(mutation.id);
        }

        return false;
      }
    },
    []
  );

  /**
   * Process all mutations in the queue
   */
  const syncQueue = useCallback(async () => {
    if (syncInProgress.current) {
      console.log("[useOfflineSync] Sync already in progress, skipping");
      return;
    }

    const queue = offlineQueue.getAll();
    if (queue.length === 0) {
      return;
    }

    console.log("[useOfflineSync] Starting sync of", queue.length, "mutations");
    syncInProgress.current = true;
    setIsSyncing(true);
    setSyncedCount(0);
    setFailedCount(0);

    let successCount = 0;
    let failCount = 0;

    // Process mutations sequentially to avoid overwhelming the server
    for (const mutation of queue) {
      const success = await processMutation(mutation);
      if (success) {
        successCount++;
        setSyncedCount(successCount);
      } else {
        failCount++;
        setFailedCount(failCount);
      }

      // Small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    // Show toast notification
    if (successCount > 0 && failCount === 0) {
      toast.success(
        `${successCount} modification${successCount > 1 ? "s" : ""} synchronisée${successCount > 1 ? "s" : ""}`
      );
    } else if (successCount > 0 && failCount > 0) {
      toast.warning(
        `${successCount} synchronisée${successCount > 1 ? "s" : ""}, ${failCount} échouée${failCount > 1 ? "s" : ""}`
      );
    } else if (failCount > 0) {
      toast.error(`${failCount} modification${failCount > 1 ? "s" : ""} échouée${failCount > 1 ? "s" : ""}`);
    }

    // Invalidate all response queries to refresh the UI
    if (successCount > 0) {
      await queryClient.invalidateQueries({ queryKey: ["responses"] });
      await queryClient.invalidateQueries({ queryKey: ["response"] });
      await queryClient.invalidateQueries({
        queryKey: ["category-requirements"],
      });
      await queryClient.invalidateQueries({ queryKey: ["rfp-completion"] });
    }

    console.log(
      "[useOfflineSync] Sync complete:",
      successCount,
      "success,",
      failCount,
      "failed"
    );

    setIsSyncing(false);
    syncInProgress.current = false;
  }, [queryClient, processMutation]);

  /**
   * Trigger sync when going online
   */
  useEffect(() => {
    if (isOnline && !syncInProgress.current) {
      // Small delay to ensure network is stable
      const timer = setTimeout(() => {
        syncQueue();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isOnline, syncQueue]);

  return {
    isSyncing,
    syncedCount,
    failedCount,
  };
}

/**
 * Hook to get current queue status (for UI display)
 */
export function useOfflineQueueStatus() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Update count on mount
    setPendingCount(offlineQueue.getPendingCount());

    // Set up interval to check for changes (localStorage events don't work across same tab)
    const interval = setInterval(() => {
      setPendingCount(offlineQueue.getPendingCount());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    pendingCount,
    hasPending: pendingCount > 0,
  };
}
