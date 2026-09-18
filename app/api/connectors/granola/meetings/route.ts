import { NextRequest, NextResponse } from "next/server";
import { EVALUATOR, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { GranolaError, enrichNotes, listNotesAround } from "@/lib/connectors/granola";
import { granolaAccess } from "@/lib/soutenance/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/connectors/granola/meetings?rfpId=…&around=ISO&supplierId=…&q=…&enrich=1 —
 * the meetings the member's key sees around a date (the séance's, else
 * today); with enrich, each note's summary is read and the ones that mention
 * the supplier (or the free terms) come first. The transcript is fetched when
 * one is chosen.
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
    const supplierId = request.nextUrl.searchParams.get("supplierId");
    const terms = (request.nextUrl.searchParams.get("q") ?? "")
      .split(/[,;]/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (supplierId) {
      const { data: supplier } = await supabase.from("suppliers").select("name").eq("id", supplierId).eq("rfp_id", rfpId).maybeSingle();
      if (supplier) terms.unshift((supplier as { name: string }).name);
    }
    const enrich = request.nextUrl.searchParams.get("enrich") === "1";
    try {
      const listed = await listNotesAround(granola.key.key, around, 10);
      // The list is quick; reading each note's summary to spot the supplier takes seconds, so the client asks for it in a second call.
      const notes = enrich ? await enrichNotes(granola.key.key, listed, terms) : listed.map((n) => ({ ...n, folder: null, mentions: [], snippet: null }));
      notes.sort((a, b) => Number(b.mentions.length > 0) - Number(a.mentions.length > 0) || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return NextResponse.json({
        scope: granola.key.scope,
        terms,
        meetings: notes.map((n) => ({
          id: n.id,
          title: n.title || "Sans titre",
          created_at: n.created_at,
          attendees: (n.attendees ?? []).map((a) => a.name || a.email || "").filter(Boolean),
          folder: n.folder,
          mentions: n.mentions,
          snippet: n.snippet,
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
