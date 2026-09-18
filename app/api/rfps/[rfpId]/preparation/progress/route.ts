import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { checkRFPAccess } from "@/lib/permissions/rfp-access";

export const dynamic = "force-dynamic";

export interface PreparationProgress {
  total: number;
  answered: number;
  scored: number;
  suppliers: Array<{ id: string; total: number; answered: number; scored: number }>;
}

/**
 * GET /api/rfps/[rfpId]/preparation/progress?versionId= — the response
 * counters alone, aggregated in the database: what the hub polls while an
 * analysis runs, instead of the whole preparation payload.
 */
export async function GET(request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { rfpId } = params;
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const access = await checkRFPAccess(rfpId, user.id);
    if (!access.hasAccess) return NextResponse.json({ error: "RFP not found" }, { status: 404 });

    const versionIdParam = request.nextUrl.searchParams.get("versionId");
    let versionId: string | null = null;
    if (versionIdParam) {
      const { data: version } = await supabase.from("evaluation_versions").select("id").eq("id", versionIdParam).eq("rfp_id", rfpId).maybeSingle();
      if (!version) return NextResponse.json({ error: "Version not found" }, { status: 404 });
      versionId = version.id;
    } else {
      const { data: active } = await supabase.from("evaluation_versions").select("id").eq("rfp_id", rfpId).eq("is_active", true).maybeSingle();
      versionId = active?.id ?? null;
    }

    const { data, error } = await supabase.rpc("preparation_progress", { p_rfp_id: rfpId, p_version_id: versionId });
    if (error) return NextResponse.json({ error: `Avancement illisible : ${error.message}` }, { status: 500 });
    const rows = (data ?? []) as Array<{ supplier_id: string; total: number; answered: number; scored: number }>;
    const suppliers = rows.map((r) => ({ id: r.supplier_id, total: Number(r.total), answered: Number(r.answered), scored: Number(r.scored) }));
    const progress: PreparationProgress = {
      total: suppliers.reduce((n, s) => n + s.total, 0),
      answered: suppliers.reduce((n, s) => n + s.answered, 0),
      scored: suppliers.reduce((n, s) => n + s.scored, 0),
      suppliers,
    };
    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error in GET /api/rfps/[rfpId]/preparation/progress:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
