import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  request: NextRequest,
  _: { params: { rfpId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get("analysisId");

    // Debug: Get analysis details
    const { data: analysis, error: analysisError } = await supabase
      .from("defense_analyses")
      .select("*")
      .eq("id", analysisId)
      .single();

    // Debug: Get all tasks for this analysis
    const { data: tasks, error: tasksError } = await supabase
      .from("defense_analysis_tasks")
      .select("id, category_id, status, result, attempted_at, completed_at")
      .eq("analysis_id", analysisId);

    // Debug: Get task counts by status
    const { data: taskStats } = await supabase
      .from("defense_analysis_tasks")
      .select("status")
      .eq("analysis_id", analysisId);

    const statusCounts = taskStats?.reduce(
      (acc: Record<string, number>, task: any) => {
        acc[task.status] = (acc[task.status] || 0) + 1;
        return acc;
      },
      {}
    );

    return NextResponse.json({
      analysis: {
        ...analysis,
        error: analysisError,
      },
      tasks: {
        data: tasks,
        error: tasksError,
        count: tasks?.length || 0,
        statusCounts,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
