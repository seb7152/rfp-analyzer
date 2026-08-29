import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  getBearerToken,
  verifyWebhookToken,
} from "@/lib/security/webhook-auth";

/**
 * PUT /api/rfps/[rfpId]/analyze/callback
 *
 * Receive analysis results from N8N workflow for a specific requirement
 * N8N sends this for each requirement as it completes analysis
 *
 * Request body:
 * {
 *   jobId: string,
 *   requirementId: string,
 *   results: Array<{
 *     supplier_code: string,
 *     ai_score: number (0-5),
 *     ai_comment: string
 *   }>
 * }
 *
 * Response:
 *   - 200: { success: true, message: string }
 *   - 400: Invalid payload
 *   - 404: RFP not found
 *   - 500: Server error
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    const rawBody = await request.text();
    const isAuthenticated = verifyWebhookToken(
      getBearerToken(request.headers.get("authorization")),
      process.env.N8N_WEBHOOK_TOKEN
    );

    if (!isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    const { jobId, requirementId, status, results } = body;

    // Validate required fields
    if (!jobId || !requirementId || !results || !Array.isArray(results)) {
      return NextResponse.json(
        { error: "Missing required fields: jobId, requirementId, results" },
        { status: 400 }
      );
    }

    if (results.length === 0) {
      return NextResponse.json(
        { error: "results array cannot be empty" },
        { status: 400 }
      );
    }

    // Validate status if provided
    if (status && !["processing", "completed", "failed"].includes(status)) {
      return NextResponse.json(
        {
          error:
            "Invalid status. Must be 'processing', 'completed', or 'failed'",
        },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Verify RFP exists
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Get requirement and supplier mappings
    const { data: requirements } = await supabase
      .from("requirements")
      .select("id, requirement_id_external")
      .eq("rfp_id", rfpId);

    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("id, supplier_id_external")
      .eq("rfp_id", rfpId);

    const reqMap = new Map(
      requirements?.map((r) => [r.requirement_id_external, r.id]) || []
    );
    const supplierMap = new Map(
      suppliers?.map((s) => [s.supplier_id_external, s.id]) || []
    );

    // Find requirement ID from external ID
    const requirementInternalId = reqMap.get(requirementId);
    if (!requirementInternalId) {
      console.warn(`[Analysis] Requirement not found: ${requirementId}`);
      return NextResponse.json(
        { error: `Requirement ${requirementId} not found` },
        { status: 404 }
      );
    }

    // Update analysis_status if status is provided
    if (status) {
      const { error: statusError } = await supabase
        .from("rfps")
        .update({
          analysis_status: {
            jobId,
            status,
            lastUpdatedAt: new Date().toISOString(),
          },
        })
        .eq("id", rfpId);

      if (statusError) {
        console.error("Error updating analysis_status:", statusError);
      }
    }

    // Update each response with AI results for this requirement
    console.log(
      `[Analysis] Processing ${results.length} supplier results for requirement ${requirementId}`
    );

    let successCount = 0;

    for (const result of results) {
      const supplierId = supplierMap.get(result.supplier_code);

      if (!supplierId) {
        console.warn(
          `[Analysis] Supplier not found: ${result.supplier_code} for requirement ${requirementId}`
        );
        continue;
      }

      // Find and update the response
      const { error: respError } = await supabase
        .from("responses")
        .update({
          ai_score: result.ai_score,
          ai_comment: result.ai_comment,
          updated_at: new Date().toISOString(),
        })
        .eq("requirement_id", requirementInternalId)
        .eq("supplier_id", supplierId);

      if (respError) {
        console.error(
          `[Analysis] Error updating response for requirement ${requirementId}, supplier ${result.supplier_code}:`,
          respError
        );
      } else {
        successCount++;
      }
    }

    console.log(
      `[Analysis Callback] Successfully updated ${successCount}/${results.length} responses for requirement ${requirementId}`
    );

    return NextResponse.json(
      {
        success: true,
        message: `Updated ${successCount} supplier responses for requirement ${requirementId}`,
        jobId,
        requirementId,
        updatedCount: successCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing analysis callback:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
