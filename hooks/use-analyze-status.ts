"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

interface AnalysisStatus {
  jobId: string | null;
  startedAt: string | null;
  completedAt: string | null;
  totalResponses: number;
  processedResponses: number;
  status: "pending" | "processing" | "completed" | "failed" | null;
}

export function useAnalyzeStatus(rfpId: string | null) {
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!rfpId) {
      setStatus(null);
      return;
    }

    // Initial fetch of current status
    const fetchInitialStatus = async () => {
      const { data, error } = await supabase
        .from("rfps")
        .select("analysis_status")
        .eq("id", rfpId)
        .single();

      if (error) {
        console.error("Error fetching initial analysis status:", error);
        return;
      }

      if (data?.analysis_status) {
        setStatus(data.analysis_status as AnalysisStatus);
      }
    };

    fetchInitialStatus();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`rfp-status-${rfpId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rfps",
          filter: `id=eq.${rfpId}`,
        },
        (payload: any) => {
          if (payload.eventType === "UPDATE" && payload.new.analysis_status) {
            const newStatus = payload.new.analysis_status as AnalysisStatus;
            setStatus(newStatus);

            // If analysis completed, refetch responses to update AI scores and comments
            if (newStatus.status === "completed") {
              queryClient.invalidateQueries({
                queryKey: ["responses", rfpId],
              });
              console.log("AI analysis completed, refetching responses");
            }
          }
        }
      )
      .subscribe((status: any) => {
        if (status === "SUBSCRIPTION_ERROR") {
          console.error("Subscription error for RFP status");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [rfpId, queryClient]);

  return {
    status,
    isSubscribed: !!rfpId,
  };
}
