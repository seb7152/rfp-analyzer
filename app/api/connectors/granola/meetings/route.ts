import { NextRequest, NextResponse } from "next/server";
import { EVALUATOR, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { GranolaError, listNotesAround } from "@/lib/connectors/granola";
import { granolaAccess } from "@/lib/soutenance/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/connectors/granola/meetings?rfpId=…&around=ISO — the meetings the
 * member's key sees around a date (the séance's, else today), newest first.
 * Titles and attendees only: the transcript is fetched when one is chosen.
 */
export async function GET(request: NextRequest) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const rfpId = request.nextUrl.searchParams.get("rfpId");
    if (!rfpId) return NextResponse.json({ error: "rfpId est requis." }, { status: 400 });
    const access = await requireRfpAccess(rfpId, user.id, EVALUATOR);
    if (access.error) return access.error;
    const { data: rfp } = await supabase.from("rfps").select("organization_id").eq("id", rfpId).single();
    const granola = await granolaAccess(supabase, (rfp as { organization_id: string }).organization_id, user.id, access.access);
    if (granola.error) return granola.error;
    const aroundRaw = request.nextUrl.searchParams.get("around");
    const around = aroundRaw && !Number.isNaN(Date.parse(aroundRaw)) ? new Date(aroundRaw) : new Date();
    try {
      const notes = await listNotesAround(granola.key.key, around, 10);
      return NextResponse.json({
        scope: granola.key.scope,
        meetings: notes.map((n) => ({
          id: n.id,
          title: n.title || "Sans titre",
          created_at: n.created_at,
          attendees: (n.attendees ?? []).map((a) => a.name || a.email || "").filter(Boolean),
        })),
      });
    } catch (err) {
      if (err instanceof GranolaError) return NextResponse.json({ error: err.message }, { status: 502 });
      throw err;
    }
  } catch (err) {
    return failure(err);
  }
}
