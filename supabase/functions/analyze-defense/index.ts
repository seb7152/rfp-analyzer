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
    const { analysisId, rfpId, supplierId, versionId, correlationId } = body;

    console.log("[analyze-defense] Request received:", {
      analysisId,
      rfpId,
      supplierId,
      versionId,
      correlationId,
    });

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
      `[analyze-defense] Starting analysis ${analysisId} for RFP ${rfpId}, supplier ${supplierId}, versionId: ${versionId || "null"}`
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
      level: cat.parent_id ? 0 : 1,
      parentId: cat.parent_id,
    }));

    const { error: initError } = await supabase.rpc(
      "initialize_analysis_tasks",
      {
        p_analysis_id: analysisId,
        p_rfp_id: rfpId,
        p_category_hierarchy: categoryHierarchy,
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
        console.log(
          `[analyze-defense] Processing task ${task.id} for category ${task.category_id}`
        );

        console.log(
          `[analyze-defense-v6] Step 1: Fetching category ${task.category_id}`
        );
        const { data: category, error: catDetailError } = await supabase
          .from("categories")
          .select("id, code, title")
          .eq("id", task.category_id)
          .single();

        if (catDetailError) {
          console.error(
            `[analyze-defense-v6] ❌ Category SELECT failed:`,
            catDetailError
          );
          continue;
        }
        if (!category) {
          console.error(
            `[analyze-defense-v6] ❌ Category not found for id ${task.category_id}`
          );
          continue;
        }
        console.log(
          `[analyze-defense-v6] ✓ Category fetched: ${category.code} (${category.id})`
        );

        console.log(
          `[analyze-defense-v6] Step 2: Fetching supplier ${supplierId}`
        );
        const { data: supplier, error: supplierError } = await supabase
          .from("suppliers")
          .select("id, name")
          .eq("id", supplierId)
          .single();

        if (supplierError) {
          console.error(
            `[analyze-defense-v6] ❌ Supplier SELECT failed:`,
            supplierError
          );
          continue;
        }
        if (!supplier) {
          console.error(
            `[analyze-defense-v6] ❌ Supplier not found for id ${supplierId}`
          );
          continue;
        }
        console.log(
          `[analyze-defense-v6] ✓ Supplier fetched: ${supplier.name}`
        );

        console.log(
          `[analyze-defense-v6] Step 3: Fetching requirements for category ${task.category_id}`
        );
        const { data: requirements, error: reqError } = await supabase
          .from("requirements")
          .select("id, requirement_id_external, title, description")
          .eq("category_id", task.category_id)
          .eq("rfp_id", rfpId);

        if (reqError) {
          console.error(
            `[analyze-defense-v6] ❌ Requirements SELECT failed:`,
            reqError
          );
          continue;
        }
        if (!requirements) {
          console.error(`[analyze-defense-v6] ❌ Requirements array is null`);
          continue;
        }
        console.log(
          `[analyze-defense-v6] ✓ Found ${requirements.length} requirements`
        );

        const requirementIds = requirements.map((r) => r.id);
        console.log(
          `[analyze-defense-v6] Step 4: Fetching responses for ${requirementIds.length} requirements`
        );
        let responsesQuery = supabase
          .from("responses")
          .select(
            "id, requirement_id, response_text, question, manual_comment, ai_comment, manual_score, ai_score"
          )
          .eq("supplier_id", supplierId)
          .in("requirement_id", requirementIds);

        if (versionId) {
          responsesQuery = responsesQuery.eq("version_id", versionId);
        }

        const { data: responses, error: respError } = await responsesQuery;

        if (respError) {
          console.error(
            `[analyze-defense-v6] ❌ Responses SELECT failed:`,
            respError
          );
          continue;
        }
        if (!responses) {
          console.error(`[analyze-defense-v6] ❌ Responses array is null`);
          continue;
        }
        console.log(
          `[analyze-defense-v6] ✓ Found ${responses.length} responses`
        );

        // Use provided versionId or extract from responses if available
        const responseVersionId =
          versionId || (responses.length > 0 ? responses[0].version_id : null);

        const n8nPayload = {
          taskId: task.id,
          correlationId: `${correlationId}-${task.id}`,
          rfpId,
          supplierId,
          versionId: responseVersionId,
          categoryId: task.category_id,
          categoryCode: category.code,
          categoryName: category.title,
          categoryDescription: "",
          supplierName: supplier.name,
          requirements: requirements.map((r) => ({
            id: r.id,
            code: r.requirement_id_external,
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

        console.log(
          `[analyze-defense] N8N Payload versionId: ${n8nPayload.versionId || "null"}`
        );

        console.log(
          `[analyze-defense-v6] Step 5: Updating task status to processing for ${task.id}`
        );
        const { error: updateError } = await supabase
          .from("defense_analysis_tasks")
          .update({
            status: "processing",
            attempted_at: new Date().toISOString(),
          })
          .eq("id", task.id);

        if (updateError) {
          console.error(
            `[analyze-defense-v6] ❌ Task UPDATE failed:`,
            updateError
          );
          continue;
        }
        console.log(`[analyze-defense-v6] ✓ Task status updated to processing`);

        const n8nWebhookUrl =
          Deno.env.get("N8N_DEFENSE_ANALYSIS_WEBHOOK_URL") ||
          "https://n8n.srv828065.hstgr.cloud/webhook/1240b9c7-ca02-429a-a4e9-2d6afb74f311";

        console.log(
          `[analyze-defense-v6] Step 6: Sending task to N8N for ${category.code}`
        );

        try {
          const n8nResponse = await fetch(n8nWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(n8nPayload),
          });

          if (!n8nResponse.ok) {
            console.error(
              `[analyze-defense-v6] ❌ N8N error for task ${task.id}:`,
              n8nResponse.status,
              await n8nResponse.text()
            );
            await supabase
              .from("defense_analysis_tasks")
              .update({
                status: "failed",
                error_message: `N8N returned ${n8nResponse.status}`,
                completed_at: new Date().toISOString(),
              })
              .eq("id", task.id);
          } else {
            console.log(
              `[analyze-defense-v6] ✓ Task ${task.id} sent to N8N successfully`
            );
          }
        } catch (n8nError) {
          console.error(
            `[analyze-defense-v6] ❌ Failed to call N8N for task ${task.id}:`,
            n8nError
          );
          await supabase
            .from("defense_analysis_tasks")
            .update({
              status: "failed",
              error_message: `N8N call failed: ${String(n8nError)}`,
              completed_at: new Date().toISOString(),
            })
            .eq("id", task.id);
        }
      } catch (error) {
        console.error(
          `[analyze-defense-v6] ❌ Outer catch - Error processing task ${task.id}:`,
          error
        );
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
