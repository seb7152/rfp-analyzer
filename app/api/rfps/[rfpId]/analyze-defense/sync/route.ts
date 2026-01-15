import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId } = params;

    const body = await request.json();
    const { analysisId } = body;

    if (!analysisId) {
      return NextResponse.json(
        { error: "analysisId is required" },
        { status: 400 }
      );
    }

    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[SYNC] Syncing analysis ${analysisId} for RFP ${rfpId}`);

    // Call the RPC function to sync single analysis
    // This will update defense_analyses.analysis_data from defense_analysis_tasks
    const { data: syncResult, error: syncError } = await supabase.rpc(
      "sync_single_analysis_data",
      {
        p_analysis_id: analysisId,
      }
    );

    if (syncError) {
      console.error("RPC sync error:", syncError);
      return NextResponse.json(
        { error: "Failed to sync analysis", details: syncError.message },
        { status: 500 }
      );
    }

    console.log(
      `[SYNC] Sync successful for analysis ${analysisId}`,
      syncResult
    );

    return NextResponse.json({
      success: true,
      analysis_id: analysisId,
      result: syncResult,
    });
  } catch (error) {
    console.error("Sync endpoint error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
