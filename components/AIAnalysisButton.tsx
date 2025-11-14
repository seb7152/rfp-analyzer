"use client";

import { useState } from "react";
import { useAnalyzeRFP } from "@/hooks/use-analyze-rfp";
import { useAnalyzeStatus } from "@/hooks/use-analyze-status";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, CheckCircle2, AlertCircle } from "lucide-react";
import type { RFP } from "@/lib/supabase/types";

interface AIAnalysisButtonProps {
  rfp: RFP;
  responsesCount?: number;
  hasUnanalyzedResponses?: boolean;
  onAnalysisStarted?: () => void;
}

/**
 * Component for triggering AI analysis of RFP responses
 * Handles:
 * - Visibility based on unanalyzed responses (T140)
 * - Confirmation dialog (T141)
 * - Disable state during analysis (T142)
 * - Status badge with Realtime updates (T143)
 * - Toast notifications on completion (T144)
 * - Loading spinner (T145)
 */
export function AIAnalysisButton({
  rfp,
  responsesCount = 0,
  hasUnanalyzedResponses = false,
  onAnalysisStarted,
}: AIAnalysisButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showNotification, setShowNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const { mutate: triggerAnalysis, isPending: isAnalyzing } = useAnalyzeRFP();
  const { status: analysisStatus } = useAnalyzeStatus(rfp.id);

  // T140: Hide button if no unanalyzed responses
  if (!hasUnanalyzedResponses) {
    return null;
  }

  // T142: Check if analysis is already in progress
  const isAnalysisInProgress =
    analysisStatus?.status === "processing" || isAnalyzing;

  const handleAnalyze = () => {
    triggerAnalysis(rfp.id, {
      onSuccess: (data) => {
        setShowConfirmation(false);
        setShowNotification({
          type: "success",
          message: `Analysis started for ${data.total_responses} responses. This may take several minutes.`,
        });
        onAnalysisStarted?.();
        setTimeout(() => setShowNotification(null), 5000);
      },
      onError: (error) => {
        setShowConfirmation(false);
        setShowNotification({
          type: "error",
          message: `Failed to start analysis: ${error instanceof Error ? error.message : "Unknown error"}`,
        });
        setTimeout(() => setShowNotification(null), 5000);
      },
    });
  };

  return (
    <>
      {/* T139: Main button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setShowConfirmation(true)}
        disabled={isAnalysisInProgress}
        className="text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:text-purple-400 dark:hover:text-purple-300 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          isAnalysisInProgress ? "Analysis in progress..." : "Analyze with AI"
        }
      >
        {isAnalyzing || isAnalysisInProgress ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
          </>
        )}
      </Button>

      {/* T143: Processing status badge */}
      {analysisStatus?.status === "processing" && (
        <Badge
          variant="outline"
          className="ml-2 border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400 gap-1"
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Analyzing {analysisStatus.processedResponses}/
          {analysisStatus.totalResponses}
        </Badge>
      )}

      {analysisStatus?.status === "completed" && (
        <Badge
          variant="outline"
          className="ml-2 border-green-200 text-green-600 dark:border-green-800 dark:text-green-400 gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      )}

      {analysisStatus?.status === "failed" && (
        <Badge
          variant="outline"
          className="ml-2 border-red-200 text-red-600 dark:border-red-800 dark:text-red-400 gap-1"
        >
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      )}

      {/* T141: Confirmation dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Analyze Responses with AI</DialogTitle>
            <DialogDescription>
              This will analyze {responsesCount} responses. This may take
              several minutes depending on the size and complexity of the
              responses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                <strong>Note:</strong> The analysis will be performed in the
                background. You can continue working while the analysis
                completes.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmation(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* T144: Toast notification */}
      {showNotification && (
        <div
          className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-lg border ${
            showNotification.type === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-950/40 dark:border-green-800 dark:text-green-200"
              : "bg-red-50 border-red-200 text-red-800 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {showNotification.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{showNotification.message}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
