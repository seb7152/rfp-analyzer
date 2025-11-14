import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/rfps/[rfpId]/analyze
 *
 * Trigger AI analysis for supplier responses
 * Sends requirement context and supplier responses to N8N webhook
 *
 * Request body: {} (empty for now)
 *
 * Response:
 *   - 200: { success: true, jobId: string, message: string }
 *   - 400: Invalid RFP ID
 *   - 401: User not authenticated
 *   - 404: RFP not found or no responses to analyze
 *   - 500: Server error or webhook failure
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { rfpId: string } },
) {
  try {
    const { rfpId } = params;

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    // Use server client with RLS
    const supabase = await createServerClient();

    // Verify RFP exists and user has access (RLS)
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json(
        { error: "RFP not found or access denied" },
        { status: 404 },
      );
    }

    // Fetch all requirements with their details
    const { data: requirements, error: reqError } = await supabase
      .from("requirements")
      .select("id, requirement_id_external, title, description, context, level")
      .eq("rfp_id", rfpId)
      .order("display_order", { ascending: true });

    if (reqError || !requirements) {
      return NextResponse.json(
        { error: "Failed to fetch requirements" },
        { status: 500 },
      );
    }

    // Fetch all responses with supplier information
    const { data: responses, error: respError } = await supabase
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
      `,
      )
      .eq("rfp_id", rfpId);

    if (respError || !responses) {
      return NextResponse.json(
        { error: "Failed to fetch responses" },
        { status: 500 },
      );
    }

    // Filter to only leaf requirements (level 4)
    const leafRequirements = requirements.filter((r) => r.level === 4);

    if (leafRequirements.length === 0) {
      return NextResponse.json(
        { error: "No leaf requirements found" },
        { status: 404 },
      );
    }

    // Get all suppliers
    const { data: suppliers, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, supplier_id_external, name")
      .eq("rfp_id", rfpId);

    if (supplierError) {
      return NextResponse.json(
        { error: "Failed to fetch suppliers" },
        { status: 500 },
      );
    }

    // Build payload for N8N webhook
    const payload = {
      rfp_id: rfpId,
      requirements: leafRequirements.map((req) => {
        // Get all responses for this requirement
        const reqResponses = responses
          .filter((r) => r.requirement_id === req.id)
          .map((r) => {
            const supplier = Array.isArray(r.suppliers)
              ? r.suppliers[0]
              : r.suppliers;
            return {
              supplier_code: supplier?.supplier_id_external || "unknown",
              supplier_name: supplier?.name || "unknown",
              response_text: r.response_text || "",
            };
          });

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

    // Get webhook URL from environment
    const webhookUrl = process.env.N8N_WEBHOOK_PROD;

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "N8N_WEBHOOK_PROD environment variable not configured" },
        { status: 500 },
      );
    }

    // Send payload to N8N webhook
    console.log(`[N8N] Sending analysis request to ${webhookUrl}`);
    console.log(`[N8N] Payload:`, JSON.stringify(payload, null, 2));

    const webhookResponse = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(
        `[N8N] Webhook failed: ${webhookResponse.status} - ${errorText}`,
      );
      return NextResponse.json(
        {
          error: "Failed to send analysis request to N8N",
          details: errorText,
        },
        { status: 500 },
      );
    }

    const jobResult = await webhookResponse.json();
    console.log(`[N8N] Webhook response:`, jobResult);

    return NextResponse.json(
      {
        success: true,
        jobId: `job_${Date.now()}`,
        message: "Analysis request sent to N8N",
        requirements_count: leafRequirements.length,
        suppliers_count: suppliers?.length || 0,
        total_responses: responses.length,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[N8N] Error triggering analysis:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
