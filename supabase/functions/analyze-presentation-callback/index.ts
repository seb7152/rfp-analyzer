import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PresentationCallbackRequest {
  correlationId: string;
  status: "completed" | "failed";
  result?: {
    summary: string;
    keyPoints: string[];
    suggestions?: Array<{
      requirementId: string;
      suggestedResponse?: string;
      suggestedComment?: string;
      answeredQuestion?: string;
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
      "[analyze-presentation-callback] Request body keys:",
      Object.keys(body)
    );

    // N8N may wrap data in a "body" object, unwrap if needed
    const payload = body.body || body;

    // Handle both camelCase and snake_case field names
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

    // Default to "completed" if not provided
    if (!status) {
      status = "completed";
    }

    const result =
      payload.result || payload.data?.result || payload.output?.result;
    const error = payload.error || payload.data?.error || payload.output?.error;

    console.log("[analyze-presentation-callback] Extracted values:", {
      correlationId: correlationId ? "✓" : "✗",
      status: status ? "✓" : "✗",
      hasResult: result ? "✓" : "✗",
    });

    // Validate required field
    if (!correlationId) {
      console.error("[analyze-presentation-callback] Missing correlationId:", {
        correlationId,
        status,
        payloadKeys: Object.keys(payload),
      });

      return new Response(
        JSON.stringify({
          error: "Missing required field: correlationId",
          received: { correlationId, status },
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
      `[analyze-presentation-callback] Processing callback for correlation ${correlationId}, status: ${status}`
    );

    // Find the analysis by correlation_id
    const { data: analyses, error: findError } = await supabase
      .from("presentation_analyses")
      .select("id")
      .eq("correlation_id", correlationId)
      .single();

    if (findError || !analyses) {
      console.error(
        `[analyze-presentation-callback] Analysis not found for correlation ${correlationId}`
      );
      return new Response(
        JSON.stringify({
          error: "Analysis not found for this correlation ID",
          correlationId,
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const analysisId = analyses.id;

    // Build analysis data
    const updateData: any = {
      status,
      completed_at: new Date().toISOString(),
    };

    if (status === "completed") {
      // Store complete analysis results
      updateData.analysis_data = {
        summary: result?.summary || "",
        keyPoints: result?.keyPoints || [],
        suggestions: result?.suggestions || [],
      };
    } else if (status === "failed") {
      updateData.error_message = error || "Analysis failed in N8N";
    }

    if (error) {
      updateData.error_message = error;
    }

    // Update analysis record
    const { error: updateError } = await supabase
      .from("presentation_analyses")
      .update(updateData)
      .eq("id", analysisId);

    if (updateError) {
      console.error(
        `[analyze-presentation-callback] Error updating analysis ${analysisId}:`,
        updateError
      );
      throw updateError;
    }

    console.log(
      `[analyze-presentation-callback] Analysis ${analysisId} updated with status ${status}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Analysis callback processed`,
        analysisId,
        correlationId,
        status,
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
