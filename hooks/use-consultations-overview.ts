"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { RFP } from "@/lib/supabase/types";
import type { PreparationData } from "@/hooks/use-preparation";
import { landingHref, type ChapterState } from "@/hooks/use-consultation";

export type Phase = 0 | 1 | 2 | 3 | 4;
export const PHASE_LABELS = ["Préparation", "Analyse IA", "Évaluation", "Décision", "Restitution"];

export interface ConsultationOverview {
  rfp: RFP;
  preparation: PreparationData | null;
  isLoading: boolean;
  error: Error | null;
  /** Index of the current phase (0–4), from the dossier's progression. */
  phase: Phase;
  phaseState: ChapterState;
  toEvaluate: number;
  aiScored: number;
  aiTotal: number;
  aiProcessing: boolean;
  openThreads: number | null;
  missingDeposits: string[];
  lastActivity: { userName: string; at: string; evaluated: number } | null;
  people: Array<{ userId: string; userName: string }>;
  href: string;
}

function phaseOf(p: PreparationData): { phase: Phase; state: ChapterState } {
  const prepDone = p.specification.state === "done" && p.suppliers.state === "done" && p.responses.state === "done";
  if (!prepDone) {
    const any = p.specification.state !== "empty" || p.suppliers.state !== "empty";
    return { phase: 0, state: any ? "partial" : "empty" };
  }
  const processing = p.analysis.status?.status === "processing";
  if (processing) return { phase: 1, state: "processing" };
  if (p.analysis.responsesScored === 0 && p.responses.answered === 0) return { phase: 1, state: "empty" };
  if (p.responses.answered < p.responses.total) return { phase: 2, state: p.responses.answered > 0 ? "partial" : "empty" };
  if (p.rfp.status === "completed" || p.rfp.status === "archived") return { phase: 4, state: "done" };
  return { phase: 3, state: "partial" };
}

/**
 * One read per consultation (the preparation endpoint already carries every
 * count the home needs) plus the discussion counters when they answer.
 */
export function useConsultationsOverview(rfps: RFP[]) {
  const preparations = useQueries({
    queries: rfps.map((rfp) => ({
      queryKey: ["preparation", rfp.id, null],
      queryFn: async (): Promise<PreparationData> => {
        const res = await fetch(`/api/rfps/${rfp.id}/preparation`, { credentials: "include" });
        if (!res.ok) throw new Error("Impossible de charger l'état de préparation");
        return res.json();
      },
      staleTime: 30_000,
    })),
  });

  const threads = useQueries({
    queries: rfps.map((rfp) => ({
      queryKey: ["response-threads", rfp.id, "counts"],
      queryFn: async (): Promise<number | null> => {
        const res = await fetch(`/api/rfps/${rfp.id}/response-threads?status=open`, { credentials: "include" });
        if (!res.ok) return null;
        const body = await res.json();
        return body?.counts?.open ?? body?.threads?.length ?? null;
      },
      staleTime: 60_000,
      retry: false,
    })),
  });

  return useMemo<ConsultationOverview[]>(
    () =>
      rfps.map((rfp, i) => {
        const p = (preparations[i]?.data as PreparationData | undefined) ?? null;
        const { phase, state } = p ? phaseOf(p) : { phase: 0 as Phase, state: "empty" as ChapterState };
        const people = new Map<string, string>();
        for (const a of p?.recentActivity ?? []) people.set(a.userId, a.userName);
        return {
          rfp,
          preparation: p,
          isLoading: preparations[i]?.isLoading ?? true,
          error: (preparations[i]?.error as Error | null) ?? null,
          phase,
          phaseState: state,
          toEvaluate: p ? Math.max(0, p.responses.total - p.responses.answered) : 0,
          aiScored: p?.analysis.responsesScored ?? 0,
          aiTotal: p?.analysis.responsesTotal ?? 0,
          aiProcessing: p?.analysis.status?.status === "processing",
          openThreads: (threads[i]?.data as number | null | undefined) ?? null,
          missingDeposits: p ? p.suppliers.items.filter((s) => s.responsesTotal === 0).map((s) => s.name) : [],
          lastActivity: p?.recentActivity?.[0] ?? null,
          people: Array.from(people, ([userId, userName]) => ({ userId, userName })),
          href: p ? landingHref(rfp.id, p, p.userAccessLevel) : `/dashboard/rfp/${rfp.id}`,
        };
      }),
    [rfps, preparations, threads]
  );
}
