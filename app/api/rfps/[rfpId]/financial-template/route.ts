import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";

/**
 * GET /api/rfps/[rfpId]/financial-template
 * Récupère le template financier d'un RFP avec toutes ses lignes hiérarchiques
 * US-1-005
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    if (!rfpId) {
      return NextResponse.json(
        { error: "RFP ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    const accessCheckResponse = await verifyRFPAccess(rfpId, user.id);
    if (accessCheckResponse) {
      return accessCheckResponse;
    }

    // Get the financial template for this RFP
    const { data: template, error: templateError } = await supabase
      .from("financial_templates")
      .select("*")
      .eq("rfp_id", rfpId)
      .single();

    if (templateError) {
      if (templateError.code === "PGRST116") {
        // No template found
        return NextResponse.json(
          { template: null, lines: [] },
          { status: 200 }
        );
      }
      console.error("Error fetching template:", templateError);
      return NextResponse.json(
        { error: "Failed to fetch template" },
        { status: 500 }
      );
    }

    // Get all lines for this template
    const { data: lines, error: linesError } = await supabase
      .from("financial_template_lines")
      .select("*")
      .eq("template_id", template.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (linesError) {
      console.error("Error fetching template lines:", linesError);
      return NextResponse.json(
        { error: "Failed to fetch template lines" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        template,
        lines: lines || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/rfps/[rfpId]/financial-template:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rfps/[rfpId]/financial-template
 * Crée un nouveau template financier pour un RFP
 * US-1-004
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    if (!rfpId) {
      return NextResponse.json(
        { error: "RFP ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    const accessCheckResponse = await verifyRFPAccess(rfpId, user.id);
    if (accessCheckResponse) {
      return accessCheckResponse;
    }

    // Parse request body
    const body = await request.json();
    const { name, total_period_years } = body;

    // Validate inputs
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Template name is required" },
        { status: 400 }
      );
    }

    if (
      total_period_years !== undefined &&
      [1, 3, 5].indexOf(total_period_years) === -1
    ) {
      return NextResponse.json(
        { error: "total_period_years must be 1, 3, or 5" },
        { status: 400 }
      );
    }

    // Check if template already exists for this RFP
    const { data: existingTemplate } = await supabase
      .from("financial_templates")
      .select("id")
      .eq("rfp_id", rfpId)
      .single();

    if (existingTemplate) {
      return NextResponse.json(
        { error: "A financial template already exists for this RFP" },
        { status: 409 }
      );
    }

    // Create the template
    const { data: template, error: createError } = await supabase
      .from("financial_templates")
      .insert({
        rfp_id: rfpId,
        name: name.trim(),
        total_period_years: total_period_years || 3,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating template:", createError);
      return NextResponse.json(
        { error: `Failed to create template: ${createError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Template created successfully",
        template,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/rfps/[rfpId]/financial-template:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
