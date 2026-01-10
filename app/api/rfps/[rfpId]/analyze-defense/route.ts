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
    const { supplierId, versionId } = body;

    console.log("[/analyze-defense] Request body:", { supplierId, versionId });

    if (!supplierId || typeof supplierId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: supplierId" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify user is the RFP owner (only owners can use AI features)
    const { data: assignment, error: assignmentError } = await supabase
      .from("rfp_user_assignments")
      .select("access_level")
      .eq("rfp_id", rfpId)
      .eq("user_id", user.id)
      .single();

    if (assignmentError || !assignment || assignment.access_level !== "owner") {
      return NextResponse.json(
        { error: "Only RFP owners can use AI analysis features" },
        { status: 403 }
      );
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

    const correlationId = `defense-${rfpId}-${supplierId}-${Date.now()}`;

    const { data: analysis, error: analysisError } = await supabase
      .from("defense_analyses")
      .insert({
        rfp_id: rfpId,
        supplier_id: supplierId,
        version_id: versionId || null,
        analysis_data: {},
        status: "pending",
        generated_by: user.id,
        correlation_id: correlationId,
      })
      .select("id")
      .single();

    if (analysisError || !analysis) {
      console.error("Error creating defense_analyses record:", analysisError);
      return NextResponse.json(
        { error: "Failed to create analysis record" },
        { status: 500 }
      );
    }

    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/analyze-defense`;

    try {
      const response = await fetch(edgeFunctionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysisId: analysis.id,
          rfpId,
          supplierId,
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
        message: "Defense analysis initiated",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error initiating defense analysis:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
