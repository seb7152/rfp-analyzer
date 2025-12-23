import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string; taskId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId, taskId } = params;

    if (!rfpId || !taskId) {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { forces, faiblesses } = body;

    // Validate at least one field is provided
    if (forces === undefined && faiblesses === undefined) {
      return NextResponse.json(
        {
          error: "At least one of forces or faiblesses must be provided",
        },
        { status: 400 }
      );
    }

    // Validate arrays if provided
    if (
      forces !== undefined &&
      (!Array.isArray(forces) || !forces.every((f) => typeof f === "string"))
    ) {
      return NextResponse.json(
        { error: "forces must be an array of strings" },
        { status: 400 }
      );
    }
    if (
      faiblesses !== undefined &&
      (!Array.isArray(faiblesses) ||
        !faiblesses.every((f) => typeof f === "string"))
    ) {
      return NextResponse.json(
        { error: "faiblesses must be an array of strings" },
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

    // Fetch task and verify it belongs to RFP, check organization access
    // Also get version_id to ensure we're updating the correct version's task
    const { data: task, error: taskError } = await supabase
      .from("defense_analysis_tasks")
      .select(
        `
        id,
        result,
        analysis_id,
        defense_analyses!inner (
          id,
          rfp_id,
          version_id,
          rfps!inner (
            id,
            organization_id
          )
        )
      `
      )
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      console.error("Task fetch error:", taskError);
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify RFP ID matches
    const taskRfpId = (task.defense_analyses as any).rfps.id;
    if (taskRfpId !== rfpId) {
      return NextResponse.json(
        { error: "Task does not belong to this RFP" },
        { status: 403 }
      );
    }

    // Store version_id for logging/response
    const versionId = (task.defense_analyses as any).version_id;

    // Parse existing result
    const currentResult = task.result || {};

    console.log(
      `[PATCH task ${taskId}] Updating for RFP ${rfpId}, version ${versionId}`
    );

    // Prepare updated result - trim whitespace and filter empty strings
    const updatedResult = {
      ...currentResult,
      ...(forces !== undefined && {
        forces: forces.map((f: string) => f.trim()).filter((f: string) => f),
      }),
      ...(faiblesses !== undefined && {
        faiblesses: faiblesses
          .map((f: string) => f.trim())
          .filter((f: string) => f),
      }),
    };

    // Update task
    const { error: updateError } = await supabase
      .from("defense_analysis_tasks")
      .update({ result: updatedResult })
      .eq("id", taskId);

    if (updateError) {
      console.error("Failed to update task:", updateError);
      return NextResponse.json(
        { error: "Failed to update task" },
        { status: 500 }
      );
    }

    console.log(
      `[PATCH task ${taskId}] Update successful. Forces: ${updatedResult.forces?.length || 0}, Faiblesses: ${updatedResult.faiblesses?.length || 0}`
    );

    return NextResponse.json({
      success: true,
      result: updatedResult,
      version_id: versionId,
    });
  } catch (error) {
    console.error("Task update error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
