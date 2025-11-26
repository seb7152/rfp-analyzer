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

    // Use ExcelJS for proper formatting support
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);

    // Get the specified worksheet
    const worksheetName = configDetails.worksheet_name;
    const worksheet = workbook.getWorksheet(worksheetName);

    if (!worksheet) {
      return NextResponse.json(
        { error: `Worksheet "${worksheetName}" not found in template` },
        { status: 400 }
      );
    }

    const startRow = configDetails.start_row || 2;
    let currentRow = startRow;

    console.log("Export mode:", {
      preserve_template_formatting: configDetails.preserve_template_formatting,
      mode: configDetails.preserve_template_formatting
        ? "PRESERVE TEMPLATE"
        : "CLEAN EXPORT",
    });

    console.log("Export starting at row (Excel):", startRow);

    // Write headers if requested (only in clean export mode)
    // In preserve mode, headers already exist in the template
    if (
      configDetails.include_headers !== false &&
      !configDetails.preserve_template_formatting
    ) {
      console.log("Writing headers at row", currentRow);

      configDetails.column_mappings.forEach((mapping: any) => {
        const columnLetter = mapping.column;
        const headerValue = mapping.header_name || mapping.column;
        const cell = worksheet.getCell(`${columnLetter}${currentRow}`);
        cell.value = headerValue;
        console.log(`  ${columnLetter}${currentRow}: "${headerValue}"`);
      });

      currentRow++;
    } else {
      if (configDetails.preserve_template_formatting) {
        console.log(
          "Headers NOT written (preserve_template_formatting = true, keeping template headers)"
        );
      } else {
        console.log("Headers NOT included (include_headers = false)");
      }
    }

    // Write data rows
    console.log("Writing data starting at row", currentRow);

    requirements.forEach((requirement) => {
      const response = responses.find(
        (r) => r.requirement_id === requirement.id
      );

      configDetails.column_mappings.forEach((mapping: any) => {
        const columnLetter = mapping.column;
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

        // ExcelJS: get cell and update value (preserves formatting automatically)
        const cell = worksheet.getCell(`${columnLetter}${currentRow}`);
        cell.value = cellValue;
      });

      currentRow++;
    });

    console.log("Total rows written:", currentRow - startRow);

    // Generate filename based on template name with supplier suffix
    const templateName = configDetails.template_document.original_filename;
    const nameWithoutExt = templateName.replace(/\.[^/.]+$/, ""); // Remove extension
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const filename = `${nameWithoutExt}_${configDetails.supplier.name}_${timestamp}.xlsx`;

    // Generate buffer with ExcelJS (preserves formatting automatically)
    const exportBuffer = await workbook.xlsx.writeBuffer();

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
