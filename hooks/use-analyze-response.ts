"use client";

import { useMutation } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface AnalyzeResponseResult {
  success: boolean;
  message: string;
}

/**
 * Hook to trigger AI analysis for a single response
 * Sends request to N8N which updates database asynchronously
 * Frontend must refetch to get updated AI comment and score
 */
export function useAnalyzeResponse() {
  const supabase = createClient();

  return useMutation({
    mutationFn: async ({
      rfpId,
      requirementId,
      supplierId,
      responseText,
      systemPrompt,
    }: {
      rfpId: string;
      requirementId: string;
      supplierId: string;
      responseText: string;
      systemPrompt?: string;
    }): Promise<AnalyzeResponseResult> => {
      const { data, error } = await supabase.functions.invoke(
        "analyze-response",
        {
          body: {
            rfpId,
            requirementId,
            supplierId,
            responseText,
            systemPrompt,
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Failed to analyze response");
      }

      if (!data || !data.success) {
        throw new Error(data?.error || "Analysis request failed");
      }

      return data as AnalyzeResponseResult;
    },
  });
}
