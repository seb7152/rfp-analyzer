"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * T137: Hook for subscribing to analysis status changes via Supabase Realtime
 *
 * Subscribes to the rfps table's analysis_status column and triggers
 * response data refresh when analysis completes
 *
 * Usage:
 * const { status, isLoading } = useAnalyzeStatus(rfpId);
 */

interface AnalysisStatus {
  jobId: string;
  status: "processing" | "completed" | "failed";
  completedAt?: string;
  totalResponses?: number;
  processedResponses?: number;
}

export function useAnalyzeStatus(rfpId: string | undefined) {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

  // T138: Auto-refetch responses when analysis completes
  const handleStatusChange = useCallback(
    async (newStatus: AnalysisStatus | null) => {
      setStatus(newStatus);

      if (newStatus?.status === "completed") {
        // Invalidate response queries to trigger refetch
        // This will show the updated AI scores and comments
        await queryClient.invalidateQueries({
          queryKey: ["responses", rfpId],
        });

        // Also invalidate the comparison data if it's cached
        await queryClient.invalidateQueries({
          queryKey: ["rfp-comparison", rfpId],
        });

        console.log("[Analysis] Status completed, invalidated response caches");
      }
    },
    [rfpId, queryClient],
  );

  useEffect(() => {
    if (!rfpId) return;

    setIsLoading(true);

    // Subscribe to changes on rfps table's analysis_status column
    const subscription = supabase
      .from("rfps")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rfps",
          filter: `id=eq.${rfpId}`,
        },
        (payload) => {
          if (payload.new && payload.new.analysis_status) {
            handleStatusChange(payload.new.analysis_status);
          }
        },
      )
      .subscribe();

    setIsLoading(false);

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        supabase.removeSubscription(subscription);
      }
    };
  }, [rfpId, supabase, handleStatusChange]);

  return { status, isLoading };
}
