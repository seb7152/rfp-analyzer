import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { loadActiveSuppliers } from "@/lib/agents/context";
import { checkRFPAccess } from "@/lib/permissions/rfp-access";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  versionId: z.string().uuid(),
  requirementIds: z.array(z.string().uuid()).min(1).max(2_000),
});

/**
 * POST /api/rfps/[rfpId]/review-statuses/sync — the automatic step of the
 * peer review, for every requirement at once: a requirement whose answers
 * are all checked leaves « draft » (approved for a pilot, submitted for an
 * evaluator) without having to be opened. Rejected ones wait for a hand.
 */
export async function POST(request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { hasAccess, accessLevel } = await checkRFPAccess(params.rfpId, user.id);
    if (!hasAccess || accessLevel === "viewer") return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    const { versionId, requirementIds } = parsed.data;

    const db = createServiceClient();
    const { data: rfp } = await db.from("rfps").select("peer_review_enabled").eq("id", params.rfpId).maybeSingle();
    if (!rfp) return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    if (!(rfp as { peer_review_enabled: boolean }).peer_review_enabled) return NextResponse.json({ statuses: [] });

    const active = new Set((await loadActiveSuppliers(db, params.rfpId, versionId)).map((s) => s.id));
    const [{ data: responses }, { data: existing }] = await Promise.all([
      db.from("responses").select("requirement_id, supplier_id, is_checked").eq("version_id", versionId).in("requirement_id", requirementIds),
      db.from("requirement_review_status").select("requirement_id, status").eq("version_id", versionId).in("requirement_id", requirementIds),
    ]);
    const byReq = new Map<string, { total: number; checked: number }>();
    for (const r of (responses ?? []) as Array<{ requirement_id: string; supplier_id: string; is_checked: boolean }>) {
      if (!active.has(r.supplier_id)) continue;
      const c = byReq.get(r.requirement_id) ?? { total: 0, checked: 0 };
      c.total++;
      if (r.is_checked) c.checked++;
      byReq.set(r.requirement_id, c);
    }
    const status = new Map(((existing ?? []) as Array<{ requirement_id: string; status: string }>).map((s) => [s.requirement_id, s.status]));
    const target = accessLevel === "owner" || accessLevel === "admin" ? "approved" : "submitted";
    const now = new Date().toISOString();
    const rows = requirementIds
      .filter((id) => {
        const c = byReq.get(id);
        const current = status.get(id) ?? "draft";
        return !!c && c.total > 0 && c.checked === c.total && (current === "draft" || (target === "approved" && current === "submitted"));
      })
      .map((id) => ({
        requirement_id: id,
        version_id: versionId,
        status: target,
        updated_at: now,
        ...(target === "approved" ? { reviewed_by: user.id, reviewed_at: now, rejection_comment: null } : { submitted_by: user.id, submitted_at: now, rejection_comment: null, reviewed_by: null, reviewed_at: null }),
      }));
    if (rows.length === 0) return NextResponse.json({ statuses: [] });
    const { data: updated, error } = await db
      .from("requirement_review_status")
      .upsert(rows, { onConflict: "requirement_id,version_id" })
      .select("id, requirement_id, version_id, status, submitted_by, submitted_at, reviewed_by, reviewed_at, rejection_comment, created_at, updated_at");
    if (error) return NextResponse.json({ error: `Statuts non mis à jour : ${error.message}` }, { status: 500 });
    return NextResponse.json({ statuses: updated ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Internal server error" }, { status: 500 });
  }
}
