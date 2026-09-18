import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PILOT, READER, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { loadCategories, subtreeIds } from "@/lib/agents/context";

export const dynamic = "force-dynamic";

/**
 * GET /api/rfps/[rfpId]/agents/assignments — the domains of level 1 and 2
 * with their leaf counts, the agents assigned, and the coverage.
 */
export async function GET(_request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, READER);
    if (access.error) return access.error;

    const [categories, { data: leafRows, error: leafError }, { data: assignments, error: assignError }] = await Promise.all([
      loadCategories(supabase, params.rfpId),
      supabase.from("requirements").select("id, category_id").eq("rfp_id", params.rfpId),
      supabase
        .from("rfp_agent_assignments")
        .select("id, rfp_id, agent_id, category_id, created_at, agents(id, name, model_id, current_version, archived_at)")
        .eq("rfp_id", params.rfpId),
    ]);
    if (leafError) throw new Error(leafError.message);
    if (assignError) throw new Error(assignError.message);

    const leavesByCategory = new Map<string, number>();
    for (const r of (leafRows ?? []) as Array<{ id: string; category_id: string | null }>) {
      if (!r.category_id) continue;
      leavesByCategory.set(r.category_id, (leavesByCategory.get(r.category_id) ?? 0) + 1);
    }
    const subtreeLeaves = (id: string) => subtreeIds(categories, id).reduce((n, c) => n + (leavesByCategory.get(c) ?? 0), 0);

    const domains = categories
      .filter((c) => c.level <= 2)
      .map((c) => ({ id: c.id, code: c.code, title: c.title, level: c.level, parent_id: c.parent_id, leaves: subtreeLeaves(c.id) }));

    const covered = new Set<string>();
    const rows = (assignments ?? []) as Array<{ id: string; agent_id: string; category_id: string; created_at: string; agents: unknown }>;
    for (const a of rows) {
      for (const cid of subtreeIds(categories, a.category_id)) covered.add(cid);
    }
    const totalLeaves = Array.from(leavesByCategory.values()).reduce((n, v) => n + v, 0);
    const coveredLeaves = Array.from(covered).reduce((n, c) => n + (leavesByCategory.get(c) ?? 0), 0);

    return NextResponse.json({
      access: access.access,
      domains,
      assignments: rows,
      coverage: { covered: coveredLeaves, total: totalLeaves },
    });
  } catch (err) {
    return failure(err);
  }
}

const createSchema = z.object({ agent_id: z.string().uuid(), category_id: z.string().uuid() });

/** POST — assigns an agent to a domain (consultation owner). */
export async function POST(request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    const parsed = createSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "agent_id et category_id sont requis." }, { status: 400 });

    const { data, error: insertError } = await supabase
      .from("rfp_agent_assignments")
      .insert({ rfp_id: params.rfpId, agent_id: parsed.data.agent_id, category_id: parsed.data.category_id, created_by: user.id })
      .select("id, rfp_id, agent_id, category_id, created_at")
      .single();
    if (insertError) {
      const conflict = insertError.code === "23505" || insertError.code === "23514" || /couverte|affecté|niveau 1 ou 2|n'appartient/.test(insertError.message);
      return NextResponse.json(
        { error: conflict ? insertError.message.replace(/^.*?: /, "") : `Affectation refusée : ${insertError.message}` },
        { status: conflict ? 409 : 500 }
      );
    }
    return NextResponse.json({ assignment: data }, { status: 201 });
  } catch (err) {
    return failure(err);
  }
}
