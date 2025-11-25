import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  console.log("========== EXPORT GENERATE API CALLED ==========");
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
    const { configuration } = body;

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

    // Debug: Log configuration details
    console.log("Configuration details:", {
      id: configDetails.id,
      start_row: configDetails.start_row,
      include_headers: configDetails.include_headers,
      use_requirement_mapping: configDetails.use_requirement_mapping,
      preserve_template_formatting: configDetails.preserve_template_formatting,
    });

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
    const templateWorksheet = workbook.Sheets[worksheetName];

    if (!templateWorksheet) {
      return NextResponse.json(
        { error: `Worksheet "${worksheetName}" not found in template` },
        { status: 400 }
      );
    }

    // Choose export mode based on preserve_template_formatting
    let newWorksheet: any;
    const startRow = (configDetails.start_row || 2) - 1;
    let currentRow = startRow;

    console.log("Export mode:", {
      preserve_template_formatting: configDetails.preserve_template_formatting,
      mode: configDetails.preserve_template_formatting ? "PRESERVE TEMPLATE" : "CLEAN EXPORT"
    });

    if (configDetails.preserve_template_formatting) {
      // MODE: PRESERVE TEMPLATE - Keep all formatting, formulas, and existing data
      console.log("Using PRESERVE TEMPLATE mode - keeping formatting and formulas");
      newWorksheet = JSON.parse(JSON.stringify(templateWorksheet)); // Deep clone to preserve all properties
    } else {
      // MODE: CLEAN EXPORT - Create new empty worksheet
      console.log("Using CLEAN EXPORT mode - creating new worksheet");
      newWorksheet = {};
    }

    console.log(
      "Export starting at row (0-based):",
      startRow,
      "= Excel row",
      startRow + 1
    );

    // Write headers if requested
    if (configDetails.include_headers !== false) {
      console.log(
        "Writing headers at row",
        currentRow,
        "(Excel row",
        currentRow + 1,
        ")"
      );

      configDetails.column_mappings.forEach((mapping: any) => {
        const columnIndex = mapping.column.charCodeAt(0) - 65;
        const headerValue = mapping.header_name || mapping.column;

        const cellAddress = XLSX.utils.encode_cell({
          r: currentRow,
          c: columnIndex,
        });

        console.log(`  ${cellAddress}: "${headerValue}"`);
        newWorksheet[cellAddress] = { v: headerValue, t: "s" };
      });

      currentRow++;
    } else {
      console.log(
        "Headers NOT included (include_headers =",
        configDetails.include_headers,
        ")"
      );
    }

    // Write data rows
    console.log(
      "Writing data starting at row",
      currentRow,
      "(Excel row",
      currentRow + 1,
      ")"
    );

    requirements.forEach((requirement) => {
      const response = responses.find(
        (r) => r.requirement_id === requirement.id
      );

      configDetails.column_mappings.forEach((mapping: any) => {
        const columnIndex = mapping.column.charCodeAt(0) - 65;
        let cellValue: any = "";

        switch (mapping.field) {
          case "requirement_code":
            cellValue = requirement.requirement_id_external;
            break;
          case "requirement_title":
            cellValue = requirement.title;
            break;
          case "requirement_description":
            cellValue = requirement.description;
            break;
          case "requirement_weight":
            cellValue = requirement.weight;
            break;
          case "supplier_response":
            cellValue = response?.response_text || "";
            break;
          case "ai_score":
            cellValue = response?.ai_score || 0;
            break;
          case "manual_score":
            cellValue = response?.manual_score || 0;
            break;
          case "ai_comment":
            cellValue = response?.ai_comment || "";
            break;
          case "manual_comment":
            cellValue = response?.manual_comment || "";
            break;
          case "status":
            cellValue = response?.status || "pending";
            break;
          case "annotations":
            cellValue = ""; // TODO: Implement annotations fetching
            break;
          default:
            cellValue = "";
        }

        const cellAddress = XLSX.utils.encode_cell({
          r: currentRow,
          c: columnIndex,
        });

        // Preserve existing cell formatting if in preserve mode
        if (configDetails.preserve_template_formatting && newWorksheet[cellAddress]) {
          // Keep existing cell properties (formatting, formulas, etc.) but update value
          newWorksheet[cellAddress].v = cellValue;
          // Update formula result if cell contains a formula
          if (newWorksheet[cellAddress].f) {
            newWorksheet[cellAddress].w = cellValue; // Set formatted value
          }
        } else {
          // Create new cell
          newWorksheet[cellAddress] = { v: cellValue, t: "s" };
        }
      });

      currentRow++;
    });

    // Set worksheet range
    const lastRow = currentRow - 1;
    const lastCol = Math.max(
      ...configDetails.column_mappings.map(
        (m: any) => m.column.charCodeAt(0) - 65
      )
    );

    newWorksheet["!ref"] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: lastRow, c: lastCol },
    });

    console.log("Final worksheet range:", newWorksheet["!ref"]);
    console.log("Total rows written:", currentRow - startRow);

    // Replace worksheet in workbook
    workbook.Sheets[worksheetName] = newWorksheet;

    // Generate filename based on template name with supplier suffix
    const templateName = configDetails.template_document.original_filename;
    const nameWithoutExt = templateName.replace(/\.[^/.]+$/, ""); // Remove extension
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `${nameWithoutExt}_${configDetails.supplier.name}_${timestamp}.xlsx`;

    // Generate buffer
    const exportBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    // Upload to GCS
    const { generateUploadSignedUrl } = await import("@/lib/gcs");
    const exportId = uuidv4();
    const objectName = `exports/${rfp.organization_id}/${rfpId}/${exportId}-${filename}`;

    const uploadUrl = await generateUploadSignedUrl(objectName, 15 * 60 * 1000);

    // Upload the file
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      body: exportBuffer,
    });

    if (!uploadResponse.ok) {
      return NextResponse.json(
        { error: "Failed to upload export file" },
        { status: 500 }
      );
    }

    // Generate download URL
    const downloadUrl = await generateDownloadSignedUrl(
      objectName,
      24 * 60 * 60 * 1000
    ); // 24 hours

    return NextResponse.json({
      filename,
      downloadUrl,
      message: "Export generated successfully",
    });
  } catch (error) {
    console.error("Export generation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
