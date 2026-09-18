import { NextRequest, NextResponse } from "next/server";
import { READER, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { loadActiveVersion } from "@/lib/agents/context";
import { getCatalogue } from "@/lib/agents/openrouter";
import { estimateRuns, planRuns } from "@/lib/agents/plan";

export const dynamic = "force-dynamic";

/**
 * GET /api/rfps/[rfpId]/agents/estimate — what a launch would run and cost,
 * from the real context length (approximate by construction).
 */
export async function GET(_request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, READER);
    if (access.error) return access.error;
    const version = await loadActiveVersion(supabase, params.rfpId);
    if (!version) return NextResponse.json({ error: "Aucune version d'évaluation active." }, { status: 409 });
    const [planned, catalogue] = await Promise.all([
      planRuns(supabase, params.rfpId, version.id),
      getCatalogue().catch(() => null),
    ]);
    const estimate = estimateRuns(planned, catalogue);
    return NextResponse.json({ ...estimate, version, catalogueAvailable: catalogue !== null });
  } catch (err) {
    return failure(err);
  }
}
