import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AnalyzeRequest {
  rfpId: string;
  systemPrompt?: string;
  supplierId?: string;
}

interface RequirementPayload {
  requirement_id: string;
  title: string;
  content: string;
  context: string;
  suppliers_responses: Array<{
    supplier_code: string;
    supplier_name: string;
    response_text: string;
  }>;
}

interface N8NPayload {
  rfp_id: string;
  jobId: string;
  system_prompt: string;
  requirements: RequirementPayload[];
  timestamp: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { rfpId, systemPrompt, supplierId } = (await req.json()) as AnalyzeRequest;

    if (!rfpId) {
      return new Response(JSON.stringify({ error: "Missing rfpId" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create Supabase client with service role (can access all data)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all requirements for this RFP
    const { data: requirements, error: reqError } = await supabase
      .from("requirements")
      .select("id, requirement_id_external, title, description, context, level")
      .eq("rfp_id", rfpId)
      .order("display_order", { ascending: true });

    if (reqError || !requirements) {
      throw new Error(`Failed to fetch requirements: ${reqError?.message}`);
    }

    // Fetch responses — filtered by supplierId when targeting a single supplier
    let responsesQuery = supabase
      .from("responses")
      .select(
        `
        id,
        requirement_id,
        supplier_id,
        response_text,
        suppliers:supplier_id (
          supplier_id_external,
          name
        )
      `
      )
      .eq("rfp_id", rfpId);

    if (supplierId) {
      responsesQuery = responsesQuery.eq("supplier_id", supplierId);
    }

    const { data: responses, error: respError } = await responsesQuery;

    if (respError || !responses) {
      throw new Error(`Failed to fetch responses: ${respError?.message}`);
    }

    // Get suppliers — filtered to the targeted supplier when specified
    let suppliersQuery = supabase
      .from("suppliers")
      .select("id, supplier_id_external, name")
      .eq("rfp_id", rfpId);

    if (supplierId) {
      suppliersQuery = suppliersQuery.eq("id", supplierId);
    }

    const { data: suppliers, error: supplierError } = await suppliersQuery;

    if (supplierError) {
      throw new Error(`Failed to fetch suppliers: ${supplierError?.message}`);
    }

    // Get all requirements with parent_id to determine leaf requirements
    const { data: allReqsWithParent } = await supabase
      .from("requirements")
      .select("id, parent_id")
      .eq("rfp_id", rfpId);

    // Build set of all parent IDs
    const parentIds = new Set(
      allReqsWithParent?.map((r) => r.parent_id).filter((id) => id !== null) ||
        []
    );

    // Leaf requirements are those not in the parentIds set
    const leafRequirements = requirements.filter((r) => !parentIds.has(r.id));

    if (leafRequirements.length === 0) {
      return new Response(
        JSON.stringify({ error: "No leaf requirements found" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Generate jobId
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save system prompt to RFP settings if provided
    if (systemPrompt) {
      const { error: updateError } = await supabase
        .from("rfps")
        .update({
          analysis_settings: {
            system_prompt: systemPrompt,
            last_updated: new Date().toISOString(),
          },
        })
        .eq("id", rfpId);

      if (updateError) {
        console.error(
          `[Edge Function] Failed to update RFP settings: ${updateError.message}`
        );
        // Continue anyway, not critical
      }
    }

    // Build N8N payload
    const payload: N8NPayload = {
      rfp_id: rfpId,
      jobId,
      system_prompt: systemPrompt || "",
      requirements: leafRequirements.map((req) => {
        const reqResponses = responses
          .filter((r) => r.requirement_id === req.id)
          .map((r) => ({
            supplier_code: r.suppliers?.supplier_id_external || "unknown",
            supplier_name: r.suppliers?.name || "unknown",
            response_text: r.response_text || "",
          }));

        return {
          requirement_id: req.requirement_id_external,
          title: req.title,
          content: req.description || "",
          context: req.context || "",
          suppliers_responses: reqResponses,
        };
      }),
      timestamp: new Date().toISOString(),
    };

    // Get N8N webhook URL from environment
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_PROD");

    if (!n8nWebhookUrl) {
      throw new Error("N8N_WEBHOOK_PROD environment variable not set");
    }

    // Send to N8N
    console.log(`[Edge Function] Sending analysis to N8N for RFP ${rfpId}`);
    console.log(`[Edge Function] JobId: ${jobId}`);

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error(
        `[Edge Function] N8N error: ${n8nResponse.status} - ${errorText}`
      );
      throw new Error(`N8N webhook failed: ${n8nResponse.status}`);
    }

    const n8nResult = await n8nResponse.json();
    console.log(`[Edge Function] N8N response:`, n8nResult);

    return new Response(
      JSON.stringify({
        success: true,
        jobId,
        message: "Analysis request sent to N8N",
        requirements_count: leafRequirements.length,
        suppliers_count: suppliers?.length || 0,
        total_responses: responses.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    console.error("[Edge Function] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
