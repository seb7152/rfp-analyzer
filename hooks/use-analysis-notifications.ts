"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { AnalysisProgress } from "@/hooks/use-consultation";

/**
 * Closes the loop on the asynchronous AI analysis: a toast, a browser
 * notification when allowed, and a marker in the tab title while it runs.
 */
export function useAnalysisNotifications(
  analysis: AnalysisProgress,
  title: string | null
) {
  const previous = useRef<AnalysisProgress["status"] | null>(null);

  useEffect(() => {
    const base = title ? `${title} · RFP Analyzer` : "RFP Analyzer";
    if (analysis.status === "processing") {
      const pct =
        analysis.total > 0
          ? Math.round((analysis.scored / analysis.total) * 100)
          : 0;
      document.title = `Analyse IA ${pct} % · ${base}`;
    } else {
      document.title = base;
    }
  }, [analysis.status, analysis.scored, analysis.total, title]);

  useEffect(() => {
    const was = previous.current;
    previous.current = analysis.status;
    if (was !== "processing") return;

    if (analysis.status === "completed") {
      toast.success("Analyse IA terminée. Les notes et commentaires sont disponibles.");
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification("Analyse IA terminée", {
            body: title ?? "Les notes et commentaires sont disponibles.",
          });
        } catch {
          // notification unavailable in this context
        }
      }
    } else if (analysis.status === "failed") {
      toast.error("Analyse IA interrompue. Vous pouvez la relancer depuis le chapitre Analyse IA.");
    }
  }, [analysis.status, title]);
}
