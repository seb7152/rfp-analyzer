import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { failure, orgRole, requireUser } from "@/lib/agents/auth";
import { DEFAULT_MODEL_ID } from "@/lib/agents/openrouter";
import { REASONING_EFFORTS, type AgentListItem } from "@/lib/agents/types";
import { DEFAULT_TOOLS, TOOL_IDS, parseTools } from "@/lib/agents/tools";

export const dynamic = "force-dynamic";

/**
 * GET /api/agents?organizationId=…
 * The organisation's agents with, for each, the number of consultations it
 * is assigned to and its acceptance figures.
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const organizationId = request.nextUrl.searchParams.get("organizationId");
    if (!organizationId) return NextResponse.json({ error: "organizationId est requis." }, { status: 400 });
    const role = await orgRole(supabase, user.id, organizationId);
    if (!role) return NextResponse.json({ error: "Accès refusé." }, { status: 403 });

    const [{ data: agents, error: agentsError }, { data: assignments }, { data: findings }] = await Promise.all([
      supabase.from("agents").select("*").eq("organization_id", organizationId).order("name"),
      supabase.from("rfp_agent_assignments").select("agent_id, rfp_id, agents!inner(organization_id)").eq("agents.organization_id", organizationId),
      supabase
        .from("agent_findings")
        .select("status, agent_runs!inner(agent_versions!inner(agent_id, agents!inner(organization_id)))")
        .in("status", ["accepted", "rejected"])
        .eq("agent_runs.agent_versions.agents.organization_id", organizationId),
    ]);
    if (agentsError) throw new Error(agentsError.message);

    const consultations = new Map<string, Set<string>>();
    for (const a of (assignments ?? []) as Array<{ agent_id: string; rfp_id: string }>) {
      const set = consultations.get(a.agent_id) ?? new Set<string>();
      set.add(a.rfp_id);
      consultations.set(a.agent_id, set);
    }
    const decided = new Map<string, { decided: number; accepted: number }>();
    for (const f of (findings ?? []) as unknown as Array<{ status: string; agent_runs: { agent_versions: { agent_id: string } } }>) {
      const agentId = f.agent_runs?.agent_versions?.agent_id;
      if (!agentId) continue;
      const e = decided.get(agentId) ?? { decided: 0, accepted: 0 };
      e.decided++;
      if (f.status === "accepted") e.accepted++;
      decided.set(agentId, e);
    }
    const items: AgentListItem[] = (agents ?? []).map((a) => ({
      ...a,
      consultations: consultations.get(a.id)?.size ?? 0,
      findings_decided: decided.get(a.id)?.decided ?? 0,
      findings_accepted: decided.get(a.id)?.accepted ?? 0,
    }));
    return NextResponse.json({ agents: items, role, defaultModelId: DEFAULT_MODEL_ID });
  } catch (err) {
    return failure(err);
  }
}

const toolsSchema = z
  .object({
    enabled: z.array(z.enum(TOOL_IDS as unknown as [string, ...string[]])).default([]),
    web_max_uses: z.number().int().min(1).max(20).default(DEFAULT_TOOLS.web_max_uses),
    web_allowed_domains: z.array(z.string().trim().min(1).max(200)).max(50).default([]),
  })
  .transform((t) => parseTools(t));

const createSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().trim().min(1, "Le nom est requis.").max(120),
  description: z.string().trim().max(500).default(""),
  system_prompt: z.string().trim().min(1, "Le prompt système est requis."),
  model_id: z.string().trim().min(1).default(DEFAULT_MODEL_ID),
  reasoning_effort: z.enum(REASONING_EFFORTS as [string, ...string[]]).default("high"),
  tools: toolsSchema.default(DEFAULT_TOOLS),
});

/** POST /api/agents — creates an agent and its version 1 (organisation admins). */
export async function POST(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const input = parsed.data;
    const role = await orgRole(supabase, user.id, input.organization_id);
    if (role !== "admin") return NextResponse.json({ error: "Réservé aux administrateurs de l'organisation." }, { status: 403 });

    const { data: agent, error: insertError } = await supabase
      .from("agents")
      .insert({
        organization_id: input.organization_id,
        name: input.name,
        description: input.description,
        system_prompt: input.system_prompt,
        model_id: input.model_id,
        reasoning_effort: input.reasoning_effort,
        tools: input.tools,
        current_version: 1,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (insertError || !agent) throw new Error(insertError?.message ?? "Agent non créé.");

    const { error: versionError } = await supabase.from("agent_versions").insert({
      agent_id: agent.id,
      version_number: 1,
      system_prompt: agent.system_prompt,
      model_id: agent.model_id,
      reasoning_effort: agent.reasoning_effort,
      tools: agent.tools,
      created_by: user.id,
    });
    if (versionError) throw new Error(versionError.message);

    return NextResponse.json({ agent }, { status: 201 });
  } catch (err) {
    return failure(err);
  }
}
