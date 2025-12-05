"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface AnalyzeRFPResponse {
  success: boolean;
  jobId: string;
  message: string;
  requirements_count: number;
  suppliers_count: number;
  total_responses: number;
}

/**
 * Hook to trigger AI analysis for an RFP
 * Calls Supabase Edge Function which sends data to N8N webhook
 */
export function useAnalyzeRFP() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({ rfpId, systemPrompt }: { rfpId: string; systemPrompt?: string }): Promise<AnalyzeRFPResponse> => {
      const { data, error } = await supabase.functions.invoke("analyze-rfp", {
        body: { rfpId, systemPrompt },
      });

      if (error) {
        throw new Error(error.message || "Failed to trigger analysis");
      }

      if (!data || !data.success) {
        throw new Error(data?.error || "Analysis request failed");
      }

      return data as AnalyzeRFPResponse;
    },
  });
}
