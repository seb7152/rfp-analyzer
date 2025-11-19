import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DashboardConfiguration } from "@/lib/supabase/types";

/**
 * GET /api/rfps/[rfpId]/dashboard-configs
 *
 * Fetch all dashboard configurations for an RFP
 * Query params: ?type=radar (optional filter)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } },
) {
  try {
    const { rfpId } = params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Validate RFP ID
    if (!rfpId || rfpId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .maybeSingle();

    if (rfpError) {
      console.error("Error fetching RFP:", rfpError);
      return NextResponse.json(
        { error: "Failed to verify RFP" },
        { status: 500 },
      );
    }

    if (!rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Check if user has access to this RFP's organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: "Access denied to this RFP" },
        { status: 403 },
      );
    }

    // Build query
    let query = supabase
      .from("dashboard_configurations")
      .select("*")
      .eq("rfp_id", rfpId)
      .order("created_at", { ascending: true });

    // Apply type filter if provided
    if (type) {
      query = query.eq("type", type);
    }

    // Execute query
    const { data: configs, error: configsError } = await query;

    if (configsError) {
      console.error("Error fetching dashboard configs:", configsError);
      return NextResponse.json(
        { error: "Failed to fetch configurations" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      configs: (configs || []) as DashboardConfiguration[],
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/rfps/[rfpId]/dashboard-configs
 *
 * Create a new dashboard configuration
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } },
) {
  try {
    const { rfpId } = params;
    const { name, type, config } = await request.json();

    // Validate inputs
    if (!rfpId || rfpId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Configuration name is required" },
        { status: 400 },
      );
    }

    if (!type || !["radar", "bar", "line", "scatter"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid configuration type" },
        { status: 400 },
      );
    }

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "Configuration data is required" },
        { status: 400 },
      );
    }

    // Validate type-specific config
    if (type === "radar") {
      if (
        !config.selectedTagIds ||
        !Array.isArray(config.selectedTagIds) ||
        config.selectedTagIds.length < 3 ||
        config.selectedTagIds.length > 8
      ) {
        return NextResponse.json(
          { error: "Radar config must have 3-8 selected tags" },
          { status: 400 },
        );
      }

      if (!config.supplierId) {
        return NextResponse.json(
          { error: "Radar config must have a supplier ID" },
          { status: 400 },
        );
      }
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP and is evaluator/owner
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .maybeSingle();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (
      userOrgError ||
      !userOrg ||
      !["admin", "evaluator"].includes(userOrg.role)
    ) {
      return NextResponse.json(
        { error: "Permission denied to create configurations" },
        { status: 403 },
      );
    }

    // Create configuration
    const { data: createdConfig, error: createError } = await supabase
      .from("dashboard_configurations")
      .insert([
        {
          rfp_id: rfpId,
          name: name.trim(),
          type,
          config,
          created_by: user.id,
        },
      ])
      .select()
      .maybeSingle();

    if (createError) {
      console.error("Error creating dashboard config:", createError);
      // Check if it's a unique constraint violation
      if (createError.message.includes("unique")) {
        return NextResponse.json(
          {
            error: "Configuration with this name already exists for this RFP",
          },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Failed to create configuration" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { config: createdConfig as DashboardConfiguration },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
