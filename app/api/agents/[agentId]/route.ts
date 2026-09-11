import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { failure, orgRole, requireUser } from "@/lib/agents/auth";
import { REASONING_EFFORTS } from "@/lib/agents/types";

export const dynamic = "force-dynamic";

/** GET /api/agents/[agentId] — the agent and its version history. */
export async function GET(_request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const { data: agent, error: agentError } = await supabase.from("agents").select("*").eq("id", params.agentId).maybeSingle();
    if (agentError) throw new Error(agentError.message);
    if (!agent) return NextResponse.json({ error: "Agent introuvable." }, { status: 404 });
    const role = await orgRole(supabase, user.id, agent.organization_id);
    const { data: versions, error: versionsError } = await supabase
      .from("agent_versions")
      .select("*")
      .eq("agent_id", agent.id)
      .order("version_number", { ascending: false });
    if (versionsError) throw new Error(versionsError.message);
    const rows = (versions ?? []) as Array<{ id: string; created_by: string | null }>;
    // Who wrote each version, and how many analyses used it.
    const authorIds = Array.from(new Set(rows.map((v) => v.created_by).filter((id): id is string => !!id)));
    const [{ data: users }, { data: runs }] = await Promise.all([
      authorIds.length > 0
        ? supabase.from("users").select("id, full_name, email").in("id", authorIds)
        : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string }> }),
      rows.length > 0
        ? supabase.from("agent_runs").select("agent_version_id").in("agent_version_id", rows.map((v) => v.id))
        : Promise.resolve({ data: [] as Array<{ agent_version_id: string }> }),
    ]);
    const nameOf = new Map((users ?? []).map((u) => [u.id, u.full_name || u.email]));
    const runsOf = new Map<string, number>();
    for (const r of (runs ?? []) as Array<{ agent_version_id: string }>) runsOf.set(r.agent_version_id, (runsOf.get(r.agent_version_id) ?? 0) + 1);
    return NextResponse.json({
      agent,
      versions: rows.map((v) => ({ ...v, author_name: v.created_by ? (nameOf.get(v.created_by) ?? null) : null, runs: runsOf.get(v.id) ?? 0 })),
      role,
    });
  } catch (err) {
    return failure(err);
  }
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).optional(),
  system_prompt: z.string().trim().min(1).optional(),
  model_id: z.string().trim().min(1).optional(),
  reasoning_effort: z.enum(REASONING_EFFORTS as [string, ...string[]]).optional(),
  archived: z.boolean().optional(),
});

/**
 * PATCH /api/agents/[agentId] — updates an agent (organisation admins). A
 * change of prompt, model or reasoning level creates a new version; earlier
 * versions stay readable.
 */
export async function PATCH(request: NextRequest, { params }: { params: { agentId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const { data: current, error: currentError } = await supabase.from("agents").select("*").eq("id", params.agentId).maybeSingle();
    if (currentError) throw new Error(currentError.message);
    if (!current) return NextResponse.json({ error: "Agent introuvable." }, { status: 404 });
    const role = await orgRole(supabase, user.id, current.organization_id);
    if (role !== "admin") return NextResponse.json({ error: "Réservé aux administrateurs de l'organisation." }, { status: 403 });

    const input = parsed.data;
    const next = {
      system_prompt: input.system_prompt ?? current.system_prompt,
      model_id: input.model_id ?? current.model_id,
      reasoning_effort: input.reasoning_effort ?? current.reasoning_effort,
    };
    const versioned =
      next.system_prompt !== current.system_prompt ||
      next.model_id !== current.model_id ||
      next.reasoning_effort !== current.reasoning_effort;
    const version = versioned ? current.current_version + 1 : current.current_version;

    const update: Record<string, unknown> = { ...next, current_version: version };
    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
    if (input.archived !== undefined) update.archived_at = input.archived ? new Date().toISOString() : null;

    // Optimistic lock on current_version: two concurrent edits cannot both win.
    const { data: agent, error: updateError } = await supabase
      .from("agents")
      .update(update)
      .eq("id", current.id)
      .eq("current_version", current.current_version)
      .select("*")
      .maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!agent) return NextResponse.json({ error: "L'agent a été modifié entre-temps ; rechargez la fiche." }, { status: 409 });
    if (versioned) {
      const { error: versionError } = await supabase.from("agent_versions").insert({
        agent_id: current.id,
        version_number: version,
        system_prompt: next.system_prompt,
        model_id: next.model_id,
        reasoning_effort: next.reasoning_effort,
        created_by: user.id,
      });
      if (versionError) {
        await supabase
          .from("agents")
          .update({
            name: current.name,
            description: current.description,
            system_prompt: current.system_prompt,
            model_id: current.model_id,
            reasoning_effort: current.reasoning_effort,
            current_version: current.current_version,
            archived_at: current.archived_at,
          })
          .eq("id", current.id);
        throw new Error(versionError.message);
      }
    }
    return NextResponse.json({ agent, versioned });
  } catch (err) {
    return failure(err);
  }
}
