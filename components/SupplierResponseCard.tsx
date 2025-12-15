"use client";

import React from "react";
import {
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Copy,
  Zap,
  Clock,
  Check,
  Loader2,
  FileText,
  Maximize2,
  Sparkles,
} from "lucide-react";
import { SupplierBookmarks } from "@/components/SupplierBookmarks";
import type { PDFAnnotation } from "@/components/pdf/types/annotation.types";
import { ResponseFocusModal } from "@/components/ResponseFocusModal";
import { AudioRecorder } from "@/components/AudioRecorder";
import { TextEnhancer } from "@/components/TextEnhancer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoundCheckbox } from "@/components/ui/round-checkbox";
import { StatusSwitch } from "@/components/ui/status-switch";
import { StarRating } from "@/components/ui/star-rating";
import { useToast } from "@/hooks/use-toast";
import { useAnalyzeResponse } from "@/hooks/use-analyze-response";
import { cn } from "@/lib/utils";

export interface SupplierResponseCardProps {
  supplierId?: string;
  supplierName: string;
  responseId: string;
  responseText: string;
  aiScore: number;
  aiComment: string;
  status?: "pending" | "pass" | "partial" | "fail";
  isChecked?: boolean;
  manualScore?: number;
  manualComment?: string;
  questionText?: string;
  isSaving?: boolean;
  showSaved?: boolean;
  onStatusChange?: (status: "pending" | "pass" | "partial" | "fail") => void;
  onCheckChange?: (checked: boolean) => void;
  onScoreChange?: (score: number) => void;
  onCommentChange?: (comment: string) => void;
  onQuestionChange?: (question: string) => void;
  onCommentBlur?: () => void;
  onQuestionBlur?: () => void;
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  onOpenDocuments?: (supplierId: string) => void;
  collapsible?: boolean;
  hasDocuments?: boolean;
  requirementId?: string;
  requirementTitle?: string;
  requirementDescription?: string;
  supplierNames?: string[];
  onOpenBookmark?: (bookmark: PDFAnnotation) => void;
  rfpId?: string;
  onAICommentUpdate?: () => void;
}

