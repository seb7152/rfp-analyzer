"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Zap,
  Clock,
  Check,
  Loader2,
  Copy,
  Sparkles,
  Map,
  MessageCircle,
  AlertOctagon,
} from "lucide-react";
import { AudioRecorder } from "@/components/AudioRecorder";
import { TextEnhancer } from "@/components/TextEnhancer";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RoundCheckbox } from "@/components/ui/round-checkbox";
import { StatusSwitch } from "@/components/ui/status-switch";
import { StarRating } from "@/components/ui/star-rating";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAnalyzeResponse } from "@/hooks/use-analyze-response";
import type { RFPAccessLevel } from "@/types/user";
import { canUseAIFeatures } from "@/lib/permissions/ai-permissions";

export interface MobileSupplierCardProps {
  supplierId?: string;
  supplierName: string;
  responseId?: string;
  responseText: string;
  aiScore: number;
  aiComment: string;
  status?: "pending" | "pass" | "partial" | "fail" | "roadmap";
  isChecked?: boolean;
  manualScore?: number;
  manualComment?: string;
  questionText?: string;
  isSaving?: boolean;
  showSaved?: boolean;
  userAccessLevel?: RFPAccessLevel;
  requirementTitle?: string;
  requirementDescription?: string;
  supplierNames?: string[];
  onStatusChange?: (
    status: "pending" | "pass" | "partial" | "fail" | "roadmap"
  ) => void;
  onCheckChange?: (checked: boolean) => void;
  onScoreChange?: (score: number) => void;
  onCommentChange?: (comment: string) => void;
  onQuestionChange?: (question: string) => void;
  onCommentBlur?: () => void;
  onQuestionBlur?: () => void;
  rfpId?: string;
  requirementId?: string;
  onAICommentUpdate?: () => void;
  threadCount?: number;
  openThreadCount?: number;
  hasBlockingThread?: boolean;
  onOpenThreadPanel?: () => void;
}

