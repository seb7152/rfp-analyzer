import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string; analysisId: string }> }
) {
  try {
    const params = await context.params;
    const { requirementId, status } = await request.json();

    if (!requirementId || !status) {
      return NextResponse.json(
        { error: "Missing requirementId or status" },
        { status: 400 }
      );
    }

    if (!["inserted", "pending", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Get JWT token from cookies for authenticated requests
    const token = request.cookies.get("sb-access-token")?.value;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        },
      }
    );

    // Get current suggestions_status
    const { data: analysis, error: fetchError } = await supabase
      .from("presentation_analyses")
      .select("suggestions_status")
      .eq("id", params.analysisId)
      .eq("rfp_id", params.rfpId)
      .single();

    if (fetchError || !analysis) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Update suggestions_status with new status for this requirement
    const currentStatus = analysis.suggestions_status || {};
    const updatedStatus = {
      ...currentStatus,
      [requirementId]: status,
    };

    const { error: updateError } = await supabase
      .from("presentation_analyses")
      .update({ suggestions_status: updatedStatus })
      .eq("id", params.analysisId)
      .eq("rfp_id", params.rfpId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      suggestions_status: updatedStatus,
    });
  } catch (error) {
    console.error("Error updating suggestion status:", error);
    return NextResponse.json(
      { error: "Failed to update suggestion status" },
      { status: 500 }
    );
  }
}
