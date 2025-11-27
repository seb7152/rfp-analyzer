import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

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
        requirement_id_external,
        title,
        description,
        weight
      `
      )
      .eq("rfp_id", rfpId)
      .eq("level", 4) // Only leaf requirements
      .order("display_order", { ascending: true });

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
    const XLSX = require("xlsx");
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
            rowData[column] = requirement.requirement_id_external;
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
          (existing: any) =>
            existing[mappingColumn] === row.requirement_id_external
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

    // For preview, we'll show what would be inserted
    let previewRows;

    if (
      configDetails.use_requirement_mapping &&
      configDetails.requirement_mapping_column
    ) {
      // Preview mapping mode - show where data would be inserted
      const existingWorksheetData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: "",
      });

      const mappingColumn = configDetails.requirement_mapping_column;
      const mappingColumnIndex = mappingColumn.charCodeAt(0) - 65;

      previewRows = limitedData.map((row) => {
        const existingRowIndex = existingWorksheetData.findIndex(
          (existing: any) =>
            existing[mappingColumnIndex] === row.requirement_id_external
        );

        if (existingRowIndex >= 0) {
          // Show what would be updated in existing row
          const existingRow = existingWorksheetData[existingRowIndex] || {};
          configDetails.column_mappings.forEach((mapping: any) => {
            const columnIndex = mapping.column.charCodeAt(0) - 65;
            existingRow[columnIndex] = row[mapping.column] || "";
          });
          return existingRow;
        }

        // Show new row that would be added
        const newRow = Array(26).fill(""); // A-Z columns
        configDetails.column_mappings.forEach((mapping: any) => {
          const columnIndex = mapping.column.charCodeAt(0) - 65;
          newRow[columnIndex] = row[mapping.column] || "";
        });
        return newRow;
      });
    } else {
      // Preview simple insertion mode
      const startRow = (configDetails.start_row || 2) - 1;
      let currentRow = startRow;

      // Add headers if requested
      if (configDetails.include_headers !== false) {
        const headerRow = Array(26).fill("");
        configDetails.column_mappings.forEach((mapping: any) => {
          const columnIndex = mapping.column.charCodeAt(0) - 65;
          headerRow[columnIndex] = mapping.header_name || mapping.column;
        });
        currentRow++;
      }

      // Add data rows
      const dataRows = limitedData.map((dataRow) => {
        const row = Array(26).fill("");
        configDetails.column_mappings.forEach((mapping: any) => {
          const columnIndex = mapping.column.charCodeAt(0) - 65;
          row[columnIndex] = dataRow[mapping.column] || "";
        });
        return row;
      });

      previewRows = dataRows;
    }

    // Convert to display format
    const headers = configDetails.column_mappings.map(
      (mapping: any) => mapping.header_name || mapping.column
    );

    const rows = previewRows.map((row) =>
      configDetails.column_mappings.map((mapping: any) => {
        const columnIndex = mapping.column.charCodeAt(0) - 65;
        return row[columnIndex] || "";
      })
    );

    return NextResponse.json({
      preview: {
        headers: configDetails.include_headers !== false ? headers : [],
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
