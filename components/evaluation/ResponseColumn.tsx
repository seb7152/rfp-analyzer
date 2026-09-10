"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  MessageSquare,
  Sparkles,
  Loader2,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Check,
  Undo2,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScoreControl } from "@/components/evaluation/ScoreControl";
import { StatusStamp } from "@/components/evaluation/StatusStamp";
import { AudioRecorder } from "@/components/AudioRecorder";
import { TextEnhancer } from "@/components/TextEnhancer";
import { ResponseFocusModal } from "@/components/ResponseFocusModal";
import type { ResponseWithSupplier } from "@/hooks/use-responses";
import type { PDFAnnotation } from "@/components/pdf/types/annotation.types";
import { useAnalyzeResponse } from "@/hooks/use-analyze-response";
import { canUseAIFeatures } from "@/lib/permissions/ai-permissions";
import type { RFPAccessLevel } from "@/types/user";
import { finalScore, STATUS_META, STATUS_ORDER, type ResponseStatus } from "@/lib/scoring";
import { formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ResponseColumnProps {
  rfpId: string;
  response: ResponseWithSupplier;
  requirement: { id: string; title: string; description: string };
  supplierNames: string[];
  access: RFPAccessLevel;
  canEdit: boolean;
  bookmarks: PDFAnnotation[];
  threadStats: { total: number; open: number; hasBlocking: boolean };
  isSaving: boolean;
  onScore: (score: number) => void;
  onResetScore: () => void;
  onConfirm: () => void;
  onUncheck: () => void;
  onStatus: (status: ResponseStatus) => void;
  onComment: (text: string) => void;
  onQuestion: (text: string) => void;
  onOpenDocuments: (supplierId: string) => void;
  onOpenBookmark: (bookmark: PDFAnnotation) => void;
  onOpenThreads: () => void;
  layout: "column" | "card";
}

function ClampedText({
  text,
  lines,
  empty,
}: {
  text: string | null;
  lines: number;
  empty: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  const [overflows, setOverflows] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);
  if (!text || !text.trim()) {
    return <p className="text-sm italic text-muted-foreground">{empty}</p>;
  }
  return (
    <div>
      <p
        ref={ref}
        className={cn("whitespace-pre-wrap text-sm leading-[18px] text-foreground")}
        style={
          open
            ? undefined
            : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }
        }
      >
        {text}
      </p>
      {(overflows || open) && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-1 inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {open ? "Réduire" : "Lire la suite"}
        </button>
      )}
    </div>
  );
}

/**
 * One supplier's answer to the selected requirement: the text, the AI's
 * proposal, the expert's one gesture, the proof one click away.
 */
