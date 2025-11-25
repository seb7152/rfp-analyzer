import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { rfpId: string; configId: string } }
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rfpId, configId } = params;

    if (!rfpId || !configId) {
      return NextResponse.json(
        { error: "RFP ID and Configuration ID are required" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      column_mappings,
      use_requirement_mapping,
      requirement_mapping_column,
      start_row,
      include_headers,
    } = body;

    // Get RFP and verify user has access
    const { data: rfp, error: rfpFetchError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpFetchError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify user is part of organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Update export configuration
    const { data: configuration, error: updateError } = await supabase
      .from("export_configurations")
      .update({
        column_mappings: column_mappings,
        use_requirement_mapping,
        requirement_mapping_column: use_requirement_mapping
          ? requirement_mapping_column
          : null,
        start_row: start_row,
        include_headers: include_headers,
        updated_at: new Date().toISOString(),
      })
      .eq("id", configId)
      .eq("created_by", user.id) // Only allow creator to update
      .select()
      .single();

    if (updateError) {
      console.error("Error updating export configuration:", updateError);
      return NextResponse.json(
        {
          error: `Failed to update export configuration: ${updateError.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      configuration,
    });
  } catch (error) {
    console.error("Export configuration PUT error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { rfpId: string; configId: string } }
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rfpId, configId } = params;

    if (!rfpId || !configId) {
      return NextResponse.json(
        { error: "RFP ID and Configuration ID are required" },
        { status: 400 }
      );
    }

    // Get RFP and verify user has access
    const { data: rfp, error: rfpFetchError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpFetchError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify user is part of organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Delete export configuration (only creator can delete)
    const { error: deleteError } = await supabase
      .from("export_configurations")
      .delete()
      .eq("id", configId)
      .eq("created_by", user.id);

    if (deleteError) {
      console.error("Error deleting export configuration:", deleteError);
      return NextResponse.json(
        {
          error: `Failed to delete export configuration: ${deleteError.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Export configuration deleted successfully",
    });
  } catch (error) {
    console.error("Export configuration DELETE error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
