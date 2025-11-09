"use client";

import { useMutation } from "@tanstack/react-query";

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
 * Sends all requirement and supplier response data to N8N webhook
 */
export function useAnalyzeRFP() {
  return useMutation({
    mutationFn: async (rfpId: string): Promise<AnalyzeRFPResponse> => {
      const response = await fetch(`/api/rfps/${rfpId}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to trigger analysis");
      }

      return response.json();
    },
  });
}
