"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  FileOutput,
  ListChecks,
  Scale,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { usePreparation, type PreparationData } from "@/hooks/use-preparation";
import { useAnalyzeStatus } from "@/hooks/use-analyze-status";
import { useVersion } from "@/contexts/VersionContext";

export type ChapterState =
  | "empty"
  | "partial"
  | "done"
  | "processing"
  | "neutral";

export type ChapterId =
  | "preparation"
  | "analyse"
  | "evaluation"
  | "arbitrage"
  | "restitution"
  | "parametres";

export interface ChapterEntry {
  label: string;
  href: string;
}

export interface Chapter {
  id: ChapterId;
  icon: LucideIcon;
  label: string;
  href: string;
  state: ChapterState;
  /** Short figure shown next to the chapter, e.g. "3/4 réponses". */
  figure: string | null;
  entries: ChapterEntry[];
}

export interface AnalysisProgress {
  status: "idle" | "processing" | "completed" | "failed";
  total: number;
  scored: number;
  /** Seconds remaining, null until a rate can be measured. */
  etaSeconds: number | null;
  startedAt: string | null;
}

export type AccessLevel = "owner" | "evaluator" | "viewer" | "admin";

function rfpHref(rfpId: string, path: string) {
  return `/dashboard/rfp/${rfpId}/${path}`;
}

function preparationState(p: PreparationData): ChapterState {
  const states = [
    p.specification.state,
    p.suppliers.state,
    p.responses.state,
  ];
  if (states.every((s) => s === "done")) return "done";
  if (states.every((s) => s === "empty")) return "empty";
  return "partial";
}

export function buildChapters(
  rfpId: string,
  p: PreparationData,
  analysis: AnalysisProgress,
  access: AccessLevel
): Chapter[] {
  const canPilot = access === "owner" || access === "admin";
  const canEvaluate = canPilot || access === "evaluator";

  const evaluationDone = p.responses.total > 0 && p.responses.answered === p.responses.total;
  const evaluationState: ChapterState =
    p.responses.total === 0
      ? "empty"
      : evaluationDone
        ? "done"
        : p.responses.answered > 0
          ? "partial"
          : "empty";

  const analysisState: ChapterState =
    analysis.status === "processing"
      ? "processing"
      : analysis.total === 0
        ? "empty"
        : analysis.scored === 0
          ? "empty"
          : analysis.scored < analysis.total
            ? "partial"
            : "done";

  const percent =
    p.responses.total > 0
      ? Math.round((p.responses.answered / p.responses.total) * 100)
      : 0;

  const chapters: Chapter[] = [];

  if (canPilot) {
    chapters.push({
      id: "preparation",
      icon: ClipboardList,
      label: "Préparation",
      href: rfpHref(rfpId, "preparation"),
      state: preparationState(p),
      figure:
        p.specification.requirements > 0
          ? `${p.specification.requirements} exig.`
          : null,
      entries: [
        { label: "Référentiel", href: rfpHref(rfpId, "referentiel") },
        { label: "Documents", href: rfpHref(rfpId, "documents") },
        { label: "Import", href: rfpHref(rfpId, "import") },
      ],
    });
    chapters.push({
      id: "analyse",
      icon: Sparkles,
      label: "Analyse IA",
      href: rfpHref(rfpId, "analyse"),
      state: analysisState,
      figure:
        analysis.total > 0 ? `${analysis.scored}/${analysis.total}` : null,
      entries: [{ label: "Agents", href: rfpHref(rfpId, "agents") }],
    });
  }

  if (canEvaluate) {
    chapters.push({
      id: "evaluation",
      icon: ListChecks,
      label: "Évaluation",
      href: rfpHref(rfpId, "evaluate"),
      state: evaluationState,
      figure: p.responses.total > 0 ? `${percent} %` : null,
      entries: canPilot
        ? [{ label: "Avancement", href: rfpHref(rfpId, "suivi") }]
        : [],
    });
  }

  chapters.push({
    id: "arbitrage",
    icon: Scale,
    label: "Décision",
    href: rfpHref(rfpId, "decision"),
    state: evaluationDone ? "done" : p.responses.answered > 0 ? "partial" : "empty",
    figure: null,
    entries: [
      { label: "Financier", href: rfpHref(rfpId, "financial-grid") },
      { label: "Soutenances", href: rfpHref(rfpId, "soutenances") },
    ],
  });

  chapters.push({
    id: "restitution",
    icon: FileOutput,
    label: "Restitution",
    href: rfpHref(rfpId, "export"),
    state: "neutral",
    figure: null,
    entries: [],
  });

  if (canPilot) {
    chapters.push({
      id: "parametres",
      icon: Settings,
      label: "Paramètres",
      href: rfpHref(rfpId, "parametres"),
      state: "neutral",
      figure: null,
      entries: [],
    });
  }

  return chapters;
}

