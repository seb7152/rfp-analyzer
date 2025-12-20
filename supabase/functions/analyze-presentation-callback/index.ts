import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PresentationCallbackRequest {
  taskId: string;
  correlationId: string;
  status: "completed" | "failed";
  result?: {
    summary: string;
    keyPoints: string[];
    suggestedResponses?: Array<{
      requirementId: string;
      originalResponse: string;
      suggestedResponse: string;
    }>;
    suggestedComments?: Array<{
      requirementId: string;
      originalComment: string;
      suggestedComment: string;
    }>;
    answeredQuestions?: Array<{
      requirementId: string;
      question: string;
      answer: string;
    }>;
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
      "[analyze-presentation-callback] Full request body keys:",
      Object.keys(body)
    );

    // N8N wraps data in a "body" object, so unwrap it first
    const payload = body.body || body;
    console.log(
      "[analyze-presentation-callback] Payload keys:",
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

    // If no status provided, default to "completed"
    if (!status) {
      status = "completed";
    }

    const result =
      payload.result || payload.data?.result || payload.output?.result;
    const error = payload.error || payload.data?.error || payload.output?.error;

    console.log("[analyze-presentation-callback] Extracted values:", {
      taskId: taskId ? "✓" : "✗",
      correlationId: correlationId ? "✓" : "✗",
      status: status ? "✓" : "✗",
      hasResult: result ? "✓" : "✗",
    });

    // Validate required fields
    if (!taskId || !correlationId) {
      console.error("[analyze-presentation-callback] Missing required fields:", {
        taskId,
        correlationId,
        status,
      });

      return new Response(
        JSON.stringify({
          error: "Missing required fields: taskId, correlationId",
          received: { taskId, correlationId, status },
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
      `[analyze-presentation-callback] Processing callback for task ${taskId}, status: ${status}`
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
      .from("presentation_analysis_tasks")
      .update(updateData)
      .eq("id", taskId)
      .select("analysis_id");

    if (taskUpdateError) {
      console.error(
        `[analyze-presentation-callback] Error updating task ${taskId}:`,
        taskUpdateError
      );
      throw taskUpdateError;
    }

    if (!updatedTask || updatedTask.length === 0) {
      console.error(`[analyze-presentation-callback] Task not found: ${taskId}`);
      return new Response(
        JSON.stringify({ error: `Task ${taskId} not found` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const analysisId = updatedTask[0].analysis_id;

    console.log(
      `[analyze-presentation-callback] Task ${taskId} updated with status ${status}, analysisId: ${analysisId}`
    );

    // If analysis completed successfully, process suggestions
    if (status === "completed" && result) {
      console.log(
        `[analyze-presentation-callback] Processing suggestions for analysis ${analysisId}`
      );

      // Process suggested responses
      if (result.suggestedResponses && Array.isArray(result.suggestedResponses)) {
        console.log(
          `[analyze-presentation-callback] Processing ${result.suggestedResponses.length} suggested responses`
        );

        for (const suggestion of result.suggestedResponses) {
          const { data: requirement, error: reqError } = await supabase
            .from("requirements")
            .select("id")
            .eq("requirement_id_external", suggestion.requirementId)
            .single();

          if (!reqError && requirement) {
            await supabase.from("presentation_response_suggestions").insert({
              analysis_id: analysisId,
              requirement_id: requirement.id,
              original_response: suggestion.originalResponse,
              suggested_response: suggestion.suggestedResponse,
              status: "pending",
            });
          }
        }
      }

      // Process suggested comments
      if (result.suggestedComments && Array.isArray(result.suggestedComments)) {
        console.log(
          `[analyze-presentation-callback] Processing ${result.suggestedComments.length} suggested comments`
        );

        for (const suggestion of result.suggestedComments) {
          const { data: requirement, error: reqError } = await supabase
            .from("requirements")
            .select("id")
            .eq("requirement_id_external", suggestion.requirementId)
            .single();

          if (!reqError && requirement) {
            const { data: existing } = await supabase
              .from("presentation_response_suggestions")
              .select("id")
              .eq("analysis_id", analysisId)
              .eq("requirement_id", requirement.id)
              .single();

            if (existing) {
              // Update existing suggestion with comment
              await supabase
                .from("presentation_response_suggestions")
                .update({
                  original_comment: suggestion.originalComment,
                  suggested_comment: suggestion.suggestedComment,
                })
                .eq("id", existing.id);
            } else {
              // Create new suggestion for comment
              await supabase.from("presentation_response_suggestions").insert({
                analysis_id: analysisId,
                requirement_id: requirement.id,
                original_comment: suggestion.originalComment,
                suggested_comment: suggestion.suggestedComment,
                status: "pending",
              });
            }
          }
        }
      }

      // Process answered questions
      if (result.answeredQuestions && Array.isArray(result.answeredQuestions)) {
        console.log(
          `[analyze-presentation-callback] Processing ${result.answeredQuestions.length} answered questions`
        );

        for (const answer of result.answeredQuestions) {
          const { data: requirement, error: reqError } = await supabase
            .from("requirements")
            .select("id")
            .eq("requirement_id_external", answer.requirementId)
            .single();

          if (!reqError && requirement) {
            const { data: existing } = await supabase
              .from("presentation_response_suggestions")
              .select("id")
              .eq("analysis_id", analysisId)
              .eq("requirement_id", requirement.id)
              .single();

            if (existing) {
              // Update existing suggestion with answered question
              await supabase
                .from("presentation_response_suggestions")
                .update({
                  original_question: answer.question,
                  answered_question: answer.answer,
                })
                .eq("id", existing.id);
            } else {
              // Create new suggestion for question answer
              await supabase.from("presentation_response_suggestions").insert({
                analysis_id: analysisId,
                requirement_id: requirement.id,
                original_question: answer.question,
                answered_question: answer.answer,
                status: "pending",
              });
            }
          }
        }
      }

      // Update analysis to completed with summary
      const analysisData = {
        summary: result.summary || "",
        keyPoints: result.keyPoints || [],
        suggestionsCount: {
          responses: result.suggestedResponses?.length || 0,
          comments: result.suggestedComments?.length || 0,
          questions: result.answeredQuestions?.length || 0,
        },
      };

      const { error: analysisUpdateError } = await supabase
        .from("presentation_analyses")
        .update({
          analysis_data: analysisData,
          status: "completed",
          completed_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", analysisId);

      if (analysisUpdateError) {
        console.error(
          `[analyze-presentation-callback] Error updating analysis ${analysisId}:`,
          analysisUpdateError
        );
        throw analysisUpdateError;
      }

      console.log(
        `[analyze-presentation-callback] Analysis ${analysisId} completed with suggestions`
      );
    } else if (status === "failed") {
      // Mark analysis as failed
      const { error: analysisUpdateError } = await supabase
        .from("presentation_analyses")
        .update({
          status: "failed",
          error_message: error || "Analysis failed in N8N",
          completed_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
        })
        .eq("id", analysisId);

      if (analysisUpdateError) {
        console.error(
          `[analyze-presentation-callback] Error marking analysis as failed:`,
          analysisUpdateError
        );
        throw analysisUpdateError;
      }

      console.log(
        `[analyze-presentation-callback] Analysis ${analysisId} marked as failed`
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Task ${taskId} callback processed`,
        taskId,
        analysisId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[analyze-presentation-callback] Error:", error);
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
