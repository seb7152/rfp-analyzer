import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const supplierId = request.nextUrl.searchParams.get("supplierId");

    console.log("[/latest] ===== START =====");
    console.log("[/latest] rfpId:", rfpId);
    console.log("[/latest] supplierId filter:", supplierId || "none");

    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.log("[/latest] User not authenticated");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[/latest] Authenticated user:", user.id);

    // Get latest analyses for this RFP (RLS will filter by user's organization)
    let query = supabase
      .from("defense_analyses")
      .select("id, analysis_data, generated_at, rfp_id, supplier_id")
      .eq("rfp_id", rfpId);

    // Filter by supplier_id if provided
    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }

    const { data: analyses, error: analysisError } = await query.order(
      "generated_at",
      { ascending: false }
    );

    console.log("[/latest] Filtered result:", {
      rfpId,
      count: analyses?.length,
      error: analysisError?.message,
    });

    if (analysisError) {
      console.error("[/latest] Error:", analysisError);
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }

    if (!analyses || analyses.length === 0) {
      console.log("[/latest] No analyses found for this rfpId");
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }

    console.log("[/latest] Processing", analyses.length, "analyses");

    // If supplier_id was provided, take only the first (latest) analysis for that supplier
    // If not provided, return all analyses (one per supplier) - group by supplier and take latest for each
    let analysesToProcess: typeof analyses = [];

    if (supplierId) {
      // Single supplier: take the latest
      analysesToProcess = [analyses[0]];
      console.log(
        "[/latest] Single supplier mode, using latest analysis for supplier",
        supplierId
      );
    } else {
      // Multi-supplier mode: group by supplier_id and take latest for each
      const bySupplier = new Map<string, typeof analyses[0]>();
      for (const analysis of analyses) {
        const key = analysis.supplier_id || "default";
        if (!bySupplier.has(key)) {
          bySupplier.set(key, analysis);
          console.log(
            "[/latest] Found latest analysis for supplier",
            key,
            "with id",
            analysis.id
          );
        }
      }
      analysesToProcess = Array.from(bySupplier.values());
      console.log(
        "[/latest] Multi-supplier mode, using latest for each of",
        analysesToProcess.length,
        "suppliers"
      );
    }

    // Parse all analysis_data and convert to task-like format
    try {
      const allResultAnalyses: any[] = [];

      for (const analysis of analysesToProcess) {
        if (!analysis.analysis_data) {
          console.log(
            "[/latest] Skipping analysis",
            analysis.id,
            "- no analysis_data"
          );
          continue;
        }

        // Supabase returns JSONB as an object, not a string
        const analysisData =
          typeof analysis.analysis_data === "string"
            ? JSON.parse(analysis.analysis_data)
            : analysis.analysis_data;

        console.log(
          "[/latest] Analysis",
          analysis.id,
          "for supplier",
          analysis.supplier_id || "default",
          "has",
          Object.keys(analysisData).length,
          "categories"
        );

        const resultAnalyses = Object.entries(analysisData).map(
          ([categoryId, data]: [string, any]) => {
            return {
              id: categoryId,
              category_id: categoryId,
              supplier_id: analysis.supplier_id,
              status: "completed",
              result: {
                forces: data.forces || [],
                faiblesses: data.faiblesses || [],
              },
            };
          }
        );

        allResultAnalyses.push(...resultAnalyses);
      }

      console.log(
        "[/latest] Final resultAnalyses count:",
        allResultAnalyses.length
      );

      return NextResponse.json({
        analyses: allResultAnalyses,
        count: allResultAnalyses.length,
        analysisId: analysesToProcess[0]?.id,
      });
    } catch (parseError) {
      console.error("[/latest] Error parsing analysis_data:", parseError);
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }
  } catch (error) {
    console.error(
      "[/latest] Error in latest analysis results endpoint:",
      error
    );
    return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
  }
}
