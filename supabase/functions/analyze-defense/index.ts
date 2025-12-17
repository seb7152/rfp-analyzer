import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AnalyzeDefenseRequest {
  analysisId: string;
  rfpId: string;
  supplierId: string;
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

  try {
    const body = (await req.json()) as AnalyzeDefenseRequest;
    const { analysisId, rfpId, supplierId, correlationId } = body;

    if (!analysisId || !rfpId || !supplierId || !correlationId) {
      return new Response(
        JSON.stringify({
          error:
            "Missing required fields: analysisId, rfpId, supplierId, correlationId",
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
      `[analyze-defense] Starting analysis ${analysisId} for RFP ${rfpId}, supplier ${supplierId}`
    );

    const { error: statusError } = await supabase
      .from("defense_analyses")
      .update({
        status: "analyzing_leaves",
        started_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
      })
      .eq("id", analysisId);

    if (statusError) {
      console.error("Error updating analysis status:", statusError);
      throw statusError;
    }

    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, parent_id, level")
      .eq("rfp_id", rfpId)
      .order("level", { ascending: true });

    if (catError || !categories) {
      throw new Error(`Failed to fetch categories: ${catError?.message}`);
    }

    const categoryHierarchy = categories.map((cat) => ({
      id: cat.id,
      level: cat.parent_id ? 1 : 0,
      parentId: cat.parent_id,
    }));

    const { error: initError } = await supabase.rpc(
      "initialize_analysis_tasks",
      {
        p_analysis_id: analysisId,
        p_rfp_id: rfpId,
        p_category_hierarchy: JSON.stringify(categoryHierarchy),
      }
    );

    if (initError) {
      console.error("Error initializing analysis tasks:", initError);
      throw initError;
    }

    const { data: leafTasks, error: tasksError } = await supabase
      .from("defense_analysis_tasks")
      .select("id, category_id")
      .eq("analysis_id", analysisId)
      .eq("hierarchy_level", 0)
      .eq("status", "pending");

    if (tasksError) {
      console.error("Error fetching leaf tasks:", tasksError);
      throw tasksError;
    }

    if (!leafTasks || leafTasks.length === 0) {
      console.log("[analyze-defense] No leaf categories to analyze");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No leaf categories to analyze",
          analysisId,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(
      `[analyze-defense] Found ${leafTasks.length} leaf categories to analyze`
    );

    const { data: rfpData, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id, analysis_settings")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfpData) {
      throw new Error(`Failed to fetch RFP: ${rfpError?.message}`);
    }

    for (const task of leafTasks) {
      try {
        const { data: category, error: catDetailError } = await supabase
          .from("categories")
          .select("id, code, title, description")
          .eq("id", task.category_id)
          .single();

        if (catDetailError || !category) {
          console.warn(
            `[analyze-defense] Failed to fetch category ${task.category_id}`
          );
          continue;
        }

        const { data: supplier, error: supplierError } = await supabase
          .from("suppliers")
          .select("id, name")
          .eq("id", supplierId)
          .single();

        if (supplierError || !supplier) {
          console.warn(
            `[analyze-defense] Failed to fetch supplier ${supplierId}`
          );
          continue;
        }

        const { data: requirements, error: reqError } = await supabase
          .from("requirements")
          .select("id, code, title, description")
          .eq("category_id", task.category_id)
          .eq("rfp_id", rfpId);

        if (reqError || !requirements) {
          console.warn(
            `[analyze-defense] Failed to fetch requirements for category ${task.category_id}`
          );
          continue;
        }

        const requirementIds = requirements.map((r) => r.id);
        const { data: responses, error: respError } = await supabase
          .from("responses")
          .select(
            "id, requirement_id, response_text, question, manual_comment, ai_comment, manual_score, ai_score"
          )
          .eq("supplier_id", supplierId)
          .in("requirement_id", requirementIds);

        if (respError || !responses) {
          console.warn(
            `[analyze-defense] Failed to fetch responses for category ${task.category_id}`
          );
          continue;
        }

        const n8nPayload = {
          taskId: task.id,
          correlationId: `${correlationId}-${task.id}`,
          rfpId,
          supplierId,
          categoryId: task.category_id,
          categoryCode: category.code,
          categoryName: category.title,
          categoryDescription: category.description || "",
          supplierName: supplier.name,
          requirements: requirements.map((r) => ({
            id: r.id,
            code: r.code,
            title: r.title,
            description: r.description || "",
          })),
          responses: responses.map((r) => ({
            requirementId: r.requirement_id,
            responseText: r.response_text,
            question: r.question,
            comment: r.manual_comment || r.ai_comment || "",
            score: r.manual_score ?? r.ai_score,
          })),
          callbackUrl: `${supabaseUrl}/functions/v1/analyze-defense-callback`,
          timestamp: new Date().toISOString(),
        };

        await supabase
          .from("defense_analysis_tasks")
          .update({
            status: "processing",
            attempted_at: new Date().toISOString(),
          })
          .eq("id", task.id);

        const n8nWebhookUrl =
          Deno.env.get("N8N_DEFENSE_ANALYSIS_WEBHOOK_URL") ||
          "https://n8n.srv828065.hstgr.cloud/webhook/1240b9c7-ca02-429a-a4e9-2d6afb74f311";

        console.log(
          `[analyze-defense] Sending task ${task.id} to N8N for category ${category.code}`
        );

        try {
          const n8nResponse = await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(n8nPayload),
          });

          if (!n8nResponse.ok) {
            console.error(
              `[analyze-defense] N8N error for task ${task.id}:`,
              n8nResponse.status
            );
            await supabase
              .from("defense_analysis_tasks")
              .update({
                status: "failed",
                error_message: `N8N returned ${n8nResponse.status}`,
                completed_at: new Date().toISOString(),
              })
              .eq("id", task.id);
          }
        } catch (n8nError) {
          console.error(
            `[analyze-defense] Failed to call N8N for task ${task.id}:`,
            n8nError
          );
          await supabase
            .from("defense_analysis_tasks")
            .update({
              status: "failed",
              error_message: `N8N call failed: ${n8nError}`,
              completed_at: new Date().toISOString(),
            })
            .eq("id", task.id);
        }
      } catch (error) {
        console.error(`[analyze-defense] Error processing task:`, error);
      }
    }

    console.log(`[analyze-defense] Submitted ${leafTasks.length} tasks to N8N`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Submitted ${leafTasks.length} leaf categories for analysis`,
        analysisId,
        taskCount: leafTasks.length,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[analyze-defense] Error:", error);
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
