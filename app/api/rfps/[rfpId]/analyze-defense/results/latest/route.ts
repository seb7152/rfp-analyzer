import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const supplierId = request.nextUrl.searchParams.get("supplierId");
    const versionId = request.nextUrl.searchParams.get("versionId");

    console.log("[/latest] ===== START =====");
    console.log("[/latest] rfpId:", rfpId);
    console.log("[/latest] supplierId filter:", supplierId || "none");
    console.log("[/latest] versionId filter:", versionId || "none");

    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[/latest] User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[/latest] Authenticated user:", user.id);

    // Query defense_analysis_tasks instead of defense_analyses.analysis_data
    // This gives us real task IDs (not fake category IDs) for editing
    let query = supabase
      .from("defense_analysis_tasks")
      .select(
        `
        id,
        category_id,
        result,
        status,
        defense_analyses!inner (
          id,
          rfp_id,
          supplier_id,
          version_id,
          generated_at
        )
      `
      )
      .eq("defense_analyses.rfp_id", rfpId)
      .eq("status", "completed");

    // Filter by supplier_id if provided
    if (supplierId) {
      query = query.eq("defense_analyses.supplier_id", supplierId);
    }

    // Filter by version_id if provided
    if (versionId) {
      query = query.eq("defense_analyses.version_id", versionId);
    }

    const { data: tasks, error: analysisError } = await query.order(
      "defense_analyses.generated_at",
      { ascending: false }
    );

    console.log("[/latest] Filtered result:", {
      rfpId,
      count: tasks?.length,
      error: analysisError?.message,
    });

    if (analysisError) {
      console.error("[/latest] Error:", analysisError);
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }

    if (!tasks || tasks.length === 0) {
      console.log("[/latest] No tasks found for this rfpId");
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }

    console.log("[/latest] Processing", tasks.length, "tasks");

    // Convert tasks to the expected format
    // Now we return real task IDs instead of fake category IDs
    const resultAnalyses = tasks.map((task: any) => {
      return {
        id: task.id, // ✅ Real task UUID from defense_analysis_tasks
        task_id: task.id, // ✅ Make it explicit for frontend
        category_id: task.category_id,
        supplier_id: task.defense_analyses.supplier_id,
        status: task.status,
        result: task.result || { forces: [], faiblesses: [] },
      };
    });

    console.log("[/latest] Final resultAnalyses count:", resultAnalyses.length);

    return NextResponse.json({
      analyses: resultAnalyses,
      count: resultAnalyses.length,
    });
  } catch (error) {
    console.error(
      "[/latest] Error in latest analysis results endpoint:",
      error
    );
    return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
  }
}