export function SupplierResponseCard({
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
  onStatusChange,
  onCheckChange,
  onScoreChange,
  onCommentChange,
  onQuestionChange,
  onCommentBlur,
  onQuestionBlur,
  isExpanded = false,
  onExpandChange,
  onOpenDocuments,
  collapsible = true,
  hasDocuments,
  requirementId,
  requirementTitle = "",
  requirementDescription = "",
  supplierNames = [],
  onOpenBookmark,
  rfpId,
  onAICommentUpdate,
}: SupplierResponseCardProps) {
  const [isFocusModalOpen, setIsFocusModalOpen] = React.useState(false);
  const [localAIComment, setLocalAIComment] = React.useState(aiComment);
  const [localAIScore, setLocalAIScore] = React.useState(aiScore);
  const { toast } = useToast();
  const analyzeResponse = useAnalyzeResponse();
  const currentScore = manualScore ?? localAIScore;

  // Update local state when props change
  React.useEffect(() => {
    setLocalAIComment(aiComment);
    setLocalAIScore(aiScore);
  }, [aiComment, aiScore]);

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

      // Poll for updates with 4s interval and 15s timeout
      // N8N updates database asynchronously, so we need to poll
      const startTime = Date.now();
      const pollInterval = 4000; // 4 seconds
      const timeout = 15000; // 15 seconds
      const originalComment = localAIComment;

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
          return;
        }

        // Refetch data
        onAICommentUpdate?.();

        // Check if data was updated by comparing with original
        // If not updated yet, continue polling
        setTimeout(() => {
          // The parent will trigger a re-render if data changed
          // If comment is still the same after refetch, continue polling
          if (localAIComment === originalComment) {
            pollForUpdate();
          }
        }, pollInterval);
      };

      // Start polling after initial delay
      setTimeout(pollForUpdate, pollInterval);
    } catch (error) {
      toast({
        title: "Erreur",
        description:
          error instanceof Error ? error.message : "Erreur lors de l'analyse",
        variant: "destructive",
      });
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
    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      {/* Main row - Collapsed view */}
      <div className="flex items-center gap-4 p-4 bg-white dark:bg-slate-950">
        {/* Expand button with animation */}
        {/* Expand button with animation */}
        {collapsible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExpandChange?.(!isExpanded)}
            className="flex-shrink-0 transition-transform duration-200"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </Button>
        )}

        {/* Checkbox - left side */}
        <RoundCheckbox
          checked={isChecked}
          onChange={(checked) => onCheckChange?.(checked)}
        />

        {/* Supplier name with save indicator */}
        <div className="font-medium text-slate-900 dark:text-white text-sm flex-shrink-0 w-44 flex items-center gap-2">
          <span>{supplierName}</span>
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
        </div>

        {/* Response text excerpt (2-line preview) */}
        <div className="flex-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-xl">
          {responseText}
        </div>

        {/* Final score - prominently displayed with manual score (interactive stars) */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1 ml-auto">
          <StarRating
            score={currentScore}
            interactive={true}
            onScoreChange={onScoreChange}
            size="md"
            showLabel={true}
            isManual={manualScore !== undefined && manualScore !== null}
            allowHalfStars={true}
          />
          {/* Show which score is being displayed */}
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

        {/* Status badge - right side */}
        <div className="flex-shrink-0 w-40 flex justify-end">
          {getStatusBadge()}
        </div>
      </div>

      {/* Expanded details section */}
      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex gap-4 min-h-64">
            {/* Left: Response text (2/3 width) */}
            <div className="flex-1 flex flex-col basis-2/3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  Réponse complète
                  <div className="flex items-center gap-1">
                    {supplierId && onOpenDocuments && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasDocuments !== false) {
                            onOpenDocuments(supplierId);
                          }
                        }}
                        disabled={hasDocuments === false}
                        className={cn(
                          "h-6 w-6 p-0",
                          hasDocuments === false
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-slate-200 dark:hover:bg-slate-800"
                        )}
                        title={
                          hasDocuments === false
                            ? "Aucun document disponible"
                            : "Ouvrir les documents du fournisseur"
                        }
                      >
                        <FileText
                          className={cn(
                            "h-3.5 w-3.5",
                            hasDocuments === false
                              ? "text-slate-300 dark:text-slate-600"
                              : "text-slate-500 dark:text-slate-400"
                          )}
                        />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFocusModalOpen(true)}
                      className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-800"
                      title="Agrandir (Lecture & Édition)"
                    >
                      <Maximize2 className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    </Button>
                  </div>
                </div>
              </div>
              <textarea
                readOnly
                value={responseText}
                className="flex-1 px-3 py-2 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-700 dark:text-slate-300 resize"
              />
            </div>

            {/* Right: Status and AI comment (1/3 width) */}
            <div className="flex-1 basis-1/3 flex flex-col space-y-4">
              {/* Status switch */}
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                  Statut
                </div>
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

              {/* AI comment with copy and reanalyze buttons */}
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Commentaire IA
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(localAIComment);
                      }}
                      className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                      title="Copier le commentaire"
                    >
                      <Copy className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                      onClick={handleReanalyzeResponse}
                      disabled={analyzeResponse.isPending}
                      className={cn(
                        "p-1 rounded transition-colors relative",
                        analyzeResponse.isPending
                          ? "opacity-50 cursor-not-allowed"
                          : "hover:bg-slate-200 dark:hover:bg-slate-800"
                      )}
                      title="Relancer l'analyse IA"
                    >
                      {analyzeResponse.isPending ? (
                        <Loader2 className="w-3 h-3 text-slate-600 dark:text-slate-400 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
                <ScrollArea className="flex-1 rounded border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed p-3">
                    {localAIComment}
                  </p>
                </ScrollArea>
              </div>
            </div>
          </div>

          {/* Bottom: Reviewer comments (full width) */}
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Votre commentaire
                </span>
                {/* Character count indicator (only shown if > 500) */}
                {manualComment.length > 500 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {manualComment.length} caractères
                  </span>
                )}
              </div>
              <div className="relative">
                <Textarea
                  value={manualComment}
                  onChange={(e) => onCommentChange?.(e.target.value)}
                  onBlur={() => onCommentBlur?.()}
                  placeholder="Ajoutez vos observations..."
                  className="text-sm h-24 pr-10"
                />
                <div className="absolute bottom-2 right-2">
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
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Questions / Doutes
                </span>
                {/* Character count indicator (only shown if > 500) */}
                {questionText.length > 500 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {questionText.length} caractères
                  </span>
                )}
              </div>
              <div className="relative">
                <Textarea
                  value={questionText}
                  onChange={(e) => onQuestionChange?.(e.target.value)}
                  onBlur={() => onQuestionBlur?.()}
                  placeholder="Posez vos questions..."
                  className="text-sm h-24 pr-10"
                />
                <div className="absolute bottom-2 right-2">
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
          </div>

          {/* Bookmarks section - Lazy loaded */}
          {requirementId && supplierId && (
            <SupplierBookmarks
              requirementId={requirementId}
              supplierId={supplierId}
              onOpenBookmark={onOpenBookmark}
            />
          )}
        </div>
      )}
      {/* Focus Modal */}
      <ResponseFocusModal
        isOpen={isFocusModalOpen}
        onOpenChange={setIsFocusModalOpen}
        supplierName={supplierName}
        responseText={responseText}
        aiComment={aiComment}
        manualComment={manualComment}
        onCommentChange={onCommentChange}
        onCommentBlur={onCommentBlur}
        questionText={questionText}
        onQuestionChange={onQuestionChange}
        onQuestionBlur={onQuestionBlur}
      />
    </div>
  );
}