export function ResponseColumn({
  rfpId,
  response,
  requirement,
  supplierNames,
  access,
  canEdit,
  bookmarks,
  threadStats,
  isSaving,
  onScore,
  onResetScore,
  onConfirm,
  onUncheck,
  onStatus,
  onComment,
  onQuestion,
  onOpenDocuments,
  onOpenBookmark,
  onOpenThreads,
  layout,
}: ResponseColumnProps) {
  const queryClient = useQueryClient();
  const analyze = useAnalyzeResponse();
  const hasAI = canUseAIFeatures(access);
  const [comment, setComment] = useState(response.manual_comment ?? "");
  const [question, setQuestion] = useState(response.question ?? "");
  const [showNotes, setShowNotes] = useState(
    !!(response.manual_comment?.trim() || response.question?.trim())
  );
  const [focusOpen, setFocusOpen] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const aiCommentAtStart = useRef<string | null>(null);

  useEffect(() => {
    setComment(response.manual_comment ?? "");
    setQuestion(response.question ?? "");
  }, [response.id, response.manual_comment, response.question]);

  // Re-analysis is asynchronous: refetch until the AI comment changes.
  useEffect(() => {
    if (!reanalyzing) return;
    if (aiCommentAtStart.current !== null && response.ai_comment !== aiCommentAtStart.current) {
      setReanalyzing(false);
      aiCommentAtStart.current = null;
      toast.success(`${response.supplier.name} : nouvelle analyse disponible.`);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      if (Date.now() - started > 90_000) {
        window.clearInterval(id);
        setReanalyzing(false);
        toast.error("L'analyse prend plus de temps que prévu. Elle apparaîtra au prochain chargement.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["responses", rfpId, requirement.id] });
    }, 4000);
    return () => window.clearInterval(id);
  }, [reanalyzing, response.ai_comment, response.supplier.name, queryClient, rfpId, requirement.id]);

  const handleReanalyze = async () => {
    try {
      aiCommentAtStart.current = response.ai_comment;
      setReanalyzing(true);
      await analyze.mutateAsync({
        rfpId,
        requirementId: requirement.id,
        supplierId: response.supplier_id,
        responseText: response.response_text ?? "",
      });
    } catch (err) {
      setReanalyzing(false);
      toast.error(err instanceof Error ? err.message : "L'analyse n'a pas démarré.");
    }
  };

  const score = finalScore(response);
  const isManual = response.manual_score !== null;
  const status = (response.status ?? "pending") as ResponseStatus;
  const checked = response.is_checked;
  const noDocs = response.supplier.has_documents === false;

  return (
    <article
      aria-label={response.supplier.name}
      data-checked={checked}
      className={cn(
        "flex min-w-0 flex-col bg-background",
        layout === "column" ? "border-r border-border last:border-r-0" : "border-b border-border"
      )}
    >
      {/* En-tête : fournisseur, note, tampon */}
      <header className="flex items-center gap-2 border-b border-border px-3 py-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{response.supplier.name}</h3>
        <span
          className={cn("tnum text-lg font-semibold leading-none", score === null && "text-muted-foreground")}
          aria-label={`Note ${formatScore(score)} sur 5${isManual ? ", manuelle" : ", IA"}`}
        >
          {formatScore(score)}
          <span className="text-xs font-normal text-muted-foreground">/5</span>
        </span>
        {canEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label={`Statut : ${STATUS_META[status].label}. Modifier`} className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <StatusStamp status={status} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {STATUS_ORDER.filter((s) => s !== "pending").map((s) => (
                <DropdownMenuItem key={s} onSelect={() => onStatus(s)} className="gap-2">
                  <StatusStamp status={s} />
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <StatusStamp status={status} />
        )}
      </header>

      {/* Réponse */}
      <div className="flex-1 space-y-3 px-3 py-3">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Réponse</span>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="xs"
                mode="icon"
                aria-label="Ouvrir les documents du fournisseur"
                title={noDocs ? "Aucun document déposé" : "Ouvrir les documents"}
                disabled={noDocs}
                onClick={() => onOpenDocuments(response.supplier_id)}
              >
                <FileText className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="xs" mode="icon" aria-label="Agrandir" onClick={() => setFocusOpen(true)}>
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <ClampedText text={response.response_text} lines={8} empty="Aucune réponse fournie." />
        </div>

        {bookmarks.length > 0 && (
          <ul className="space-y-1" aria-label="Preuves dans le document">
            {bookmarks.map((b) => (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={() => onOpenBookmark(b)}
                  className="group flex w-full items-start gap-1.5 rounded-sm text-left text-xs text-accent-foreground hover:underline underline-offset-2"
                >
                  <Bookmark className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="min-w-0">
                    <span className="font-medium">
                      {(b as PDFAnnotation & { documentName?: string }).documentName ?? "Document"} · p. {b.pageNumber}
                    </span>
                    {b.highlightedText && (
                      <span className="block truncate text-muted-foreground group-hover:text-foreground">
                        « {b.highlightedText} »
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Analyse IA {response.ai_score !== null && <span className="tnum">· {formatScore(response.ai_score)}/5</span>}
            </span>
            {hasAI && (
              <Button
                variant="ghost"
                size="xs"
                className="h-6 gap-1 px-1.5 text-xs"
                disabled={reanalyzing || !response.response_text}
                onClick={handleReanalyze}
              >
                {reanalyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {reanalyzing ? "Analyse" : "Réanalyser"}
              </Button>
            )}
          </div>
          <ClampedText text={response.ai_comment} lines={5} empty="Pas encore d'analyse IA." />
        </div>
      </div>

      {/* Le geste */}
      <footer className="space-y-2 border-t border-border bg-secondary/40 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <ScoreControl
            value={score}
            isManual={isManual}
            aiScore={response.ai_score}
            disabled={!canEdit}
            onChange={onScore}
            onReset={onResetScore}
            size="sm"
          />
          {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-label="Enregistrement" />}
        </div>
        <div className="flex items-center gap-1.5">
          {canEdit && !checked && (
            <Button size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onConfirm} disabled={score === null && status === "pending"}>
              <Check className="h-3.5 w-3.5" />
              {score === null ? "Statuer" : "Valider"}
            </Button>
          )}
          {checked && (
            <span className="inline-flex items-center gap-1 text-xs text-status-pass">
              <Check className="h-3.5 w-3.5" />
              Évaluée
              {canEdit && (
                <button type="button" onClick={onUncheck} className="ml-1 inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground" title="Remettre à évaluer">
                  <Undo2 className="h-3 w-3" />
                </button>
              )}
            </span>
          )}
          <div className="ml-auto flex items-center gap-0.5">
            <Button
              variant="ghost"
              size="xs"
              className={cn("h-7 gap-1 px-1.5 text-xs", threadStats.hasBlocking && "text-status-fail")}
              onClick={onOpenThreads}
              aria-label={threadStats.total > 0 ? `${threadStats.open} discussions ouvertes` : "Ouvrir une discussion"}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {threadStats.total > 0 && <span className="tnum">{threadStats.open}</span>}
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="h-7 px-1.5 text-xs"
              aria-expanded={showNotes}
              onClick={() => setShowNotes((v) => !v)}
            >
              {showNotes ? "Masquer" : "Commenter"}
            </Button>
          </div>
        </div>

        {showNotes && (
          <div className="space-y-2 pt-1">
            <div className="relative">
              <Textarea
                aria-label="Commentaire"
                placeholder="Commentaire"
                value={comment}
                disabled={!canEdit}
                onChange={(e) => setComment(e.target.value)}
                onBlur={() => {
                  if (comment !== (response.manual_comment ?? "")) onComment(comment);
                }}
                className="min-h-[56px] pr-9 text-sm"
              />
              {canEdit && (
                <div className="absolute bottom-1.5 right-1.5">
                  {!comment.trim() ? (
                    <AudioRecorder onTranscriptionComplete={(t) => { setComment(t); onComment(t); }} />
                  ) : (
                    <TextEnhancer
                      currentText={comment}
                      responseText={response.response_text ?? ""}
                      requirementText={`${requirement.title}\n\n${requirement.description}`}
                      supplierName={response.supplier.name}
                      supplierNames={supplierNames}
                      userAccessLevel={access}
                      onEnhancementComplete={(t) => { setComment(t); onComment(t); }}
                    />
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <Textarea
                aria-label="Question au fournisseur"
                placeholder="Question au fournisseur"
                value={question}
                disabled={!canEdit}
                onChange={(e) => setQuestion(e.target.value)}
                onBlur={() => {
                  if (question !== (response.question ?? "")) onQuestion(question);
                }}
                className="min-h-[56px] pr-9 text-sm"
              />
              {canEdit && (
                <div className="absolute bottom-1.5 right-1.5">
                  {!question.trim() ? (
                    <AudioRecorder onTranscriptionComplete={(t) => { setQuestion(t); onQuestion(t); }} />
                  ) : (
                    <TextEnhancer
                      currentText={question}
                      responseText={response.response_text ?? ""}
                      requirementText={`${requirement.title}\n\n${requirement.description}`}
                      supplierName={response.supplier.name}
                      supplierNames={supplierNames}
                      userAccessLevel={access}
                      onEnhancementComplete={(t) => { setQuestion(t); onQuestion(t); }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </footer>

      <ResponseFocusModal
        isOpen={focusOpen}
        onOpenChange={setFocusOpen}
        supplierName={response.supplier.name}
        responseText={response.response_text ?? ""}
        aiComment={response.ai_comment ?? ""}
        manualComment={comment}
        onCommentChange={setComment}
        onCommentBlur={() => { if (comment !== (response.manual_comment ?? "")) onComment(comment); }}
        questionText={question}
        onQuestionChange={setQuestion}
        onQuestionBlur={() => { if (question !== (response.question ?? "")) onQuestion(question); }}
      />
    </article>
  );
}
