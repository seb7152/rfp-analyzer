"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Overview } from "@/lib/soutenance/api";
import type { SessionFinding } from "@/app/api/rfps/[rfpId]/soutenances/[supplierId]/route";
import type { BriefStatus, SoutenanceBriefRow, SoutenanceSessionRow, SyntheseItem } from "@/lib/soutenance/types";

export type { Overview, SessionFinding };

export const soutenanceKeys = {
  overview: (rfpId: string) => ["soutenances", rfpId] as const,
  session: (rfpId: string, supplierId: string) => ["soutenances", rfpId, "session", supplierId] as const,
  summary: (rfpId: string) => ["soutenances-summary", rfpId] as const,
  meetings: (rfpId: string, around: string | null) => ["granola-meetings", rfpId, around] as const,
};

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return (body as { error?: string }).error ?? fallback;
}

async function call<T>(url: string, init?: RequestInit, fallback = "La requête a échoué."): Promise<T> {
  const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) throw new Error(await readError(res, fallback));
  return res.json();
}

/** Something is being produced: the screens poll while it lasts. */
export function overviewBusy(o: Overview | undefined): boolean {
  if (!o) return false;
  if (o.synthese?.status === "running" || o.synthese?.status === "pending") return true;
  return o.sessions.some(
    (s) =>
      s.brief?.status === "pending" ||
      s.brief?.status === "processing" ||
      s.reportJob?.status === "pending" ||
      s.reportJob?.status === "running" ||
      s.analysis.status === "pending" ||
      s.analysis.status === "running"
  );
}

export function useSoutenances(rfpId: string | null) {
  return useQuery<Overview, Error>({
    queryKey: soutenanceKeys.overview(rfpId ?? ""),
    queryFn: () => call<Overview>(`/api/rfps/${rfpId}/soutenances`, undefined, "Le chapitre n'a pas pu être chargé."),
    enabled: !!rfpId,
    staleTime: 10_000,
    refetchInterval: (data) => (overviewBusy(data) ? 5_000 : false),
  });
}

export interface SessionDetail {
  overview: Overview;
  supplier: Overview["suppliers"][number];
  session: SoutenanceSessionRow | null;
  brief: SoutenanceBriefRow | null;
  reportJob: { id: string; status: string; error: string | null; cost: number; result: unknown } | null;
  findings: SessionFinding[];
}

export function sessionBusy(d: SessionDetail | undefined): boolean {
  if (!d) return false;
  if (d.brief?.status === "pending" || d.brief?.status === "processing") return true;
  if (d.reportJob?.status === "pending" || d.reportJob?.status === "running") return true;
  const mine = d.overview.sessions.find((s) => s.supplier.id === d.supplier.id);
  return mine?.analysis.status === "pending" || mine?.analysis.status === "running";
}

export function useSession(rfpId: string | null, supplierId: string | null) {
  return useQuery<SessionDetail, Error>({
    queryKey: soutenanceKeys.session(rfpId ?? "", supplierId ?? ""),
    queryFn: () => call<SessionDetail>(`/api/rfps/${rfpId}/soutenances/${supplierId}`, undefined, "La séance n'a pas pu être chargée."),
    enabled: !!rfpId && !!supplierId,
    staleTime: 10_000,
    refetchInterval: (data) => (sessionBusy(data) ? 5_000 : false),
  });
}

export function useSoutenanceSummary(rfpId: string | null) {
  return useQuery<{ held: number; total: number; exploited: number }, Error>({
    queryKey: soutenanceKeys.summary(rfpId ?? ""),
    queryFn: () => call(`/api/rfps/${rfpId}/soutenances/summary`, undefined, "Résumé indisponible."),
    enabled: !!rfpId,
    staleTime: 60_000,
  });
}

function useInvalidate(rfpId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: soutenanceKeys.overview(rfpId) });
    queryClient.invalidateQueries({ queryKey: ["soutenances", rfpId, "session"] });
    queryClient.invalidateQueries({ queryKey: soutenanceKeys.summary(rfpId) });
  };
}

