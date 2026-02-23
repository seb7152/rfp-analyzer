// Edge Function: generate-soutenance-callback
// Chemin: supabase/functions/generate-soutenance-callback/index.ts
// Pattern: calqué sur supabase/functions/analyze-presentation-callback/index.ts

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: new Headers() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as any;
    console.log("[generate-soutenance-callback] Request body keys:", Object.keys(body));

    // N8N peut wrapper les données dans un objet "body"
    const payload = body.body || body;

    // Gestion des variantes camelCase / snake_case
    const correlationId =
      payload.correlationId ||
      payload.correlation_id ||
      payload.data?.correlationId ||
      payload.data?.correlation_id;

    let status =
      payload.status ||
      payload.data?.status ||
      payload.execution?.status;

    // Défaut à "completed" si non fourni
    if (!status) {
      status = "completed";
    }

    const result = payload.result || payload.data?.result;
    const error = payload.error || payload.data?.error;

    console.log("[generate-soutenance-callback] Extracted values:", {
      correlationId: correlationId ? "✓" : "✗",
      status,
      hasResult: result ? "✓" : "✗",
    });

    if (!correlationId) {
      console.error("[generate-soutenance-callback] Missing correlationId");
      return new Response(
        JSON.stringify({ error: "Missing required field: correlationId" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Trouver le brief par correlation_id
    const { data: brief, error: findError } = await supabase
      .from("soutenance_briefs")
      .select("id")
      .eq("correlation_id", correlationId)
      .single();

    if (findError || !brief) {
      console.error(
        `[generate-soutenance-callback] Brief not found for correlation ${correlationId}`
      );
      return new Response(
        JSON.stringify({ error: "Brief not found for this correlation ID", correlationId }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const updateData: Record<string, unknown> = {
      status,
      completed_at: new Date().toISOString(),
    };

    if (status === "completed" && result?.report) {
      updateData.report_markdown = result.report;
    } else if (status === "failed") {
      updateData.error_message = error || "Analysis failed in N8N";
    }

    if (error) {
      updateData.error_message = error;
    }

    const { error: updateError } = await supabase
      .from("soutenance_briefs")
      .update(updateData)
      .eq("id", brief.id);

    if (updateError) {
      console.error("[generate-soutenance-callback] Error updating brief:", updateError);
      throw updateError;
    }

    console.log(
      `[generate-soutenance-callback] Brief ${brief.id} updated with status ${status}`
    );

    return new Response(
      JSON.stringify({ success: true, briefId: brief.id, correlationId, status }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-soutenance-callback] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
