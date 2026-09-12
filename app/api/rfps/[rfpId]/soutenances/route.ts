import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { PILOT, READER, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { loadOverview } from "@/lib/soutenance/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/rfps/[rfpId]/soutenances — the chapter: domain scores on the
 * active version, the point de synthèse, one séance per supplier, the
 * version that receives the proposals, the connector's availability.
 */
export async function GET(_request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, READER);
    if (access.error) return access.error;
    const overview = await loadOverview(supabase, params.rfpId, user.id, access.access);
    if (overview instanceof NextResponse) return overview;
    return NextResponse.json(overview);
  } catch (err) {
    return failure(err);
  }
}

const patchSchema = z.object({
  /** null: back to "the active version". */
  target_version_id: z.string().uuid().nullable(),
});

/** PATCH — the version the reprises apply to (pilots). */
export async function PATCH(request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, PILOT);
    if (access.error) return access.error;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Données invalides." }, { status: 400 });
    if (parsed.data.target_version_id) {
      const { data: v } = await supabase.from("evaluation_versions").select("id").eq("id", parsed.data.target_version_id).eq("rfp_id", params.rfpId).maybeSingle();
      if (!v) return NextResponse.json({ error: "Version introuvable sur cette consultation." }, { status: 404 });
    }
    const { error: uError } = await supabase.from("rfps").update({ soutenance_target_version_id: parsed.data.target_version_id }).eq("id", params.rfpId);
    if (uError) throw new Error(uError.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return failure(err);
  }
}
