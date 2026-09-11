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
    return NextResponse.json({ agent, versions: versions ?? [], role });
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

    if (versioned) {
      const { error: versionError } = await supabase.from("agent_versions").insert({
        agent_id: current.id,
        version_number: version,
        system_prompt: next.system_prompt,
        model_id: next.model_id,
        reasoning_effort: next.reasoning_effort,
        created_by: user.id,
      });
      if (versionError) throw new Error(versionError.message);
    }
    const { data: agent, error: updateError } = await supabase.from("agents").update(update).eq("id", current.id).select("*").single();
    if (updateError || !agent) throw new Error(updateError?.message ?? "Agent non mis à jour.");
    return NextResponse.json({ agent, versioned });
  } catch (err) {
    return failure(err);
  }
}
