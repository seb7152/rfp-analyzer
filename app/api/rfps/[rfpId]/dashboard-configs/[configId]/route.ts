import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DashboardConfiguration } from "@/lib/supabase/types";

/**
 * GET /api/rfps/[rfpId]/dashboard-configs/[configId]
 *
 * Fetch a specific dashboard configuration
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string; configId: string } }
) {
  try {
    const { rfpId, configId } = params;

    // Validate inputs
    if (!rfpId || !configId) {
      return NextResponse.json(
        { error: "Invalid RFP ID or Config ID" },
        { status: 400 }
      );
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

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: "Access denied to this RFP" },
        { status: 403 }
      );
    }

    // Fetch configuration
    const { data: config, error: configError } = await supabase
      .from("dashboard_configurations")
      .select("*")
      .eq("id", configId)
      .eq("rfp_id", rfpId)
      .maybeSingle();

    if (configError) {
      console.error("Error fetching config:", configError);
      return NextResponse.json(
        { error: "Failed to fetch configuration" },
        { status: 500 }
      );
    }

    if (!config) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ config: config as DashboardConfiguration });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rfps/[rfpId]/dashboard-configs/[configId]
 *
 * Update a dashboard configuration
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { rfpId: string; configId: string } }
) {
  try {
    const { rfpId, configId } = params;
    const { name, config } = await request.json();

    // Validate inputs
    if (!rfpId || !configId) {
      return NextResponse.json(
        { error: "Invalid RFP ID or Config ID" },
        { status: 400 }
      );
    }

    if (name && name.trim().length === 0) {
      return NextResponse.json(
        { error: "Configuration name cannot be empty" },
        { status: 400 }
      );
    }

    if (config && typeof config !== "object") {
      return NextResponse.json(
        { error: "Configuration data must be an object" },
        { status: 400 }
      );
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
        { error: "Permission denied to update configurations" },
        { status: 403 }
      );
    }

    // Verify configuration exists
    const { data: existingConfig, error: fetchError } = await supabase
      .from("dashboard_configurations")
      .select("*")
      .eq("id", configId)
      .eq("rfp_id", rfpId)
      .maybeSingle();

    if (fetchError || !existingConfig) {
      return NextResponse.json(
        { error: "Configuration not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name.trim();
    if (config) updateData.config = config;

    // Update configuration
    const { data: updatedConfig, error: updateError } = await supabase
      .from("dashboard_configurations")
      .update(updateData)
      .eq("id", configId)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error("Error updating config:", updateError);
      if (updateError.message.includes("unique")) {
        return NextResponse.json(
          {
            error: "Configuration with this name already exists for this RFP",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      config: updatedConfig as DashboardConfiguration,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/rfps/[rfpId]/dashboard-configs/[configId]
 *
 * Delete a dashboard configuration
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { rfpId: string; configId: string } }
) {
  try {
    const { rfpId, configId } = params;

    // Validate inputs
    if (!rfpId || !configId) {
      return NextResponse.json(
        { error: "Invalid RFP ID or Config ID" },
        { status: 400 }
      );
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

    // Verify user has access to this RFP and is admin
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

    if (userOrgError || !userOrg || userOrg.role !== "admin") {
      return NextResponse.json(
        { error: "Permission denied to delete configurations" },
        { status: 403 }
      );
    }

    // Delete configuration
    const { error: deleteError } = await supabase
      .from("dashboard_configurations")
      .delete()
      .eq("id", configId)
      .eq("rfp_id", rfpId);

    if (deleteError) {
      console.error("Error deleting config:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
