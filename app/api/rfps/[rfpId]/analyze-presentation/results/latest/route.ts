import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const supplierId = request.nextUrl.searchParams.get("supplierId");

    console.log("[/presentation/latest] START - rfpId:", rfpId, "supplierId:", supplierId || "none");

    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get latest presentation analyses for this RFP
    let query = supabase
      .from("presentation_analyses")
      .select("id, analysis_data, status, created_at, supplier_id")
      .eq("rfp_id", rfpId);

    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }

    const { data: analyses, error: analysisError } = await query.order(
      "created_at",
      { ascending: false }
    );

    if (analysisError) {
      console.error("[/presentation/latest] Error:", analysisError);
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }

    if (!analyses || analyses.length === 0) {
      console.log("[/presentation/latest] No analyses found");
      return NextResponse.json({ analyses: [], count: 0 }, { status: 200 });
    }

    // Take latest for each supplier (or just the latest if supplierId is specified)
    const bySupplier = new Map<string, (typeof analyses)[0]>();
    for (const analysis of analyses) {
      const key = analysis.supplier_id || "default";
      if (!bySupplier.has(key)) {
        bySupplier.set(key, analysis);
      }
    }

    const results = Array.from(bySupplier.values()).map((analysis) => {
      const analysisData =
        typeof analysis.analysis_data === "string"
          ? JSON.parse(analysis.analysis_data)
          : analysis.analysis_data;

      return {
        id: analysis.id,
        supplier_id: analysis.supplier_id,
        status: analysis.status,
        created_at: analysis.created_at,
        analysis_data: analysisData,
      };
    });

    console.log("[/presentation/latest] Returning", results.length, "analyses");

    return NextResponse.json({
      analyses: results,
      count: results.length,
    });
  } catch (error) {
    console.error("[/presentation/latest] Error:", error);
    return NextResponse.json(
      { analyses: [], count: 0 },
      { status: 200 }
    );
  }
}
