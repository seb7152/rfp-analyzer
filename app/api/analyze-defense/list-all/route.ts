import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(_request: NextRequest) {
  try {
    // Get all analyses
    const { data: analyses, error: analysesError } = await supabase
      .from("defense_analyses")
      .select("id, rfp_id, status, created_at, started_at, last_updated_at")
      .order("created_at", { ascending: false })
      .limit(10);

    if (analysesError) {
      return NextResponse.json({ error: analysesError });
    }

    // For each analysis, count tasks by status
    const analysesWithTaskCounts = await Promise.all(
      (analyses || []).map(async (analysis) => {
        const { data: tasks } = await supabase
          .from("defense_analysis_tasks")
          .select("status")
          .eq("analysis_id", analysis.id);

        const statusCounts = tasks?.reduce(
          (acc: Record<string, number>, task: any) => {
            acc[task.status] = (acc[task.status] || 0) + 1;
            return acc;
          },
          {}
        );

        return {
          ...analysis,
          taskCounts: statusCounts,
          totalTasks: tasks?.length || 0,
        };
      })
    );

    return NextResponse.json({
      count: analysesWithTaskCounts.length,
      analyses: analysesWithTaskCounts,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
