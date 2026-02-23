// Edge Function: generate-soutenance
// Chemin: supabase/functions/generate-soutenance/index.ts
// Pattern: calqué sur supabase/functions/analyze-presentation/index.ts

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface GenerateSoutenanceRequest {
  briefId: string;
  rfpId: string;
  supplierId: string;
  versionId?: string | null;
  correlationId: string;
  targetStatuses: string[];
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

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = (await req.json()) as GenerateSoutenanceRequest;
    const {
      briefId,
      rfpId,
      supplierId,
      versionId,
      correlationId,
      targetStatuses,
    } = body;

    console.log("[generate-soutenance] Request received:", {
      briefId,
      rfpId,
      supplierId,
      versionId,
      correlationId,
      targetStatuses,
    });

    if (
      !briefId ||
      !rfpId ||
      !supplierId ||
      !correlationId ||
      !targetStatuses?.length
    ) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: briefId, rfpId, supplierId, correlationId, targetStatuses",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Mettre à jour le statut en "processing"
    const { error: statusError } = await supabase
      .from("soutenance_briefs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
      })
      .eq("id", briefId);

    if (statusError) {
      console.error(
        "[generate-soutenance] Error updating status:",
        statusError
      );
      throw statusError;
    }

    // Récupérer les infos du RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, title")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      throw new Error(`Failed to fetch RFP: ${rfpError?.message}`);
    }

    // Récupérer les infos du fournisseur
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("id", supplierId)
      .single();

    if (supplierError || !supplier) {
      throw new Error(`Failed to fetch supplier: ${supplierError?.message}`);
    }

    // Récupérer les réponses filtrées par statut
    let responsesQuery = supabase
      .from("responses")
      .select(
        "id, requirement_id, response_text, question, manual_comment, ai_comment, manual_score, ai_score, status"
      )
      .eq("supplier_id", supplierId)
      .in("status", targetStatuses);

    if (versionId) {
      responsesQuery = responsesQuery.eq("version_id", versionId);
    }

    const { data: responses, error: respError } = await responsesQuery;

    if (respError) {
      console.error(
        "[generate-soutenance] Error fetching responses:",
        respError
      );
      throw respError;
    }

    if (!responses || responses.length === 0) {
      console.log(
        "[generate-soutenance] No responses found with target statuses"
      );
      await supabase
        .from("soutenance_briefs")
        .update({
          status: "completed",
          report_markdown:
            "# Brief de Soutenance\n\nAucune exigence avec les statuts sélectionnés n'a été trouvée.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", briefId);

      return new Response(
        JSON.stringify({
          success: true,
          briefId,
          message: "No matching responses",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Récupérer les exigences correspondantes
    const requirementIds = [...new Set(responses.map((r) => r.requirement_id))];
    const { data: requirements, error: reqError } = await supabase
      .from("requirements")
      .select("id, requirement_id_external, title, description")
      .in("id", requirementIds);

    if (reqError) {
      console.error(
        "[generate-soutenance] Error fetching requirements:",
        reqError
      );
      throw reqError;
    }

    const requirementsMap = new Map((requirements || []).map((r) => [r.id, r]));

    // Construire le payload N8N
    const n8nPayload = {
      briefId,
      correlationId,
      rfpId,
      supplierId,
      rfpTitle: rfp.title,
      supplierName: supplier.name,
      versionId: versionId || null,
      targetStatuses,
      requirements: responses
        .map((resp) => {
          const req = requirementsMap.get(resp.requirement_id);
          if (!req) return null;
          return {
            id: req.id,
            code: req.requirement_id_external,
            title: req.title,
            description: req.description || "",
            status: resp.status,
            response: {
              text: resp.response_text,
              question: resp.question,
              comment: resp.manual_comment || resp.ai_comment || "",
              score: resp.manual_score ?? resp.ai_score,
            },
          };
        })
        .filter(Boolean),
      callbackUrl: `${supabaseUrl}/functions/v1/generate-soutenance-callback`,
      timestamp: new Date().toISOString(),
    };

    console.log(
      `[generate-soutenance] Sending ${n8nPayload.requirements.length} requirements to N8N`
    );

    const n8nWebhookUrl = Deno.env.get("N8N_SOUTENANCE_WEBHOOK_URL");

    if (!n8nWebhookUrl) {
      throw new Error(
        "Missing N8N_SOUTENANCE_WEBHOOK_URL environment variable"
      );
    }

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(n8nPayload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error(
        `[generate-soutenance] N8N error:`,
        n8nResponse.status,
        errorText
      );

      await supabase
        .from("soutenance_briefs")
        .update({
          status: "failed",
          error_message: `N8N returned ${n8nResponse.status}`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", briefId);

      return new Response(
        JSON.stringify({
          error: `N8N analysis failed: ${n8nResponse.status}`,
          briefId,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[generate-soutenance] Brief submitted to N8N successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        briefId,
        message: "Brief generation submitted to N8N",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[generate-soutenance] Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
