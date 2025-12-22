import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * PATCH /api/rfps/[rfpId]/analyze-presentation/[analysisId]/report
 *
 * Update the report field in the analysis_data of a presentation analysis
 *
 * Request body: { report: string }
 *
 * Response:
 *   - 200: { success: true, analysis_data: {...} }
 *   - 400: Invalid request
 *   - 401: User not authenticated
 *   - 403: Access denied
 *   - 404: Analysis not found
 *   - 500: Server error
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string; analysisId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId, analysisId } = params;

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    if (!analysisId || typeof analysisId !== "string") {
      return NextResponse.json(
        { error: "Invalid analysis ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    if (!body.report || typeof body.report !== "string") {
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

    const { data: analysis, error: fetchError } = await supabase
      .from("presentation_analyses")
      .select("id, rfp_id, analysis_data, status")
      .eq("id", analysisId)
      .eq("rfp_id", rfpId)
      .single();

    if (fetchError || !analysis) {
      console.error("Error fetching analysis:", fetchError);
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    const analysisData =
      typeof analysis.analysis_data === "string"
        ? JSON.parse(analysis.analysis_data)
        : analysis.analysis_data || {};

    const updatedAnalysisData = {
      ...analysisData,
      report: body.report,
    };

    const { error: updateError } = await supabase
      .from("presentation_analyses")
      .update({ analysis_data: updatedAnalysisData })
      .eq("id", analysisId)
      .eq("rfp_id", rfpId);

    if (updateError) {
      console.error("Error updating analysis:", updateError);
      return NextResponse.json(
        { error: "Failed to update analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      analysis_data: updatedAnalysisData,
    });
  } catch (error) {
    console.error("Error updating presentation report:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
