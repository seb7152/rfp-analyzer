"use client";

import Link from "next/link";
import { Loader2, AlertTriangle } from "lucide-react";
import type { AnalysisProgress } from "@/hooks/use-consultation";
import { formatDuration } from "@/lib/format";

/**
 * Persistent status line for the asynchronous AI analysis. Appears under the
 * top bar only while an analysis runs or has just failed; the figures are
 * real counts of scored responses, refreshed every 5 s.
 */
export function AnalysisStrip({
  rfpId,
  analysis,
}: {
  rfpId: string;
  analysis: AnalysisProgress;
}) {
  if (analysis.status === "failed") {
    return (
      <div
        role="status"
        className="flex h-8 items-center gap-2 border-b border-status-fail/40 bg-status-fail-soft px-4 text-sm text-status-fail"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="font-medium">Analyse IA interrompue.</span>
        <Link
          href={`/dashboard/rfp/${rfpId}/analyse`}
          className="underline underline-offset-2"
        >
          Voir le détail et relancer
        </Link>
      </div>
    );
  }

  if (analysis.status !== "processing") return null;

  const percent =
    analysis.total > 0
      ? Math.round((analysis.scored / analysis.total) * 100)
      : 0;
  const eta = formatDuration(analysis.etaSeconds);

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex h-8 items-center gap-3 border-b border-border bg-accent px-4 text-sm text-accent-foreground"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" />
      <span className="font-medium">Analyse IA en cours</span>
      <span className="tnum">
        {analysis.scored}/{analysis.total} réponses notées
      </span>
      <span className="hidden text-muted-foreground sm:inline">
        {eta ? `environ ${eta} restantes` : "estimation en cours"}
      </span>
      <Link
        href={`/dashboard/rfp/${rfpId}/analyse`}
        className="ml-auto underline underline-offset-2"
      >
        Suivre
      </Link>
      <span
        aria-hidden
        className="absolute bottom-0 left-0 h-0.5 bg-primary transition-[width] duration-500"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
