import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface CallbackRequest {
  taskId: string;
  correlationId: string;
  status: "completed" | "failed";
  result?: {
    forces: string[];
    faiblesses: string[];
  };
  error?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: new Headers() });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as any;

    console.log(
      "[analyze-defense-callback] Full request body:",
      JSON.stringify(body, null, 2)
    );
    console.log("[analyze-defense-callback] Body keys:", Object.keys(body));

    // N8N wraps data in a "body" object, so unwrap it first
    const payload = body.body || body;
    console.log(
      "[analyze-defense-callback] Payload keys:",
      Object.keys(payload)
    );

    // Handle both camelCase and snake_case field names
    const taskId =
      payload.taskId ||
      payload.task_id ||
      payload.data?.taskId ||
      payload.data?.task_id;
    const correlationId =
      payload.correlationId ||
      payload.correlation_id ||
      payload.data?.correlationId ||
      payload.data?.correlation_id;
    let status =
      payload.status ||
      payload.data?.status ||
      payload.execution?.status ||
      payload.data?.execution?.status;

    // If no status provided, default to "completed" (N8N must have processed it to call the callback)
    if (!status) {
      status = "completed";
    }

    const result =
      payload.result || payload.data?.result || payload.output?.result;
    const error = payload.error || payload.data?.error || payload.output?.error;

    console.log("[analyze-defense-callback] Extracted values:", {
      taskId: taskId ? "✓" : "✗",
      correlationId: correlationId ? "✓" : "✗",
      status: status ? "✓" : "✗",
    });

    // Validate required fields (status now has default)
    if (!taskId || !correlationId) {
      console.error("[analyze-defense-callback] Missing required fields:", {
        taskId,
        correlationId,
        status,
        bodyKeys: Object.keys(body),
      });

      return new Response(
        JSON.stringify({
          error: "Missing required fields: taskId, correlationId, status",
          received: { taskId, correlationId, status },
          bodyKeys: Object.keys(body),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(
      `[analyze-defense-callback] Processing callback for task ${taskId}, status: ${status}`
    );

    // Update the task with results
    const updateData: any = {
      status,
      completed_at: new Date().toISOString(),
    };

    if (status === "completed" && result) {
      updateData.result = result;
    }

    if (error) {
      updateData.error_message = error;
    }

    const { data: updatedTask, error: taskUpdateError } = await supabase
      .from("defense_analysis_tasks")
      .update(updateData)
      .eq("id", taskId)
      .select("analysis_id, category_id");

    if (taskUpdateError) {
      console.error(
        `[analyze-defense-callback] Error updating task ${taskId}:`,
        taskUpdateError
      );
      throw taskUpdateError;
    }

    if (!updatedTask || updatedTask.length === 0) {
      console.error(`[analyze-defense-callback] Task not found: ${taskId}`);
      return new Response(
        JSON.stringify({ error: `Task ${taskId} not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const analysisId = updatedTask[0].analysis_id;
    const categoryId = updatedTask[0].category_id;

    console.log(
      `[analyze-defense-callback] Task ${taskId} updated with status ${status}, analysisId: ${analysisId}`
    );

    // Check if all LEAF tasks (hierarchy_level = 0) for this analysis are complete
    // Parent tasks (hierarchy_level = 1) are for synthesis and will be handled separately
    const { data: leafTasks, error: tasksError } = await supabase
      .from("defense_analysis_tasks")
      .select("id, status, category_id, result")
      .eq("analysis_id", analysisId)
      .eq("hierarchy_level", 0);

    if (tasksError) {
      console.error(
        `[analyze-defense-callback] Error fetching analysis tasks:`,
        tasksError
      );
      throw tasksError;
    }

    if (!leafTasks) {
      console.error(
        `[analyze-defense-callback] No leaf tasks found for analysis ${analysisId}`
      );
      throw new Error(`No leaf tasks found for analysis ${analysisId}`);
    }

    const completedCount = leafTasks.filter(
      (t) => t.status === "completed"
    ).length;
    const totalCount = leafTasks.length;

    console.log(
      `[analyze-defense-callback] Analysis ${analysisId} leaf tasks progress: ${completedCount}/${totalCount} completed`
    );

    // If all LEAF tasks are complete, aggregate results
    if (completedCount === totalCount && totalCount > 0) {
      console.log(
        `[analyze-defense-callback] All leaf tasks completed for analysis ${analysisId}, aggregating results`
      );

      // Build aggregated analysis data
      const analysisData: Record<string, any> = {};

      console.log(
        `[analyze-defense-callback] Processing ${leafTasks.length} leaf tasks`
      );

      for (let i = 0; i < leafTasks.length; i++) {
        const task = leafTasks[i];
        if (task.result && task.category_id) {
          // CRITICAL: Deep clone immediately to break any shared references from Supabase
          const clonedResult = JSON.parse(JSON.stringify(task.result));

          analysisData[task.category_id] = clonedResult;

          // Debug first 3 tasks
          if (i < 3) {
            console.log(
              `[analyze-defense-callback] Task ${i} - ${task.category_id}:`,
              {
                forces_sample: clonedResult.forces?.[0]?.substring(0, 50),
                forces_count: clonedResult.forces?.length,
              }
            );
          }
        }
      }

      console.log(
        `[analyze-defense-callback] Aggregated data for ${Object.keys(analysisData).length} categories`
      );

      // Update the defense_analyses record with aggregated data
      const { error: analysisUpdateError } = await supabase
        .from("defense_analyses")
        .update({
          analysis_data: analysisData,
          status: "completed",
          completed_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", analysisId);

      if (analysisUpdateError) {
        console.error(
          `[analyze-defense-callback] Error updating analysis ${analysisId}:`,
          analysisUpdateError
        );
        throw analysisUpdateError;
      }

      console.log(
        `[analyze-defense-callback] Analysis ${analysisId} completed with ${Object.keys(analysisData).length} category results`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Task ${taskId} callback processed`,
        taskId,
        analysisId,
        categoryId,
        progress: `${completedCount}/${totalCount}`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[analyze-defense-callback] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
