import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get("analysisId");

    if (!analysisId) {
      return NextResponse.json(
        { error: "Missing analysisId parameter" },
        { status: 400 }
      );
    }

    // Fetch all completed tasks for this analysis with their results
    const { data: tasks, error } = await supabase
      .from("defense_analysis_tasks")
      .select("id, category_id, status, result")
      .eq("analysis_id", analysisId)
      .eq("status", "completed")
      .not("result", "is", null);

    if (error) {
      console.error("Error fetching analysis results:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      analyses: tasks || [],
      count: tasks?.length || 0,
    });
  } catch (error) {
    console.error("Error in analyze-defense results endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
