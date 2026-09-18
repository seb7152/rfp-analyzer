/**
 * The séances of a consultation as the chapter lists them: one per supplier
 * still in the version, with the brief, the transcript, the compte rendu
 * and the proposals it holds, and the state that follows from them.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { RunStatus } from "@/lib/agents/types";
import type { SupplierInfo } from "./context";
import type { SessionState, SoutenanceBriefRow, SoutenanceSessionRow } from "./types";

export interface SessionAnalysis {
  status: RunStatus | null;
  runs: number;
  proposed: number;
  accepted: number;
  rejected: number;
  error: string | null;
}

export interface SessionSummary {
  supplier: SupplierInfo;
  session: Omit<SoutenanceSessionRow, "transcript_text" | "transcript_segments"> | null;
  state: SessionState;
  brief: Pick<SoutenanceBriefRow, "id" | "status" | "target_statuses" | "created_at" | "completed_at" | "error_message" | "cost" | "edited_at"> | null;
  reportJob: { status: string; error: string | null } | null;
  analysis: SessionAnalysis;
}

export function sessionState(input: {
  session: { transcript_source: string | null; report_markdown: string | null } | null;
  brief: { status: string } | null;
  analysis: SessionAnalysis;
}): SessionState {
  if (input.analysis.runs > 0 && input.analysis.status && input.analysis.status !== "pending" && input.analysis.status !== "running") return "exploitee";
  if (input.session?.transcript_source) return "tenue";
  if (input.brief?.status === "completed") return "preparee";
  return "a_preparer";
}

export async function loadSessionSummaries(db: SupabaseClient, rfpId: string, suppliers: SupplierInfo[]): Promise<SessionSummary[]> {
  const { data: sessions, error } = await db
    .from("soutenance_sessions")
    .select("id, rfp_id, supplier_id, scheduled_at, transcript_source, transcript_meta, voice_names, report_markdown, report_generated_at, report_edited_at, report_job_id, created_by, created_at, updated_at")
    .eq("rfp_id", rfpId);
  if (error) throw new Error(`Séances illisibles : ${error.message}`);
  const rows = (sessions ?? []) as Array<Omit<SoutenanceSessionRow, "transcript_text" | "transcript_segments">>;
  const sessionIds = rows.map((s) => s.id);
  const jobIds = rows.map((s) => s.report_job_id).filter((id): id is string => !!id);

  const [{ data: briefs }, { data: jobs }, { data: runs }, { data: findings }] = await Promise.all([
    db
      .from("soutenance_briefs")
      .select("id, session_id, supplier_id, status, target_statuses, created_at, completed_at, error_message, cost, edited_at")
      .eq("rfp_id", rfpId)
      .order("created_at", { ascending: false }),
    jobIds.length > 0 ? db.from("ai_jobs").select("id, status, error").in("id", jobIds) : Promise.resolve({ data: [] as unknown[] }),
    sessionIds.length > 0 ? db.from("agent_runs").select("id, session_id, status, error").eq("kind", "soutenance").in("session_id", sessionIds) : Promise.resolve({ data: [] as unknown[] }),
    sessionIds.length > 0
      ? db.from("agent_findings").select("status, agent_runs!inner(session_id)").in("agent_runs.session_id", sessionIds).neq("status", "obsolete")
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const briefBySession = new Map<string, SessionSummary["brief"]>();
  for (const b of (briefs ?? []) as Array<NonNullable<SessionSummary["brief"]> & { session_id: string | null; supplier_id: string }>) {
    const key = b.session_id ?? `supplier:${b.supplier_id}`;
    if (!briefBySession.has(key)) briefBySession.set(key, b);
  }
  const jobById = new Map(((jobs ?? []) as Array<{ id: string; status: string; error: string | null }>).map((j) => [j.id, j]));
  const runsBySession = new Map<string, Array<{ status: RunStatus; error: string | null }>>();
  for (const r of (runs ?? []) as Array<{ session_id: string; status: RunStatus; error: string | null }>) {
    const list = runsBySession.get(r.session_id) ?? [];
    list.push(r);
    runsBySession.set(r.session_id, list);
  }
  const countsBySession = new Map<string, { proposed: number; accepted: number; rejected: number }>();
  for (const f of (findings ?? []) as unknown as Array<{ status: string; agent_runs: { session_id: string } }>) {
    const c = countsBySession.get(f.agent_runs.session_id) ?? { proposed: 0, accepted: 0, rejected: 0 };
    if (f.status === "proposed") c.proposed++;
    if (f.status === "accepted") c.accepted++;
    if (f.status === "rejected") c.rejected++;
    countsBySession.set(f.agent_runs.session_id, c);
  }

  return suppliers.map((supplier) => {
    const session = rows.find((s) => s.supplier_id === supplier.id) ?? null;
    const brief = (session && briefBySession.get(session.id)) ?? briefBySession.get(`supplier:${supplier.id}`) ?? null;
    const sessionRuns = session ? runsBySession.get(session.id) ?? [] : [];
    const counts = session ? countsBySession.get(session.id) ?? { proposed: 0, accepted: 0, rejected: 0 } : { proposed: 0, accepted: 0, rejected: 0 };
    const statuses = sessionRuns.map((r) => r.status);
    const status: RunStatus | null =
      sessionRuns.length === 0
        ? null
        : statuses.includes("running")
          ? "running"
          : statuses.includes("pending")
            ? statuses.some((s) => s === "completed" || s === "partial" || s === "failed")
              ? "running"
              : "pending"
            : statuses.every((s) => s === "completed")
              ? "completed"
              : statuses.every((s) => s === "failed")
                ? "failed"
                : "partial";
    const analysis: SessionAnalysis = {
      status,
      runs: sessionRuns.length,
      ...counts,
      error: sessionRuns.map((r) => r.error).filter(Boolean)[0] ?? null,
    };
    const reportJob = session?.report_job_id ? jobById.get(session.report_job_id) ?? null : null;
    return {
      supplier,
      session,
      state: sessionState({ session, brief, analysis }),
      brief: brief ? { id: brief.id, status: brief.status, target_statuses: brief.target_statuses, created_at: brief.created_at, completed_at: brief.completed_at, error_message: brief.error_message, cost: brief.cost, edited_at: brief.edited_at } : null,
      reportJob: reportJob ? { status: reportJob.status, error: reportJob.error } : null,
      analysis,
    };
  });
}

/** The séance row of a supplier, created empty when missing (pilots). */
export async function ensureSession(db: SupabaseClient, rfpId: string, supplierId: string, userId: string): Promise<SoutenanceSessionRow> {
  const { data: existing, error } = await db.from("soutenance_sessions").select("*").eq("rfp_id", rfpId).eq("supplier_id", supplierId).maybeSingle();
  if (error) throw new Error(`Séance illisible : ${error.message}`);
  if (existing) return existing as SoutenanceSessionRow;
  const { data: created, error: cError } = await db
    .from("soutenance_sessions")
    .insert({ rfp_id: rfpId, supplier_id: supplierId, created_by: userId })
    .select("*")
    .single();
  if (cError || !created) {
    const { data: again } = await db.from("soutenance_sessions").select("*").eq("rfp_id", rfpId).eq("supplier_id", supplierId).maybeSingle();
    if (again) return again as SoutenanceSessionRow;
    throw new Error(`Séance non créée : ${cError?.message ?? "inconnue"}`);
  }
  return created as SoutenanceSessionRow;
}

/** The version that receives the proposals of the séances: chosen, else active. */
export async function resolveTargetVersion(db: SupabaseClient, rfpId: string): Promise<{ id: string; version_number: number; version_name: string; chosen: boolean } | null> {
  const { data: rfp } = await db.from("rfps").select("soutenance_target_version_id").eq("id", rfpId).maybeSingle();
  const chosenId = (rfp as { soutenance_target_version_id: string | null } | null)?.soutenance_target_version_id ?? null;
  if (chosenId) {
    const { data: v } = await db.from("evaluation_versions").select("id, version_number, version_name").eq("id", chosenId).maybeSingle();
    if (v) return { ...(v as { id: string; version_number: number; version_name: string }), chosen: true };
  }
  const { data: active } = await db.from("evaluation_versions").select("id, version_number, version_name").eq("rfp_id", rfpId).eq("is_active", true).maybeSingle();
  return active ? { ...(active as { id: string; version_number: number; version_name: string }), chosen: false } : null;
}
