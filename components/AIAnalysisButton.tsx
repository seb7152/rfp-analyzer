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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Bot, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import type { RFP } from "@/lib/supabase/types";
import type { RFPAccessLevel } from "@/types/user";
import { canUseAIFeatures } from "@/lib/permissions/ai-permissions";

interface SupplierOption {
  id: string;
  name: string;
}

interface AIAnalysisButtonProps {
  rfp: RFP;
  responsesCount?: number;
  hasUnanalyzedResponses?: boolean;
  userAccessLevel?: RFPAccessLevel;
  onAnalysisStarted?: () => void;
  compact?: boolean;
  suppliers?: SupplierOption[];
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
  compact = false,
  suppliers = [],
}: AIAnalysisButtonProps) {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  // "all" or a specific supplier id — only used in restart mode
  const [supplierTarget, setSupplierTarget] = useState<"all" | string>("all");
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

  // T142: Check if analysis is already in progress
  const isAnalysisInProgress =
    analysisStatus?.status === "processing" || isAnalyzing;

  // Show restart button when a previous analysis exists, even if completion = 100%
  const hasBeenAnalyzed = !!analysisStatus?.status;

  // Hide if no AI access, or no responses to analyse and never been analysed
  if (!hasAIAccess || (!hasUnanalyzedResponses && !hasBeenAnalyzed)) {
    return null;
  }

  // Restart mode: all responses are manually reviewed but user wants to re-run AI
  const isRestartMode = !hasUnanalyzedResponses && hasBeenAnalyzed;

  const handleAnalyze = () => {
    const supplierId =
      isRestartMode && supplierTarget !== "all" ? supplierTarget : undefined;
    triggerAnalysis(
      { rfpId: rfp.id, systemPrompt, supplierId },
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
        className={`bg-purple-600 hover:bg-purple-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${compact ? "h-8 w-8 p-0" : ""}`}
        title={
          isAnalysisInProgress
            ? "Analysis in progress..."
            : isRestartMode
            ? "Restart AI Analysis"
            : "Analyze with AI"
        }
      >
        {isAnalyzing || isAnalysisInProgress ? (
          compact ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Analyzing...
            </>
          )
        ) : isRestartMode ? (
          compact ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Restart Analysis
            </>
          )
        ) : compact ? (
          <Bot className="h-4 w-4" />
        ) : (
          <>
            <Bot className="h-4 w-4 mr-2" />
            AI Analysis
          </>
        )}
      </Button>

      {/* T143: Processing status badge */}
      {!compact && analysisStatus?.status === "processing" && (
        <Badge
          variant="outline"
          className="ml-2 border-purple-200 text-purple-600 dark:border-purple-800 dark:text-purple-400 gap-1"
        >
          <Loader2 className="h-3 w-3 animate-spin" />
          Analyzing {analysisStatus.processedResponses}/
          {analysisStatus.totalResponses}
        </Badge>
      )}

      {!compact && analysisStatus?.status === "completed" && (
        <Badge
          variant="outline"
          className="ml-2 border-green-200 text-green-600 dark:border-green-800 dark:text-green-400 gap-1"
        >
          <CheckCircle2 className="h-3 w-3" />
          Completed
        </Badge>
      )}

      {!compact && analysisStatus?.status === "failed" && (
        <Badge
          variant="outline"
          className="ml-2 border-red-200 text-red-600 dark:border-red-800 dark:text-red-400 gap-1"
        >
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      )}

      {/* T141: Confirmation dialog */}
      <Dialog
        open={showConfirmation}
        onOpenChange={(open) => {
          setShowConfirmation(open);
          if (!open) setSupplierTarget("all");
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {isRestartMode
                ? "Restart AI Analysis"
                : "Analyze Responses with AI"}
            </DialogTitle>
            <DialogDescription>
              {isRestartMode ? (
                <>
                  This will re-analyze {responsesCount} responses. Previous AI
                  scores and comments will be overwritten.
                </>
              ) : (
                <>
                  This will analyze {responsesCount} responses. This may take
                  several minutes depending on the size and complexity of the
                  responses.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Supplier selection — restart mode only */}
            {isRestartMode && suppliers.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none">
                  Scope
                </label>
                <Select
                  value={supplierTarget}
                  onValueChange={(v) => setSupplierTarget(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select scope..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All suppliers</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {supplierTarget !== "all" && (
                  <p className="text-xs text-muted-foreground">
                    Only this supplier&apos;s responses will be re-analyzed.
                    Other suppliers&apos; scores remain unchanged.
                  </p>
                )}
              </div>
            )}

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
              ) : isRestartMode ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Restart Analysis
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