export function MobileSupplierCard({
  supplierId,
  supplierName,
  responseId: _responseId,
  responseText,
  aiScore,
  aiComment,
  status = "pending",
  isChecked = false,
  manualScore,
  manualComment = "",
  questionText = "",
  isSaving = false,
  showSaved = false,
  userAccessLevel,
  requirementTitle = "",
  requirementDescription = "",
  supplierNames = [],
  onStatusChange,
  onCheckChange,
  onScoreChange,
  onCommentChange,
  onQuestionChange,
  onCommentBlur,
  onQuestionBlur,
  rfpId,
  requirementId,
  onAICommentUpdate,
  threadCount = 0,
  openThreadCount = 0,
  hasBlockingThread = false,
  onOpenThreadPanel,
}: MobileSupplierCardProps) {
  const [commentTab, setCommentTab] = useState<"manual" | "ai">("manual");
  const [localAIComment, setLocalAIComment] = useState(aiComment);
  const [localAIScore, setLocalAIScore] = useState(aiScore);
  const [isPolling, setIsPolling] = useState(false);
  const { toast } = useToast();
  const analyzeResponse = useAnalyzeResponse();
  const currentScore = manualScore ?? localAIScore;
  const pollingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const originalCommentRef = React.useRef<string | null>(null);
  const hasAIAccess = canUseAIFeatures(userAccessLevel);

  // Update local state when props change
  React.useEffect(() => {
    setLocalAIComment(aiComment);
    setLocalAIScore(aiScore);

    // Stop polling if aiComment changed while polling
    if (
      isPolling &&
      originalCommentRef.current !== null &&
      aiComment !== originalCommentRef.current
    ) {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      setIsPolling(false);
      originalCommentRef.current = null;
    }
  }, [aiComment, aiScore, isPolling]);

  // Cleanup polling on unmount
  React.useEffect(() => {
    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  const handleReanalyzeResponse = async () => {
    if (!rfpId || !requirementId || !supplierId) {
      toast({
        title: "Erreur",
        description: "Données manquantes pour l'analyse",
        variant: "destructive",
      });
      return;
    }

    try {
      // Clear any existing polling
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }

      await analyzeResponse.mutateAsync({
        rfpId,
        requirementId,
        supplierId,
        responseText,
      });

      toast({
        title: "Succès",
        description: "Analyse IA en cours...",
      });

      // Start polling - track original comment
      originalCommentRef.current = aiComment;
      setIsPolling(true);

      // Poll for updates with 4s interval and 15s timeout
      // N8N updates database asynchronously, so we need to poll
      const startTime = Date.now();
      const pollInterval = 4000; // 4 seconds
      const timeout = 15000; // 15 seconds

      const pollForUpdate = () => {
        const elapsed = Date.now() - startTime;

        if (elapsed >= timeout) {
          // Timeout reached - stop polling
          toast({
            title: "Timeout",
            description:
              "L'analyse prend plus de temps que prévu. Rafraîchissez la page pour voir les résultats.",
            variant: "destructive",
          });
          pollingTimeoutRef.current = null;
          setIsPolling(false);
          originalCommentRef.current = null;
          return;
        }

        // Refetch data
        onAICommentUpdate?.();

        // Continue polling - useEffect will stop it when aiComment changes
        pollingTimeoutRef.current = setTimeout(pollForUpdate, pollInterval);
      };

      // Start polling after initial delay
      pollingTimeoutRef.current = setTimeout(pollForUpdate, pollInterval);
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Erreur lors de l'analyse",
        variant: "destructive",
      });
      setIsPolling(false);
      originalCommentRef.current = null;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case "pass":
        return (
          <Badge className="bg-green-500 px-3 py-1.5">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Conforme
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-blue-500 px-3 py-1.5">
            <Zap className="w-4 h-4 mr-1.5" />
            Partiel
          </Badge>
        );
      case "fail":
        return (
          <Badge className="bg-red-500 px-3 py-1.5">
            <AlertCircle className="w-4 h-4 mr-1.5" />
            Non conforme
          </Badge>
        );
      case "roadmap":
        return (
          <Badge className="bg-purple-500 px-3 py-1.5 text-white">
            <Map className="w-4 h-4 mr-1.5" />
            Roadmap
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="px-3 py-1.5">
            <Clock className="w-4 h-4 mr-1.5" />
            Attente
          </Badge>
        );
    }
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-950">
      {/* Header with supplier name, save indicator and checkbox */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <RoundCheckbox
            checked={isChecked}
            onChange={(checked) => onCheckChange?.(checked)}
          />
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span>{supplierName}</span>
            {onOpenThreadPanel && (
              <button
                onClick={onOpenThreadPanel}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium transition-colors ${
                  hasBlockingThread
                    ? "text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900"
                    : openThreadCount > 0
                      ? "text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900"
                      : threadCount > 0
                        ? "text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
                        : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800"
                }`}
                title={
                  openThreadCount > 0
                    ? `${openThreadCount} point${openThreadCount > 1 ? "s" : ""} ouvert${openThreadCount > 1 ? "s" : ""}${hasBlockingThread ? " (bloquant)" : ""}`
                    : threadCount > 0
                      ? `${threadCount} point${threadCount > 1 ? "s" : ""} (tous résolus)`
                      : "Ouvrir une discussion"
                }
              >
                {hasBlockingThread ? <AlertOctagon size={14} /> : <MessageCircle size={14} />}
                {threadCount > 0 && (
                  <span>{openThreadCount > 0 ? openThreadCount : threadCount}</span>
                )}
              </button>
            )}
            {/* Save status indicator */}
            {isSaving && (
              <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              </span>
            )}
            {showSaved && !isSaving && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 animate-in fade-in zoom-in-95 duration-200">
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
            )}
          </h3>
        </div>
        {getStatusBadge()}
      </div>

      {/* Status section */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex justify-center">
          <StatusSwitch
            value={status}
            onChange={(newStatus) => {
              onStatusChange?.(newStatus);
              // Auto-check when status is set
              if (newStatus !== "pending") {
                onCheckChange?.(true);
              }
            }}
          />
        </div>
      </div>

      {/* Score section */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-col items-center gap-2">
          <StarRating
            score={currentScore}
            interactive={true}
            onScoreChange={onScoreChange}
            size="lg"
            showLabel={true}
            isManual={manualScore !== undefined && manualScore !== null}
            allowHalfStars={true}
          />
          {manualScore !== undefined && manualScore !== null ? (
            <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
              Score manuel
            </span>
          ) : (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Score IA: {aiScore}/5
            </span>
          )}
        </div>
      </div>

      {/* Response section */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800">
        <div className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
          Réponse du fournisseur
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 max-h-48 overflow-y-auto">
          <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
            {responseText}
          </p>
        </div>
      </div>

      {/* Comments section with tabs */}
      <div className="p-4">
        <Tabs
          value={commentTab}
          onValueChange={(v) => setCommentTab(v as "manual" | "ai")}
        >
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="manual">Votre commentaire</TabsTrigger>
            <TabsTrigger value="ai">Commentaire IA</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-4 mt-0">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Votre commentaire
              </div>
              <div className="relative">
                <Textarea
                  value={manualComment}
                  onChange={(e) => onCommentChange?.(e.target.value)}
                  onBlur={() => onCommentBlur?.()}
                  placeholder="Ajoutez vos observations..."
                  className="min-h-32 pr-12"
                />
                <div className="absolute bottom-3 right-3 z-10">
                  {!manualComment.trim() ? (
                    <AudioRecorder
                      onTranscriptionComplete={(text) => {
                        onCommentChange?.(text);
                        setTimeout(() => {
                          onCommentBlur?.();
                        }, 100);
                      }}
                    />
                  ) : (
                    <TextEnhancer
                      currentText={manualComment}
                      responseText={responseText}
                      requirementText={`${requirementTitle}\n\n${requirementDescription}`}
                      supplierName={supplierName}
                      supplierNames={supplierNames}
                      userAccessLevel={userAccessLevel}
                      onEnhancementComplete={(enhancedText) => {
                        onCommentChange?.(enhancedText);
                        setTimeout(() => {
                          onCommentBlur?.();
                        }, 100);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Questions / Doutes
              </div>
              <div className="relative">
                <Textarea
                  value={questionText}
                  onChange={(e) => onQuestionChange?.(e.target.value)}
                  onBlur={() => onQuestionBlur?.()}
                  placeholder="Posez vos questions..."
                  className="min-h-24 pr-12"
                />
                <div className="absolute bottom-3 right-3 z-10">
                  {!questionText.trim() ? (
                    <AudioRecorder
                      onTranscriptionComplete={(text) => {
                        onQuestionChange?.(text);
                        setTimeout(() => {
                          onQuestionBlur?.();
                        }, 100);
                      }}
                    />
                  ) : (
                    <TextEnhancer
                      currentText={questionText}
                      responseText={responseText}
                      requirementText={`${requirementTitle}\n\n${requirementDescription}`}
                      supplierName={supplierName}
                      supplierNames={supplierNames}
                      userAccessLevel={userAccessLevel}
                      onEnhancementComplete={(enhancedText) => {
                        onQuestionChange?.(enhancedText);
                        setTimeout(() => {
                          onQuestionBlur?.();
                        }, 100);
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai" className="mt-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                Analyse IA
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(localAIComment);
                  }}
                  className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                  title="Copier le commentaire IA"
                >
                  <Copy className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </button>
                {hasAIAccess && (
                  <button
                    onClick={handleReanalyzeResponse}
                    disabled={analyzeResponse.isPending}
                    className={`p-1.5 rounded transition-colors ${
                      analyzeResponse.isPending
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-slate-200 dark:hover:bg-slate-800"
                    }`}
                    title="Relancer l'analyse IA"
                  >
                    {analyzeResponse.isPending ? (
                      <Loader2 className="w-4 h-4 text-slate-600 dark:text-slate-400 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 max-h-64 overflow-y-auto">
              <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                {localAIComment}
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