/**
 * Where a user lands when opening a consultation without a chapter:
 * the chapter that matches the dossier's progression for their role.
 */
export function landingHref(
  rfpId: string,
  p: PreparationData,
  access: AccessLevel
): string {
  if (access === "viewer") return rfpHref(rfpId, "decision");
  if (access === "evaluator") return rfpHref(rfpId, "evaluate");
  if (preparationState(p) !== "done") return rfpHref(rfpId, "preparation");
  if (p.responses.answered === 0) return rfpHref(rfpId, "analyse");
  if (p.responses.answered < p.responses.total) return rfpHref(rfpId, "suivi");
  return rfpHref(rfpId, "decision");
}

export function useConsultation(rfpId: string | null) {
  const { activeVersion } = useVersion();
  const queryClient = useQueryClient();
  const { status: liveStatus } = useAnalyzeStatus(rfpId);

  const { preparation, isLoading, error, refetch } = usePreparation(
    rfpId,
    activeVersion?.id
  );

  const storedStatus = preparation?.analysis.status?.status ?? null;
  const processing =
    liveStatus?.status === "processing" ||
    (liveStatus === null && storedStatus === "processing");

  // While an analysis runs, the counts are the only truthful progress signal:
  // the callbacks do not write processedResponses. Refresh them every 5 s.
  useEffect(() => {
    if (!rfpId || !processing) return;
    const id = window.setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["preparation", rfpId] });
    }, 5000);
    return () => window.clearInterval(id);
  }, [rfpId, processing, queryClient]);

  // When realtime reports completion, refresh everything once.
  const lastLive = useRef<string | null>(null);
  useEffect(() => {
    if (!rfpId || !liveStatus?.status) return;
    if (lastLive.current === liveStatus.status) return;
    lastLive.current = liveStatus.status;
    if (liveStatus.status === "completed" || liveStatus.status === "failed") {
      queryClient.invalidateQueries({ queryKey: ["preparation", rfpId] });
      queryClient.invalidateQueries({ queryKey: ["all-responses", rfpId] });
      queryClient.invalidateQueries({ queryKey: ["responses", rfpId] });
    }
  }, [rfpId, liveStatus?.status, queryClient]);

  // Rate of scored responses over the last samples → ETA.
  const samples = useRef<Array<{ t: number; scored: number }>>([]);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const scored = preparation?.analysis.responsesScored ?? 0;
  const total = preparation?.analysis.responsesTotal ?? 0;
  useEffect(() => {
    if (!processing) {
      samples.current = [];
      setEtaSeconds(null);
      return;
    }
    const now = Date.now();
    const last = samples.current[samples.current.length - 1];
    if (!last || last.scored !== scored) {
      samples.current.push({ t: now, scored });
      if (samples.current.length > 12) samples.current.shift();
    }
    const first = samples.current[0];
    const latest = samples.current[samples.current.length - 1];
    if (first && latest && latest.scored > first.scored && latest.t > first.t) {
      const rate = (latest.scored - first.scored) / ((latest.t - first.t) / 1000);
      const remaining = Math.max(0, total - scored);
      setEtaSeconds(rate > 0 ? Math.round(remaining / rate) : null);
    }
  }, [processing, scored, total]);

  const analysis: AnalysisProgress = useMemo(
    () => ({
      status: processing
        ? "processing"
        : liveStatus?.status === "failed" || storedStatus === "failed"
          ? "failed"
          : scored > 0
            ? "completed"
            : "idle",
      total,
      scored,
      etaSeconds,
      startedAt:
        liveStatus?.startedAt ?? preparation?.analysis.status?.startedAt ?? null,
    }),
    [processing, liveStatus, storedStatus, scored, total, etaSeconds, preparation]
  );

  const access: AccessLevel = preparation?.userAccessLevel ?? "viewer";

  const chapters = useMemo(
    () =>
      preparation && rfpId
        ? buildChapters(rfpId, preparation, analysis, access)
        : [],
    [preparation, rfpId, analysis, access]
  );

  const landing =
    preparation && rfpId ? landingHref(rfpId, preparation, access) : null;

  return {
    rfpId,
    preparation,
    chapters,
    analysis,
    access,
    landing,
    isLoading,
    error,
    refetch,
  };
}
