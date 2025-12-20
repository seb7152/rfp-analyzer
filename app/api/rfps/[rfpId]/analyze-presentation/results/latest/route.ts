import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const supplierId = request.nextUrl.searchParams.get("supplierId");
    const versionId = request.nextUrl.searchParams.get("versionId");

    console.log("[/presentation/latest] START");
    console.log("[/presentation/latest] rfpId:", rfpId);
    console.log("[/presentation/latest] supplierId filter:", supplierId || "none");
    console.log("[/presentation/latest] versionId filter:", versionId || "none");

    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[/presentation/latest] User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[/presentation/latest] Authenticated user:", user.id);

    // Get latest presentation analyses for this RFP
    let query = supabase
      .from("presentation_analyses")
      .select("id, analysis_data, status, created_at, rfp_id, supplier_id, transcript")
      .eq("rfp_id", rfpId);

    // Filter by supplier_id if provided
    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }

    // Filter by version_id if provided
    if (versionId) {
      query = query.eq("version_id", versionId);
    }

    const { data: analyses, error: analysisError } = await query.order(
      "created_at",
      { ascending: false }
    );

    console.log("[/presentation/latest] Query result:", {
      rfpId,
      count: analyses?.length,
      error: analysisError?.message,
    });

    if (analysisError) {
      console.error("[/presentation/latest] Error:", analysisError);
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }

    if (!analyses || analyses.length === 0) {
      console.log("[/presentation/latest] No analyses found for this rfpId");
      return NextResponse.json({ analyses: [], count: 0, suggestions: [] }, { status: 200 });
    }

    console.log("[/presentation/latest] Processing", analyses.length, "analyses");

    // If supplier_id was provided, take only the first (latest) analysis for that supplier
    // If not provided, return all analyses (one per supplier)
    let analysesToProcess: typeof analyses = [];

    if (supplierId) {
      // Single supplier: take the latest
      analysesToProcess = [analyses[0]];
      console.log(
        "[/presentation/latest] Single supplier mode, using latest analysis for supplier",
        supplierId
      );
    } else {
      // Multi-supplier mode: group by supplier_id and take latest for each
      const bySupplier = new Map<string, (typeof analyses)[0]>();
      for (const analysis of analyses) {
        const key = analysis.supplier_id || "default";
        if (!bySupplier.has(key)) {
          bySupplier.set(key, analysis);
          console.log(
            "[/presentation/latest] Found latest analysis for supplier",
            key,
            "with id",
            analysis.id
          );
        }
      }
      analysesToProcess = Array.from(bySupplier.values());
      console.log(
        "[/presentation/latest] Multi-supplier mode, using latest for each of",
        analysesToProcess.length,
        "suppliers"
      );
    }

    // Get suggestions for these analyses
    const analysisIds = analysesToProcess.map((a) => a.id);
    const { data: suggestions, error: suggestionsError } = await supabase
      .from("presentation_response_suggestions")
      .select("id, analysis_id, requirement_id, original_response, suggested_response, original_comment, suggested_comment, original_question, answered_question, status")
      .in("analysis_id", analysisIds);

    if (suggestionsError) {
      console.error("[/presentation/latest] Error fetching suggestions:", suggestionsError);
    }

    console.log(
      "[/presentation/latest] Found",
      suggestions?.length || 0,
      "suggestions"
    );

    // Parse analysis data
    try {
      const results: any[] = [];

      for (const analysis of analysesToProcess) {
        const analysisData =
          typeof analysis.analysis_data === "string"
            ? JSON.parse(analysis.analysis_data)
            : analysis.analysis_data;

        console.log(
          "[/presentation/latest] Analysis",
          analysis.id,
          "status:",
          analysis.status
        );

        results.push({
          id: analysis.id,
          analysis_id: analysis.id,
          supplier_id: analysis.supplier_id,
          rfp_id: analysis.rfp_id,
          transcript: analysis.transcript,
          status: analysis.status,
          created_at: analysis.created_at,
          analysis_data: analysisData,
          suggestions_count: suggestions?.filter(
            (s) => s.analysis_id === analysis.id
          ).length || 0,
        });
      }

      console.log(
        "[/presentation/latest] Final result count:",
        results.length
      );

      return NextResponse.json({
        analyses: results,
        suggestions: suggestions || [],
        count: results.length,
      });
    } catch (parseError) {
      console.error("[/presentation/latest] Error parsing analysis_data:", parseError);
      return NextResponse.json({ analyses: [], suggestions: [], count: 0 }, { status: 200 });
    }
  } catch (error) {
    console.error(
      "[/presentation/latest] Error in presentation analysis results endpoint:",
      error
    );
    return NextResponse.json(
      { analyses: [], suggestions: [], count: 0 },
      { status: 200 }
    );
  }
}
