import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PILOT, READER, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import type { AgentFindingWithAgent } from "@/lib/agents/types";
import { loadOverview } from "@/lib/soutenance/api";
import { ensureSession } from "@/lib/soutenance/sessions";
import type { SoutenanceBriefRow, SoutenanceSessionRow } from "@/lib/soutenance/types";

export const dynamic = "force-dynamic";

export interface SessionFinding extends AgentFindingWithAgent {
  requirement: { id: string; code: string; title: string; domain_id: string | null; domain_code: string; domain_title: string };
}

/**
 * GET /api/rfps/[rfpId]/soutenances/[supplierId] — one séance in full:
 * the chapter's overview (for the tabs and the target version), the séance
 * row with its transcript, its latest brief, its proposals with their
 * requirement.
 */
export async function GET(_request: NextRequest, { params }: { params: { rfpId: string; supplierId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, READER);
    if (access.error) return access.error;
    const overview = await loadOverview(supabase, params.rfpId, user.id, access.access);
    if (overview instanceof NextResponse) return overview;
    const supplier = overview.suppliers.find((s) => s.id === params.supplierId);
    if (!supplier) return NextResponse.json({ error: "Fournisseur introuvable." }, { status: 404 });

    const { data: sessionRow } = await supabase.from("soutenance_sessions").select("*").eq("rfp_id", params.rfpId).eq("supplier_id", params.supplierId).maybeSingle();
    const session = (sessionRow as SoutenanceSessionRow | null) ?? null;
    const { data: briefRow } = await supabase
      .from("soutenance_briefs")
      .select("id, rfp_id, supplier_id, version_id, session_id, status, target_statuses, report_markdown, error_message, job_id, model_id, cost, edited_at, created_at, completed_at")
      .eq("rfp_id", params.rfpId)
      .eq("supplier_id", params.supplierId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const brief = (briefRow as SoutenanceBriefRow | null) ?? null;

    let findings: SessionFinding[] = [];
    let reportJob: { id: string; status: string; error: string | null; cost: number; result: unknown } | null = null;
    if (session) {
      if (session.report_job_id) {
        const { data: job } = await supabase.from("ai_jobs").select("id, status, error, cost, result").eq("id", session.report_job_id).maybeSingle();
        reportJob = (job as typeof reportJob) ?? null;
      }
      const { data: rows, error: fError } = await supabase
        .from("agent_findings")
        .select("*, agent_runs!inner(session_id, supplier_id, kind, version_id, agent_versions(version_number, agents(id, name))), requirements!inner(id, requirement_id_external, title, category_id)")
        .eq("agent_runs.session_id", session.id)
        .neq("status", "obsolete")
        .order("created_at", { ascending: false });
      if (fError) throw new Error(fError.message);
      const domainOf = (categoryId: string | null) => {
        // Walk up: the chapter's domains are the top-level categories.
        const byId = new Map(overview.domains.map((d) => [d.id, d]));
        return byId.get(categoryId ?? "") ?? null;
      };
      const { data: cats } = await supabase.from("categories").select("id, parent_id").eq("rfp_id", params.rfpId);
      const parentOf = new Map(((cats ?? []) as Array<{ id: string; parent_id: string | null }>).map((c) => [c.id, c.parent_id]));
      const topOf = (categoryId: string | null): string | null => {
        let current = categoryId;
        let guard = 0;
        while (current && parentOf.get(current) && guard++ < 20) current = parentOf.get(current) ?? null;
        return current;
      };
      findings = ((rows ?? []) as unknown as Array<Record<string, unknown> & {
        agent_runs: { supplier_id: string; kind: string; agent_versions: { version_number: number; agents: { id: string; name: string } | null } | null };
        requirements: { id: string; requirement_id_external: string; title: string; category_id: string | null };
      }>).map((row) => {
        const { agent_runs, requirements, ...finding } = row;
        const domain = domainOf(topOf(requirements.category_id));
        return {
          ...(finding as unknown as AgentFindingWithAgent),
          evidence: Array.isArray((finding as { evidence?: unknown }).evidence) ? (finding as unknown as AgentFindingWithAgent).evidence : [],
          supplier_id: agent_runs.supplier_id,
          run_kind: "soutenance" as const,
          agent: {
            id: agent_runs.agent_versions?.agents?.id ?? "",
            name: agent_runs.agent_versions?.agents?.name ?? "Soutenances",
            version_number: agent_runs.agent_versions?.version_number ?? 0,
          },
          requirement: {
            id: requirements.id,
            code: requirements.requirement_id_external,
            title: requirements.title,
            domain_id: domain?.id ?? null,
            domain_code: domain?.code ?? "",
            domain_title: domain?.title ?? "Sans domaine",
          },
        };
      });
    }
    return NextResponse.json({ overview, supplier, session, brief, reportJob, findings });
  } catch (err) {
    return failure(err);
  }
}

const patchSchema = z.object({
  scheduled_at: z.string().datetime({ offset: true }).nullable().optional(),
  voice_names: z.record(z.string(), z.string().trim().max(80)).optional(),
  report_markdown: z.string().max(200_000).optional(),
});

/** PATCH — date, names of the voices, hand edit of the compte rendu (pilots). */
export async function PATCH(request: NextRequest, { params }: { params: { rfpId: string; supplierId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    const session = await ensureSession(supabase, params.rfpId, params.supplierId, user.id);
    const patch: Record<string, unknown> = {};
    if (parsed.data.scheduled_at !== undefined) patch.scheduled_at = parsed.data.scheduled_at;
    if (parsed.data.voice_names !== undefined) patch.voice_names = parsed.data.voice_names;
    if (parsed.data.report_markdown !== undefined) {
      patch.report_markdown = parsed.data.report_markdown.trim() || null;
      patch.report_edited_at = new Date().toISOString();
    }
    const { data: updated, error: uError } = await supabase.from("soutenance_sessions").update(patch).eq("id", session.id).select("*").single();
    if (uError) throw new Error(uError.message);
    return NextResponse.json({ session: updated });
  } catch (err) {
    return failure(err);
  }
}
