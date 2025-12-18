import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    console.log("[/latest] ===== START =====");
    console.log("[/latest] rfpId:", rfpId);

    // Get ALL analyses first
    const { data: allData } = await supabase
      .from("defense_analyses")
      .select("id, rfp_id, generated_at");

    console.log("[/latest] ALL data in DB:", {
      count: allData?.length,
      sample: allData?.slice(0, 3),
    });

    // Get latest analyses for this RFP
    const { data: analyses, error: analysisError } = await supabase
      .from("defense_analyses")
      .select("id, analysis_data, generated_at, rfp_id")
      .eq("rfp_id", rfpId)
      .order("generated_at", { ascending: false });

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

    const latestAnalysis = analyses[0];

    if (!latestAnalysis.analysis_data) {
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }

    // Parse analysis_data and convert to task-like format
    try {
      // Supabase returns JSONB as an object, not a string
      const analysisData =
        typeof latestAnalysis.analysis_data === "string"
          ? JSON.parse(latestAnalysis.analysis_data)
          : latestAnalysis.analysis_data;

      console.log(
        "[/latest] analysis_data keys count:",
        Object.keys(analysisData).length
      );
      console.log(
        "[/latest] analysis_data object:",
        JSON.stringify(analysisData, null, 2)
      );

      const resultAnalyses = Object.entries(analysisData).map(
        ([categoryId, data]: [string, any]) => {
          console.log(`[/latest] Entry for ${categoryId}:`, {
            forces_count: data.forces?.length,
            faiblesses_count: data.faiblesses?.length,
            sample_force: data.forces?.[0]?.substring(0, 50),
          });
          return {
            id: categoryId,
            category_id: categoryId,
            status: "completed",
            result: {
              forces: data.forces || [],
              faiblesses: data.faiblesses || [],
            },
          };
        }
      );

      console.log(
        "[/latest] Final resultAnalyses count:",
        resultAnalyses.length
      );

      return NextResponse.json({
        analyses: resultAnalyses,
        count: resultAnalyses.length,
        analysisId: latestAnalysis.id,
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
