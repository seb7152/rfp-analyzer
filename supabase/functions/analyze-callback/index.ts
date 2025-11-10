import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AnalysisResult {
  supplier_code: string;
  ai_score: number;
  ai_comment: string;
}

interface CallbackRequest {
  jobId: string;
  requirementId: string;
  status: "processing" | "completed" | "failed";
  results?: AnalysisResult[];
  error?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: new Headers() });
  }

  // Only accept PUT requests
  if (req.method !== "PUT") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as CallbackRequest & { rfpId: string };
    const { jobId, requirementId, status, results, rfpId } = body;

    // Validate required fields
    if (!jobId || !requirementId || !status || !rfpId) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: jobId, requirementId, status, rfpId",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Validate status
    if (!["processing", "completed", "failed"].includes(status)) {
      return new Response(JSON.stringify({ error: "Invalid status" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update analysis_status if status provided
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

    // Update responses with AI results if provided
    if (status === "completed" && results && Array.isArray(results)) {
      console.log(
        `[Callback] Processing ${results.length} supplier results for requirement ${requirementId}`,
      );

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
        requirements?.map((r) => [r.requirement_id_external, r.id]) || [],
      );
      const supplierMap = new Map(
        suppliers?.map((s) => [s.supplier_id_external, s.id]) || [],
      );

      // Find requirement ID
      const requirementInternalId = reqMap.get(requirementId);

      if (!requirementInternalId) {
        console.warn(`[Callback] Requirement not found: ${requirementId}`);
        return new Response(
          JSON.stringify({ error: `Requirement ${requirementId} not found` }),
          { status: 404, headers: { "Content-Type": "application/json" } },
        );
      }

      // Update each response
      let successCount = 0;

      for (const result of results) {
        const supplierId = supplierMap.get(result.supplier_code);

        if (!supplierId) {
          console.warn(
            `[Callback] Supplier not found: ${result.supplier_code}`,
          );
          continue;
        }

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
            `[Callback] Error updating response for requirement ${requirementId}, supplier ${result.supplier_code}:`,
            respError,
          );
        } else {
          successCount++;
        }
      }

      console.log(
        `[Callback] Successfully updated ${successCount}/${results.length} responses for requirement ${requirementId}`,
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: `Updated ${successCount} supplier responses for requirement ${requirementId}`,
          jobId,
          requirementId,
          updatedCount: successCount,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Callback received for requirement ${requirementId}`,
        jobId,
        requirementId,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[Callback] Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
