import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AnalyzeRequest {
  rfpId: string;
  requirementId: string;
  supplierId: string;
  responseText: string;
  systemPrompt?: string;
}

interface N8NPayload {
  rfp_id: string;
  requirement_id: string;
  supplier_id: string;
  requirement_title: string;
  requirement_description: string;
  requirement_context: string;
  supplier_code: string;
  supplier_name: string;
  response_text: string;
  system_prompt: string;
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
    const {
      rfpId,
      requirementId,
      supplierId,
      responseText,
      systemPrompt,
    } = (await req.json()) as AnalyzeRequest;

    if (!rfpId || !requirementId || !supplierId || !responseText) {
      return new Response(
        JSON.stringify({
          error: "Missing required parameters: rfpId, requirementId, supplierId, responseText",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create Supabase client with service role (can access all data)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the requirement details
    const { data: requirement, error: reqError } = await supabase
      .from("requirements")
      .select("id, requirement_id_external, title, description, context")
      .eq("id", requirementId)
      .eq("rfp_id", rfpId)
      .single();

    if (reqError || !requirement) {
      throw new Error(`Failed to fetch requirement: ${reqError?.message}`);
    }

    // Fetch supplier details
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, supplier_id_external, name")
      .eq("id", supplierId)
      .eq("rfp_id", rfpId)
      .single();

    if (supplierError || !supplier) {
      throw new Error(`Failed to fetch supplier: ${supplierError?.message}`);
    }

    // Fetch RFP to get system prompt if not provided
    let finalSystemPrompt = systemPrompt;
    if (!finalSystemPrompt) {
      const { data: rfp, error: rfpError } = await supabase
        .from("rfps")
        .select("analysis_settings")
        .eq("id", rfpId)
        .single();

      if (!rfpError && rfp?.analysis_settings?.system_prompt) {
        finalSystemPrompt = rfp.analysis_settings.system_prompt;
      }
    }

    // Build N8N payload for single response analysis
    const payload: N8NPayload = {
      rfp_id: rfpId,
      requirement_id: requirementId,
      supplier_id: supplierId,
      requirement_title: requirement.title,
      requirement_description: requirement.description || "",
      requirement_context: requirement.context || "",
      supplier_code: supplier.supplier_id_external,
      supplier_name: supplier.name,
      response_text: responseText,
      system_prompt: finalSystemPrompt || "",
      timestamp: new Date().toISOString(),
    };

    // Get N8N webhook URL from environment
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_PROD");

    if (!n8nWebhookUrl) {
      throw new Error("N8N_WEBHOOK_PROD environment variable not set");
    }

    // Send to N8N
    console.log(
      `[Edge Function] Sending analysis to N8N for response: requirement=${requirementId}, supplier=${supplierId}`
    );

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

    // Extract ai_comment and ai_score from N8N response
    const aiComment = n8nResult?.ai_comment || "";
    const aiScore = n8nResult?.ai_score || 0;

    return new Response(
      JSON.stringify({
        success: true,
        aiComment,
        aiScore,
        message: "Single response analysis completed",
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
