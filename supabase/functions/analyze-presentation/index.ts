import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AnalyzePresentationRequest {
  analysisId: string;
  rfpId: string;
  supplierId: string;
  transcript: string;
  versionId?: string | null;
  correlationId: string;
}

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

  // Get Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: "Missing Supabase configuration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Verify JWT Bearer token
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized: Missing token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Verify token by checking if we can get the user
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized: Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as AnalyzePresentationRequest;
    const { analysisId, rfpId, supplierId, transcript, versionId, correlationId } =
      body;

    console.log("[analyze-presentation] Request received:", {
      analysisId,
      rfpId,
      supplierId,
      transcriptLength: transcript?.length,
      versionId,
      correlationId,
    });

    if (
      !analysisId ||
      !rfpId ||
      !supplierId ||
      !transcript ||
      !correlationId
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: analysisId, rfpId, supplierId, transcript, correlationId",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[analyze-presentation] Starting analysis ${analysisId} for RFP ${rfpId}, supplier ${supplierId}`
    );

    // Update analysis status to processing
    const { error: statusError } = await supabase
      .from("presentation_analyses")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", analysisId);

    if (statusError) {
      console.error("Error updating analysis status:", statusError);
      throw statusError;
    }

    // Fetch RFP details
    const { data: rfpData, error: rfpError } = await supabase
      .from("rfps")
      .select("id, title")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfpData) {
      throw new Error(`Failed to fetch RFP: ${rfpError?.message}`);
    }

    // Fetch supplier details
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("id", supplierId)
      .single();

    if (supplierError || !supplier) {
      throw new Error(`Failed to fetch supplier: ${supplierError?.message}`);
    }

    // Fetch all requirements for the RFP
    const { data: requirements, error: reqError } = await supabase
      .from("requirements")
      .select("id, requirement_id_external, title, description")
      .eq("rfp_id", rfpId);

    if (reqError) {
      console.error("Error fetching requirements:", reqError);
      throw reqError;
    }

    // Fetch all responses for this supplier
    let responsesQuery = supabase
      .from("responses")
      .select(
        "requirement_id, response_text, question, manual_comment, ai_comment, manual_score, ai_score"
      )
      .eq("supplier_id", supplierId);

    if (versionId) {
      responsesQuery = responsesQuery.eq("version_id", versionId);
    }

    const { data: responses, error: respError } = await responsesQuery;

    if (respError) {
      console.error("Error fetching responses:", respError);
      throw respError;
    }

    console.log(
      `[analyze-presentation] Found ${requirements?.length || 0} requirements and ${responses?.length || 0} responses`
    );

    // Build N8N payload
    const n8nPayload = {
      correlationId,
      rfpId,
      supplierId,
      versionId: versionId || null,
      rfpTitle: rfpData.title,
      supplierName: supplier.name,
      transcript: transcript.trim(),
      requirements: (requirements || []).map((req) => ({
        id: req.id,
        code: req.requirement_id_external,
        title: req.title,
        description: req.description || "",
      })),
      responses: (responses || []).map((resp) => ({
        requirementId: resp.requirement_id,
        responseText: resp.response_text,
        question: resp.question,
        comment: resp.manual_comment || resp.ai_comment || "",
        score: resp.manual_score ?? resp.ai_score,
      })),
      callbackUrl: `${supabaseUrl}/functions/v1/analyze-presentation-callback`,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `[analyze-presentation] Prepared N8N payload with ${
        (requirements || []).length
      } requirements and ${(responses || []).length} responses`
    );

    // Send to N8N
    const n8nWebhookUrl =
      Deno.env.get("N8N_PRESENTATION_ANALYSIS_WEBHOOK_URL") ||
      "https://n8n.srv828065.hstgr.cloud/webhook/presentation-analysis"; // Default webhook URL

    console.log(
      `[analyze-presentation] Sending analysis to N8N webhook: ${n8nWebhookUrl}`
    );

    try {
      const n8nResponse = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(n8nPayload),
      });

      if (!n8nResponse.ok) {
        const errorText = await n8nResponse.text();
        console.error(
          `[analyze-presentation] N8N error:`,
          n8nResponse.status,
          errorText
        );

        // Update analysis to failed
        await supabase
          .from("presentation_analyses")
          .update({
            status: "failed",
            error_message: `N8N returned ${n8nResponse.status}`,
            completed_at: new Date().toISOString(),
          })
          .eq("id", analysisId);

        return new Response(
          JSON.stringify({
            error: `N8N analysis failed: ${n8nResponse.status}`,
            analysisId,
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log(`[analyze-presentation] Analysis submitted to N8N successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Presentation analysis submitted to N8N",
          analysisId,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    } catch (n8nError) {
      console.error(`[analyze-presentation] Failed to call N8N:`, n8nError);

      // Update analysis to failed
      await supabase
        .from("presentation_analyses")
        .update({
          status: "failed",
          error_message: `N8N call failed: ${String(n8nError)}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", analysisId);

      return new Response(
        JSON.stringify({
          error: "Failed to send analysis to N8N",
          analysisId,
          details: String(n8nError),
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[analyze-presentation] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
