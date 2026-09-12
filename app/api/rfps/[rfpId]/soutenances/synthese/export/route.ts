import { NextRequest, NextResponse } from "next/server";
import { READER, failure, requireRfpAccess, requireUser } from "@/lib/agents/auth";
import { loadOverview } from "@/lib/soutenance/api";
import { buildSynthesePptx } from "@/lib/soutenance/pptx";

export const dynamic = "force-dynamic";

/** POST /api/rfps/[rfpId]/soutenances/synthese/export — the point de synthèse as a .pptx file. */
export async function POST(_request: NextRequest, { params }: { params: { rfpId: string } }) {
  try {
    const { supabase, user, error } = await requireUser();
    if (error) return error;
    const access = await requireRfpAccess(params.rfpId, user.id, READER);
    if (access.error) return access.error;
    const overview = await loadOverview(supabase, params.rfpId, user.id, access.access);
    if (overview instanceof NextResponse) return overview;
    const pptx = buildSynthesePptx(overview);
    const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
    const filename = `point-de-synthese-${overview.rfp.title.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.pptx`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return failure(err);
  }
}
