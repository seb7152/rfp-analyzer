import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    const body = await request.json();
    const { supplierId, transcript, versionId } = body;

    console.log("[/analyze-presentation] Request body:", {
      supplierId,
      transcriptLength: transcript?.length,
      versionId,
    });

    if (!supplierId || typeof supplierId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: supplierId" },
        { status: 400 }
      );
    }

    if (!transcript || typeof transcript !== "string" || transcript.trim() === "") {
      return NextResponse.json(
        { error: "Missing or empty required field: transcript" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("id", supplierId)
      .eq("rfp_id", rfpId)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const correlationId = `presentation-${rfpId}-${supplierId}-${Date.now()}`;

    const { data: analysis, error: analysisError } = await supabase
      .from("presentation_analyses")
      .insert({
        rfp_id: rfpId,
        supplier_id: supplierId,
        version_id: versionId || null,
        transcript: transcript.trim(),
        analysis_data: {},
        status: "pending",
        generated_by: user.id,
        correlation_id: correlationId,
      })
      .select("id")
      .single();

    if (analysisError || !analysis) {
      console.error("Error creating presentation_analyses record:", analysisError);
      return NextResponse.json(
        { error: "Failed to create analysis record" },
        { status: 500 }
      );
    }

    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-presentation`;

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": process.env.PRESENTATION_ANALYSIS_API_KEY || "",
        },
        body: JSON.stringify({
          analysisId: analysis.id,
          rfpId,
          supplierId,
          transcript: transcript.trim(),
          versionId: versionId || null,
          correlationId,
        }),
      });

      if (!response.ok) {
        console.error("Edge Function error:", response.status);
      }
    } catch (error) {
      console.error("Error calling Edge Function:", error);
    }

    return NextResponse.json(
      {
        success: true,
        analysisId: analysis.id,
        correlationId,
        message: "Presentation analysis initiated",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error initiating presentation analysis:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
