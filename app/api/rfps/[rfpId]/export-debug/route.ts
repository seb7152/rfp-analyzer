import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ rfpId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if export_configurations table exists
    const { data: tables, error: tableError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public")
      .eq("table_name", "export_configurations");

    if (tableError) {
      return NextResponse.json(
        {
          error: "Failed to check tables",
          details: tableError,
        },
        { status: 500 }
      );
    }

    const tableExists = tables && tables.length > 0;

    // Check RFP access
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json(
        {
          error: "RFP not found",
          details: rfpError,
        },
        { status: 404 }
      );
    }

    // Check user organization access
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        {
          error: "Access denied",
          details: userOrgError,
        },
        { status: 403 }
      );
    }

    // Get templates
    const { data: templates, error: templateError } = await supabase
      .from("rfp_documents")
      .select("id, filename, original_filename, document_type")
      .eq("rfp_id", rfpId)
      .eq("document_type", "template")
      .is("deleted_at", null);

    if (templateError) {
      return NextResponse.json(
        {
          error: "Failed to fetch templates",
          details: templateError,
        },
        { status: 500 }
      );
    }

    // Get suppliers
    const { data: suppliers, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("rfp_id", rfpId);

    if (supplierError) {
      return NextResponse.json(
        {
          error: "Failed to fetch suppliers",
          details: supplierError,
        },
        { status: 500 }
      );
    }

    // Try to fetch configurations if table exists
    let configurations = [];
    let configError = null;

    if (tableExists) {
      const { data: configs, error: confError } = await supabase
        .from("export_configurations")
        .select("*")
        .eq("rfp_id", rfpId);

      configError = confError;
      configurations = configs || [];
    }

    return NextResponse.json({
      success: true,
      debug: {
        tableExists,
        rfpId,
        userId: user.id,
        organizationId: rfp.organization_id,
        userRole: userOrg?.role,
        templatesCount: templates?.length || 0,
        suppliersCount: suppliers?.length || 0,
        configurationsCount: configurations.length,
        configError: configError ? (configError as any).message : null,
        tableError: tableError ? (tableError as any).message : null,
      },
      data: {
        templates: templates || [],
        suppliers: suppliers || [],
        configurations,
      },
    });
  } catch (error) {
    console.error("Debug API error:", error);
    return NextResponse.json(
      {
        error: "Debug API failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
