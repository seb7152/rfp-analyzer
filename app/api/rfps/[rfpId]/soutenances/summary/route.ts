import { NextRequest, NextResponse } from "next/server";
import { READER, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { loadActiveSuppliers, loadActiveVersion } from "@/lib/agents/context";

export const dynamic = "force-dynamic";

/**
 * GET /api/rfps/[rfpId]/soutenances/summary — the chapter's short figure
 * for the sommaire: séances held (a transcript is in) over suppliers
 * retained in the active version. Cheap on purpose.
 */
export async function GET(_request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, READER);
    if (access.error) return access.error;
    const version = await loadActiveVersion(supabase, params.rfpId);
    if (!version) return NextResponse.json({ held: 0, total: 0, exploited: 0 });
    const suppliers = await loadActiveSuppliers(supabase, params.rfpId, version.id);
    const ids = suppliers.map((s) => s.id);
    if (ids.length === 0) return NextResponse.json({ held: 0, total: 0, exploited: 0 });
    const { data: sessions } = await supabase.from("soutenance_sessions").select("id, supplier_id, transcript_source").eq("rfp_id", params.rfpId).in("supplier_id", ids);
    const rows = (sessions ?? []) as Array<{ id: string; transcript_source: string | null }>;
    const held = rows.filter((s) => s.transcript_source).length;
    const heldIds = rows.filter((s) => s.transcript_source).map((s) => s.id);
    let exploited = 0;
    if (heldIds.length > 0) {
      const { data: runs } = await supabase.from("agent_runs").select("session_id, status").eq("kind", "soutenance").in("session_id", heldIds);
      const done = new Set(((runs ?? []) as Array<{ session_id: string; status: string }>).filter((r) => r.status === "completed" || r.status === "partial").map((r) => r.session_id));
      exploited = done.size;
    }
    return NextResponse.json({ held, total: ids.length, exploited });
  } catch (err) {
    return failure(err);
  }
}
