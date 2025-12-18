import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let analysisId = searchParams.get("analysisId");

    if (!analysisId) {
      return NextResponse.json({ error: "Missing analysisId" });
    }

    // Clean the analysisId (remove whitespace, newlines, etc)
    analysisId = analysisId.trim().replace(/\s+/g, "");

    if (!analysisId) {
      return NextResponse.json({ error: "Invalid analysisId after cleaning" });
    }

    // Debug: Get analysis details
    const { data: analysisArray, error: analysisError } = await supabase
      .from("defense_analyses")
      .select("*")
      .eq("id", analysisId);

    const analysis = analysisArray?.[0] || null;

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
        taskSample: tasks?.[0]
          ? {
              id: tasks[0].id,
              category_id: tasks[0].category_id,
              status: tasks[0].status,
              result: tasks[0].result,
              attempted_at: tasks[0].attempted_at,
              completed_at: tasks[0].completed_at,
            }
          : null,
      },
      debug: {
        analysisId,
        analysisExists: !!analysis,
        analysisStatus: analysis?.status,
        analysisStartedAt: analysis?.started_at,
        tasksCreated: (tasks?.length || 0) > 0,
        message:
          (tasks?.length || 0) === 0
            ? "❌ No tasks created - RPC initialize_analysis_tasks may have failed"
            : "✓ Tasks found",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
