import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: configurations, error } = await supabase
      .from("export_configurations")
      .select("*")
      .eq("rfp_id", rfpId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching export configurations:", error);
      return NextResponse.json(
        { error: "Failed to fetch export configurations" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      configurations: configurations || [],
    });
  } catch (error) {
    console.error(
      "Error in GET /api/rfps/[rfpId]/export-configurations:",
      error
    );
    return NextResponse.json(
      { error: "Failed to fetch export configurations" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      template_document_id,
      worksheet_name,
      supplier_id,
      column_mappings = [],
      use_requirement_mapping = false,
      requirement_mapping_column,
    } = body;

    if (!template_document_id || !worksheet_name || !supplier_id) {
      return NextResponse.json(
        {
          error:
            "template_document_id, worksheet_name, and supplier_id are required",
        },
        { status: 400 }
      );
    }

    const { data: rfp, error: rfpFetchError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpFetchError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { data: templateDoc, error: templateError } = await supabase
      .from("rfp_documents")
      .select("id, document_type")
      .eq("id", template_document_id)
      .eq("rfp_id", rfpId)
      .single();

    if (templateError || !templateDoc) {
      return NextResponse.json(
        { error: "Template document not found" },
        { status: 404 }
      );
    }

    if (templateDoc.document_type !== "template") {
      return NextResponse.json(
        { error: "Document is not a template" },
        { status: 400 }
      );
    }

    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id")
      .eq("id", supplier_id)
      .eq("rfp_id", rfpId)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const { data: configuration, error: createError } = await supabase
      .from("export_configurations")
      .insert({
        rfp_id: rfpId,
        organization_id: rfp.organization_id,
        template_document_id,
        worksheet_name,
        supplier_id,
        column_mappings,
        use_requirement_mapping,
        requirement_mapping_column,
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating export configuration:", createError);

      if (createError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "A configuration with this worksheet name and supplier already exists for this RFP",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Failed to create export configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        configuration,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Error in POST /api/rfps/[rfpId]/export-configurations:",
      error
    );
    return NextResponse.json(
      { error: "Failed to create export configuration" },
      { status: 500 }
    );
  }
}
