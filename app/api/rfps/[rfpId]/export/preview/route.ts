import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import * as XLSX from "xlsx";

export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
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

    const { rfpId } = params;

    if (!rfpId) {
      return NextResponse.json(
        { error: "RFP ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { configuration, limit = 10 } = body;

    if (!configuration) {
      return NextResponse.json(
        { error: "Configuration is required" },
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

    // Get configuration details with related data
    const { data: configDetails, error: configError } = await supabase
      .from("export_configurations")
      .select(
        `
        *,
        template_document:rfp_documents!inner(
          id,
          original_filename,
          gcs_object_name
        ),
        supplier:suppliers!inner(
          id,
          name
        )
      `
      )
      .eq("id", configuration.id)
      .eq("created_by", user.id)
      .single();

    if (configError || !configDetails) {
      return NextResponse.json(
        { error: "Export configuration not found or access denied" },
        { status: 404 }
      );
    }

    // Get requirements for this RFP
    const { data: requirements, error: requirementsError } = await supabase
      .from("requirements")
      .select(
        `
        id,
        code,
        title,
        description,
        weight
      `
      )
      .eq("rfp_id", rfpId)
      .eq("level", 4) // Only leaf requirements
      .order("sort_order", { ascending: true });

    if (requirementsError) {
      console.error("Error fetching requirements:", requirementsError);
      return NextResponse.json(
        { error: "Failed to fetch requirements" },
        { status: 500 }
      );
    }

    // Get responses for this supplier
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select(
        `
        requirement_id,
        response_text,
        ai_score,
        manual_score,
        ai_comment,
        manual_comment,
        questions_doubts,
        status
      `
      )
      .eq("supplier_id", configDetails.supplier.id)
      .in(
        "requirement_id",
        requirements.map((r) => r.id)
      );

    if (responsesError) {
      console.error("Error fetching responses:", responsesError);
      return NextResponse.json(
        { error: "Failed to fetch responses" },
        { status: 500 }
      );
    }

    // Get template file from GCS
    const { generateDownloadSignedUrl } = await import("@/lib/gcs");
    const templateUrl = await generateDownloadSignedUrl(
      configDetails.template_document.gcs_object_name
    );

    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch template file" },
        { status: 500 }
      );
    }

    const templateBuffer = await templateResponse.arrayBuffer();
    const workbook = XLSX.read(templateBuffer);

    // Get the specified worksheet
    const worksheetName = configDetails.worksheet_name;
    let worksheet = workbook.Sheets[worksheetName];

    if (!worksheet) {
      return NextResponse.json(
        { error: `Worksheet "${worksheetName}" not found in template` },
        { status: 400 }
      );
    }

    // Prepare data for export
    const exportData = requirements.map((requirement) => {
      const response = responses.find(
        (r) => r.requirement_id === requirement.id
      );

      const rowData: any = {};

      // Map columns based on configuration
      configDetails.column_mappings.forEach((mapping: any) => {
        const { column, field } = mapping;

        switch (field) {
          case "requirement_code":
            rowData[column] = requirement.code;
            break;
          case "requirement_title":
            rowData[column] = requirement.title;
            break;
          case "requirement_description":
            rowData[column] = requirement.description;
            break;
          case "requirement_weight":
            rowData[column] = requirement.weight;
            break;
          case "supplier_response":
            rowData[column] = response?.response_text || "";
            break;
          case "ai_score":
            rowData[column] = response?.ai_score || 0;
            break;
          case "manual_score":
            rowData[column] = response?.manual_score || 0;
            break;
          case "ai_comment":
            rowData[column] = response?.ai_comment || "";
            break;
          case "manual_comment":
            rowData[column] = response?.manual_comment || "";
            break;
          case "questions_doubts":
            rowData[column] = response?.questions_doubts || "";
            break;
          case "status":
            rowData[column] = response?.status || "pending";
            break;
          case "annotations":
            rowData[column] = ""; // TODO: Implement annotations fetching
            break;
          default:
            rowData[column] = "";
        }
      });

      return rowData;
    });

    // Apply requirement mapping if enabled
    let finalData = exportData;
    if (
      configDetails.use_requirement_mapping &&
      configDetails.requirement_mapping_column
    ) {
      // Read existing worksheet data to find requirement codes
      const existingData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      const mappingColumn = configDetails.requirement_mapping_column;

      finalData = exportData.map((row) => {
        const existingRow = existingData.find(
          (existing: any) => existing[mappingColumn] === row.requirement_code
        );

        if (existingRow) {
          // Merge with existing row data
          return { ...existingRow, ...row };
        }

        return row;
      });
    }

    // Limit data for preview
    const limitedData = finalData.slice(0, limit);

    // Convert to worksheet format
    const headers = configDetails.column_mappings.map(
      (mapping: any) => mapping.column
    );
    const rows = limitedData.map((row) =>
      headers.map((header: string) => row[header] || "")
    );

    return NextResponse.json({
      preview: {
        headers,
        rows,
        totalRequirements: requirements.length,
        supplierName: configDetails.supplier.name,
        templateName: configDetails.template_document.original_filename,
      },
    });
  } catch (error) {
    console.error("Export preview error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
