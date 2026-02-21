import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * PATCH /api/rfps/[rfpId]/soutenance/[briefId]/report
 *
 * Met à jour le rapport markdown d'un brief de soutenance (édition manuelle).
 *
 * Request body: { report: string }
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string; briefId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId, briefId } = params;

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    if (!briefId || typeof briefId !== "string") {
      return NextResponse.json({ error: "Invalid brief ID" }, { status: 400 });
    }

    const body = await request.json();

    if (typeof body.report !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid report field" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the brief exists and belongs to this RFP
    const { data: brief, error: fetchError } = await supabase
      .from("soutenance_briefs")
      .select("id, rfp_id, status")
      .eq("id", briefId)
      .eq("rfp_id", rfpId)
      .single();

    if (fetchError || !brief) {
      return NextResponse.json({ error: "Brief not found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("soutenance_briefs")
      .update({
        report_markdown: body.report,
        updated_at: new Date().toISOString(),
      })
      .eq("id", briefId)
      .eq("rfp_id", rfpId);

    if (updateError) {
      console.error("[/soutenance/[briefId]/report PATCH] Error:", updateError);
      return NextResponse.json(
        { error: "Failed to update brief report" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[/soutenance/[briefId]/report PATCH] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
