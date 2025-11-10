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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RoundCheckbox } from "@/components/ui/round-checkbox";
import { StatusSwitch } from "@/components/ui/status-switch";
import { StarRating } from "@/components/ui/star-rating";

export interface SupplierResponseCardProps {
  supplierId: string;
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
}

export function SupplierResponseCard({
  supplierId,
  supplierName,
  responseId,
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
}: SupplierResponseCardProps) {
  const currentScore = manualScore ?? aiScore;

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

        {/* Checkbox - left side */}
        <RoundCheckbox
          checked={isChecked}
          onChange={(checked) => onCheckChange?.(checked)}
        />

        {/* Supplier name */}
        <div className="font-medium text-slate-900 dark:text-white text-sm flex-shrink-0 w-44">
          {supplierName}
        </div>

        {/* Response text excerpt (2-line preview) */}
        <div className="flex-1 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 max-w-xl">
          {responseText}
        </div>

        {/* Final score - prominently displayed with manual score (interactive stars) */}
        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          <StarRating
            score={currentScore}
            interactive={true}
            onScoreChange={onScoreChange}
            size="md"
            showLabel={true}
            isManual={manualScore !== undefined && manualScore !== null}
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
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Réponse complète
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

              {/* AI comment with copy button */}
              <div className="flex flex-col flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    Commentaire IA
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(aiComment);
                    }}
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors"
                    title="Copier le commentaire"
                  >
                    <Copy className="w-3 h-3 text-slate-600 dark:text-slate-400" />
                  </button>
                </div>
                <ScrollArea className="flex-1 rounded border border-slate-200 dark:border-slate-700">
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed p-3">
                    {aiComment}
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
                {/* Save status indicator */}
                {isSaving && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Enregistrement...
                  </span>
                )}
                {showSaved && !isSaving && (
                  <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 animate-in fade-in duration-200">
                    <Check className="w-3 h-3" />
                    Enregistré
                  </span>
                )}
              </div>
              <Textarea
                value={manualComment}
                onChange={(e) => onCommentChange?.(e.target.value)}
                onBlur={() => onCommentBlur?.()}
                placeholder="Ajoutez vos observations..."
                className="text-sm h-24"
              />
            </div>

            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                Questions / Doutes
              </div>
              <Textarea
                value={questionText}
                onChange={(e) => onQuestionChange?.(e.target.value)}
                onBlur={() => onQuestionBlur?.()}
                placeholder="Posez vos questions..."
                className="text-sm h-24"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
