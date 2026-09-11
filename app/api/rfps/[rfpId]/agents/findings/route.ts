import { NextRequest, NextResponse } from "next/server";
import { READER, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { loadActiveVersion } from "@/lib/agents/context";
import type { AgentFindingWithAgent } from "@/lib/agents/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/rfps/[rfpId]/agents/findings?requirementId=…&versionId=…
 * The proposals on one requirement's responses, newest first, obsolete
 * ones excluded, each with the agent and version that produced it.
 */
export async function GET(request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, READER);
    if (access.error) return access.error;
    const requirementId = request.nextUrl.searchParams.get("requirementId");
    if (!requirementId) return NextResponse.json({ error: "requirementId est requis." }, { status: 400 });
    let versionId = request.nextUrl.searchParams.get("versionId");
    if (!versionId) versionId = (await loadActiveVersion(supabase, params.rfpId))?.id ?? null;
    if (!versionId) return NextResponse.json({ findings: [] });

    const { data, error: fError } = await supabase
      .from("agent_findings")
      .select("*, agent_runs!inner(rfp_id, version_id, supplier_id, agent_versions(version_number, agents(id, name)))")
      .eq("requirement_id", requirementId)
      .eq("agent_runs.rfp_id", params.rfpId)
      .eq("agent_runs.version_id", versionId)
      .neq("status", "obsolete")
      .order("created_at", { ascending: false });
    if (fError) throw new Error(fError.message);

    const findings: AgentFindingWithAgent[] = ((data ?? []) as unknown as Array<Record<string, unknown> & {
      agent_runs: { supplier_id: string; agent_versions: { version_number: number; agents: { id: string; name: string } | null } | null };
    }>).map((row) => {
      const { agent_runs, ...finding } = row;
      return {
        ...(finding as unknown as AgentFindingWithAgent),
        supplier_id: agent_runs.supplier_id,
        agent: {
          id: agent_runs.agent_versions?.agents?.id ?? "",
          name: agent_runs.agent_versions?.agents?.name ?? "Agent",
          version_number: agent_runs.agent_versions?.version_number ?? 0,
        },
      };
    });
    return NextResponse.json({ findings });
  } catch (err) {
    return failure(err);
  }
}
