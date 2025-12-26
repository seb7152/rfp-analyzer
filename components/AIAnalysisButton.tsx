"use client";

import { useState, useEffect } from "react";
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
import { Loader2, Bot, CheckCircle2, AlertCircle } from "lucide-react";
import type { RFP } from "@/lib/supabase/types";
import type { RFPAccessLevel } from "@/types/user";
import { canUseAIFeatures } from "@/lib/permissions/ai-permissions";

interface AIAnalysisButtonProps {
  rfp: RFP;
  responsesCount?: number;
  hasUnanalyzedResponses?: boolean;
  userAccessLevel?: RFPAccessLevel;
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
  userAccessLevel,
  onAnalysisStarted,
}: AIAnalysisButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showNotification, setShowNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Initialize system prompt from RFP settings if available
  useEffect(() => {
    if (
      rfp.analysis_settings &&
      typeof rfp.analysis_settings === "object" &&
      "system_prompt" in rfp.analysis_settings
    ) {
      setSystemPrompt((rfp.analysis_settings as any).system_prompt || "");
    }
  }, [rfp.analysis_settings]);

  const { mutate: triggerAnalysis, isPending: isAnalyzing } = useAnalyzeRFP();
  const { status: analysisStatus } = useAnalyzeStatus(rfp.id);

  // Check if user can use AI features
  const hasAIAccess = canUseAIFeatures(userAccessLevel);

  // Hide if no AI access or no unanalyzed responses
  if (!hasAIAccess || !hasUnanalyzedResponses) {
    return null;
  }

  // T142: Check if analysis is already in progress
  const isAnalysisInProgress =
    analysisStatus?.status === "processing" || isAnalyzing;

  const handleAnalyze = () => {
    triggerAnalysis(
      { rfpId: rfp.id, systemPrompt },
      {
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
      }
    );
  };

  return (
    <>
      {/* T139: Main button */}
      <Button
        size="sm"
        onClick={() => setShowConfirmation(true)}
        disabled={isAnalysisInProgress}
        className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title={
          isAnalysisInProgress ? "Analysis in progress..." : "Analyze with AI"
        }
      >
        {isAnalyzing || isAnalysisInProgress ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Analyzing...
          </>
        ) : (
          <>
            <Bot className="h-4 w-4 mr-2" />
            AI Analysis
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Analyze Responses with AI</DialogTitle>
            <DialogDescription>
              This will analyze {responsesCount} responses. This may take
              several minutes depending on the size and complexity of the
              responses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label
                htmlFor="system-prompt"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Specific Instructions (System Prompt)
              </label>
              <textarea
                id="system-prompt"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describe the context, specific requests (e.g. output language), or format..."
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                These instructions will be sent to the AI to guide the analysis.
              </p>
            </div>

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
                  <Bot className="h-4 w-4 mr-2" />
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