export function useSoutenanceMutations(rfpId: string) {
  const invalidate = useInvalidate(rfpId);
  const queryClient = useQueryClient();
  const base = `/api/rfps/${rfpId}/soutenances`;
  return {
    generateSynthese: useMutation<{ jobs: number }, Error>({
      mutationFn: () => call(`${base}/synthese`, { method: "POST" }, "La synthèse n'a pas pu être lancée."),
      onSettled: invalidate,
    }),
    patchSynthese: useMutation<unknown, Error, { supplier_id: string; category_id: string; forces: SyntheseItem[]; faiblesses: SyntheseItem[]; questions: SyntheseItem[] }>({
      mutationFn: (input) => call(`${base}/synthese`, { method: "PATCH", body: JSON.stringify(input) }, "La modification n'a pas été enregistrée."),
      onSettled: invalidate,
    }),
    setTargetVersion: useMutation<unknown, Error, string | null>({
      mutationFn: (target_version_id) => call(base, { method: "PATCH", body: JSON.stringify({ target_version_id }) }, "La version cible n'a pas été enregistrée."),
      onSettled: invalidate,
    }),
    patchSession: useMutation<unknown, Error, { supplierId: string; scheduled_at?: string | null; voice_names?: Record<string, string>; report_markdown?: string }>({
      mutationFn: ({ supplierId, ...body }) => call(`${base}/${supplierId}`, { method: "PATCH", body: JSON.stringify(body) }, "La séance n'a pas été enregistrée."),
      onSettled: invalidate,
    }),
    generateBrief: useMutation<unknown, Error, { supplierId: string; statuses: BriefStatus[] }>({
      mutationFn: ({ supplierId, statuses }) => call(`${base}/${supplierId}/brief`, { method: "POST", body: JSON.stringify({ statuses }) }, "Le brief n'a pas pu être lancé."),
      onSettled: invalidate,
    }),
    patchBrief: useMutation<unknown, Error, { supplierId: string; brief_id: string; report_markdown: string }>({
      mutationFn: ({ supplierId, ...body }) => call(`${base}/${supplierId}/brief`, { method: "PATCH", body: JSON.stringify(body) }, "Le brief n'a pas été enregistré."),
      onSettled: invalidate,
    }),
    loadTranscript: useMutation<unknown, Error, { supplierId: string } & ({ source: "granola"; note_id: string } | { source: "pasted"; text: string; title?: string } | { source: "audio"; text: string; title?: string; cost?: number })>({
      mutationFn: ({ supplierId, ...body }) => call(`${base}/${supplierId}/transcript`, { method: "POST", body: JSON.stringify(body) }, "Le transcript n'a pas pu être chargé."),
      onSettled: invalidate,
    }),
    deleteTranscript: useMutation<unknown, Error, { supplierId: string }>({
      mutationFn: ({ supplierId }) => call(`${base}/${supplierId}/transcript`, { method: "DELETE" }, "Le transcript n'a pas pu être retiré."),
      onSettled: invalidate,
    }),
    analyze: useMutation<unknown, Error, { supplierId: string }>({
      mutationFn: ({ supplierId }) => call(`${base}/${supplierId}/analyze`, { method: "POST" }, "L'analyse n'a pas pu être lancée."),
      onSettled: invalidate,
    }),
    decide: useMutation<unknown, Error, { supplierId: string; findingId: string; action: "accept" | "reject"; reason?: string }>({
      mutationFn: ({ findingId, action, reason }) =>
        call(`/api/rfps/${rfpId}/agents/findings/${findingId}/decision`, { method: "POST", body: JSON.stringify(action === "accept" ? { action } : { action, reason }) }, "La décision n'a pas été enregistrée."),
      onSettled: (_d, _e, input) => {
        invalidate();
        queryClient.invalidateQueries({ queryKey: ["agent-findings", rfpId] });
        queryClient.invalidateQueries({ queryKey: ["responses"] });
        queryClient.invalidateQueries({ queryKey: ["responses-light"] });
        void input;
      },
    }),
    acceptAll: useMutation<{ accepted: number; failed: number; total: number }, Error, { supplierId: string }>({
      mutationFn: ({ supplierId }) => call(`${base}/${supplierId}/findings/accept-all`, { method: "POST" }, "Les propositions n'ont pas pu être reprises."),
      onSettled: () => {
        invalidate();
        queryClient.invalidateQueries({ queryKey: ["agent-findings", rfpId] });
        queryClient.invalidateQueries({ queryKey: ["responses"] });
        queryClient.invalidateQueries({ queryKey: ["responses-light"] });
      },
    }),
  };
}

export interface GranolaMeeting {
  id: string;
  title: string;
  created_at: string;
  attendees: string[];
  folder: string | null;
  /** The search terms (the supplier's name first) found in the title, summary or notes. */
  mentions: string[];
  snippet: string | null;
}

/**
 * The meetings around a date: the list comes at once; with `enrich`, each
 * note's summary is read to spot the supplier, which takes a few seconds, so
 * the dialog runs both and shows the list while the mentions arrive.
 */
export function useGranolaMeetings(rfpId: string, around: string | null, supplierId: string | null, enabled: boolean, enrich = false) {
  return useQuery<{ scope: string; terms: string[]; meetings: GranolaMeeting[] }, Error>({
    queryKey: [...soutenanceKeys.meetings(rfpId, around), supplierId, enrich],
    queryFn: () =>
      call(
        `/api/connectors/granola/meetings?rfpId=${rfpId}${around ? `&around=${encodeURIComponent(around)}` : ""}${supplierId ? `&supplierId=${supplierId}` : ""}${enrich ? "&enrich=1" : ""}`,
        undefined,
        "Les réunions n'ont pas pu être listées."
      ),
    enabled,
    staleTime: 60_000,
    retry: false,
  });
}

/** Downloads a Markdown document as .docx through the existing converter. */
export async function downloadDocx(markdown: string, title: string): Promise<void> {
  const res = await fetch("/api/export-docx", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ markdown, title }) });
  if (!res.ok) throw new Error("Le document Word n'a pas pu être généré.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
