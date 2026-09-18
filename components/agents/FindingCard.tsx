"use client";

import { useState } from "react";
import { AlertTriangle, Bot, Calculator, Check, ChevronDown, ChevronRight, Globe, Mic, Quote, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { VERDICT_LABEL, type AgentFindingWithAgent } from "@/lib/agents/types";
import { formatDateTime, formatScore } from "@/lib/format";
import { cn } from "@/lib/utils";

const VERDICT_STAMP: Record<string, string> = {
  conforme: "stamp-pass",
  partiel: "stamp-partial",
  non_conforme: "stamp-fail",
  non_repondu: "stamp-pending",
  hors_sujet: "stamp-fail",
};

/**
 * An agent's proposal on one answer: verdict, proposed score next to the
 * current AI score, justification, quotes that highlight the passage in the
 * answer, questions, risks, Accept / Reject. Unsourced proposals are marked;
 * a rejected proposal folds but stays readable.
 */
export function FindingCard({
  finding,
  currentAiScore,
  canDecide,
  disabledReason,
  activeQuote,
  onQuote,
  onAccept,
  onReject,
  pending,
}: {
  finding: AgentFindingWithAgent;
  currentAiScore: number | null;
  canDecide: boolean;
  disabledReason?: string | null;
  activeQuote: string | null;
  onQuote: (quote: string | null) => void;
  onAccept: () => void;
  onReject: (reason: string) => void;
  pending: boolean;
}) {
  const decided = finding.status !== "proposed";
  const [open, setOpen] = useState(!decided);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const fromSoutenance = finding.run_kind === "soutenance";
  // A séance proposal's quotes come from the transcript: shown with their
  // time and voice, never searched in the written answer.
  const verifiedQuotes = fromSoutenance ? [] : finding.quotes.filter((q) => q.verified);
  const missingQuotes = fromSoutenance ? [] : finding.quotes.filter((q) => !q.verified);
  const transcriptEvidence = finding.evidence.filter((e): e is Extract<typeof e, { type: "transcript" }> => e.type === "transcript");

  return (
    <section
      aria-label={`Proposition de l'agent ${finding.agent.name}`}
      className={cn("rounded-md border border-border bg-background text-sm", decided && "border-dashed")}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        {fromSoutenance ? <Mic className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <Bot className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-muted-foreground">
          {fromSoutenance ? "Proposition issue de la soutenance" : `Proposition de l'agent ${finding.agent.name}`}
          {!fromSoutenance && <span className="num font-normal"> v{finding.agent.version_number}</span>}
        </span>
        {finding.status === "accepted" && (
          <span className="stamp stamp-pass">{fromSoutenance ? "Reprise" : "Acceptée"}</span>
        )}
        {finding.status === "rejected" && (
          <span className="stamp stamp-pending">{fromSoutenance ? "Écartée" : "Rejetée"}</span>
        )}
        {!finding.sourced && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-status-partial" title={fromSoutenance ? "Aucun extrait cité n'a été retrouvé mot pour mot dans le transcript" : "Aucun extrait cité n'a été retrouvé mot pour mot dans la réponse"}>
            <AlertTriangle className="h-3.5 w-3.5" />
            Non sourcée
          </span>
        )}
      </button>

      {open && (
        <div className="space-y-2.5 border-t border-border px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("stamp", VERDICT_STAMP[finding.verdict])}>{VERDICT_LABEL[finding.verdict]}</span>
            <span className="text-xs text-muted-foreground">
              Note proposée <span className="num text-sm font-semibold text-foreground">{formatScore(finding.proposed_score)}</span>
              <span className="num">/5</span>
              {currentAiScore !== null && (
                <>
                  {" "}· IA actuelle <span className="num">{formatScore(currentAiScore)}</span>
                </>
              )}
            </span>
          </div>

          {finding.justification && <p className="whitespace-pre-wrap text-sm leading-[19px]">{finding.justification}</p>}

          {!finding.sourced && finding.verdict !== "non_repondu" && (
            <p className="rounded-sm border border-status-partial/40 bg-status-partial-soft px-2 py-1.5 text-xs text-status-partial">
              Non sourcée : aucun extrait n&apos;a été retrouvé mot pour mot dans {fromSoutenance ? "le transcript" : "la réponse"}. À vérifier avant {fromSoutenance ? "de reprendre" : "d'accepter"}.
            </p>
          )}

          {transcriptEvidence.length > 0 && (
            <ul className="space-y-1" aria-label="Extraits du transcript">
              {transcriptEvidence.map((e, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs">
                  <Quote className={cn("mt-0.5 h-3 w-3 shrink-0", e.verified ? "text-accent-foreground" : "text-status-partial")} />
                  <span className={cn("min-w-0", e.verified ? "text-accent-foreground" : "text-muted-foreground line-through decoration-status-partial/60")}>« {e.text} »</span>
                  <span className="num shrink-0 text-muted-foreground">
                    {e.at ?? ""}
                    {e.voice ? ` · ${e.voice}` : ""}
                  </span>
                  {!e.verified && <span className="shrink-0 text-status-partial">non retrouvé</span>}
                </li>
              ))}
            </ul>
          )}

          {verifiedQuotes.length > 0 && (
            <ul className="space-y-1" aria-label="Extraits de la réponse">
              {verifiedQuotes.map((q, i) => {
                const active = activeQuote === q.text;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => onQuote(active ? null : q.text)}
                      aria-pressed={active}
                      className={cn(
                        "flex w-full items-start gap-1.5 rounded-sm text-left text-xs transition-colors duration-150 hover:underline underline-offset-2",
                        active ? "text-primary" : "text-accent-foreground"
                      )}
                    >
                      <Quote className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="min-w-0">« {q.text} »</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {missingQuotes.length > 0 && (
            <ul className="space-y-1" aria-label="Extraits non retrouvés">
              {missingQuotes.map((q, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-status-partial" />
                  <span className="min-w-0 line-through decoration-status-partial/60">« {q.text} »</span>
                  <span className="shrink-0 text-status-partial">non retrouvé</span>
                </li>
              ))}
            </ul>
          )}

          {finding.evidence.some((e) => e.type === "calcul") && (
            <ul className="space-y-1" aria-label="Calculs">
              {finding.evidence
                .filter((e): e is Extract<typeof e, { type: "calcul" }> => e.type === "calcul")
                .map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <Calculator className={cn("mt-0.5 h-3 w-3 shrink-0", e.verified ? "text-muted-foreground" : "text-status-partial")} />
                    <span className="num min-w-0">
                      {e.expression} = <span className="font-semibold">{e.result}</span>
                    </span>
                    {!e.verified && <span className="shrink-0 text-status-partial">non vérifié</span>}
                  </li>
                ))}
            </ul>
          )}
          {finding.evidence.some((e) => e.type === "url") && (
            <ul className="space-y-1" aria-label="Sources web">
              {finding.evidence
                .filter((e): e is Extract<typeof e, { type: "url" }> => e.type === "url")
                .map((e, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs">
                    <Globe className={cn("mt-0.5 h-3 w-3 shrink-0", e.verified ? "text-muted-foreground" : "text-status-partial")} />
                    <a href={e.url} target="_blank" rel="noreferrer noopener" className="min-w-0 truncate text-accent-foreground hover:underline underline-offset-2" title={e.url}>
                      {e.title || e.url}
                    </a>
                    {!e.verified && <span className="shrink-0 text-status-partial" title="Adresse non renvoyée par les outils web de ce lot">non consultée</span>}
                  </li>
                ))}
            </ul>
          )}

          {finding.questions.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">{fromSoutenance ? "À demander par écrit" : "Questions au fournisseur"}</p>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs">
                {finding.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
          {finding.risks.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground">Risques</p>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-xs">
                {finding.risks.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {decided ? (
            <p className="text-xs text-muted-foreground">
              {finding.status === "accepted" ? (fromSoutenance ? "Reprise" : "Acceptée") : fromSoutenance ? "Écartée" : "Rejetée"} le {formatDateTime(finding.decided_at)}
              {finding.status === "rejected" && finding.rejection_reason ? ` : ${finding.rejection_reason}` : ""}
            </p>
          ) : rejecting ? (
            <div className="space-y-1.5">
              <Textarea
                aria-label="Motif du rejet"
                placeholder="Motif (facultatif)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="min-h-[56px] text-sm"
              />
              <div className="flex gap-1.5">
                <Button size="xs" variant="outline" disabled={pending} onClick={() => onReject(reason.trim())}>
                  {fromSoutenance ? "Confirmer" : "Confirmer le rejet"}
                </Button>
                <Button size="xs" variant="ghost" disabled={pending} onClick={() => setRejecting(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <Button size="xs" disabled={!canDecide || pending} onClick={onAccept} title={disabledReason ?? undefined}>
                <Check className="h-3.5 w-3.5" />
                {fromSoutenance ? "Reprendre" : "Accepter"}
              </Button>
              <Button size="xs" variant="outline" disabled={!canDecide || pending} onClick={() => setRejecting(true)} title={disabledReason ?? undefined}>
                <X className="h-3.5 w-3.5" />
                {fromSoutenance ? "Écarter" : "Rejeter"}
              </Button>
              {disabledReason && <span className="text-xs text-muted-foreground">{disabledReason}</span>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
