import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    console.log("[/latest] Fetching latest analysis for rfpId:", rfpId);

    // Get ALL analyses for this RFP first (without .single())
    const { data: analyses, error: analysisError } = await supabase
      .from("defense_analyses")
      .select("id, analysis_data, generated_at")
      .eq("rfp_id", rfpId)
      .order("generated_at", { ascending: false });

    console.log("[/latest] Query result:", {
      rfpId,
      count: analyses?.length,
      error: analysisError,
      analyses: analyses?.map((a) => ({
        id: a.id,
        hasData: !!a.analysis_data,
      })),
    });

    if (analysisError) {
      console.error("[/latest] Error fetching analyses:", analysisError);
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }

    if (!analyses || analyses.length === 0) {
      console.log("[/latest] No analyses found for rfpId:", rfpId);
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }

    const latestAnalysis = analyses[0];

    if (!latestAnalysis.analysis_data) {
      console.log("[/latest] No analysis_data in latest analysis");
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }

    // Parse analysis_data and convert to task-like format
    try {
      const analysisData = JSON.parse(latestAnalysis.analysis_data);
      const resultAnalyses = Object.entries(analysisData).map(
        ([categoryId, data]: [string, any]) => ({
          id: categoryId,
          category_id: categoryId,
          status: "completed",
          result: {
            forces: data.forces || [],
            faiblesses: data.faiblesses || [],
          },
        })
      );

      console.log("[/latest] Parsed analyses:", resultAnalyses.length);

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
