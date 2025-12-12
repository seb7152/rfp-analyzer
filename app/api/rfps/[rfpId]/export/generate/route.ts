import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  console.log("========== EXPORT GENERATE API CALLED (MULTI-TAB) ==========");
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
    const { configuration, versionId } = body;

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

    // 1. Get the primary configuration to identify the template
    const { data: primaryConfig, error: configError } = await supabase
      .from("export_configurations")
      .select(
        `
        *,
        template_document:rfp_documents!inner(
          id,
          original_filename,
          gcs_object_name
        )
      `
      )
      .eq("id", configuration.id)
      .single();

    if (configError || !primaryConfig) {
      return NextResponse.json(
        { error: "Export configuration not found" },
        { status: 404 }
      );
    }

    // 2. Fetch ALL configurations for this template (Sibling Configs)
    const { data: allConfigs, error: allConfigsError } = await supabase
      .from("export_configurations")
      .select(
        `
        *,
        supplier:suppliers!inner(
          id,
          name
        )
      `
      )
      .eq("template_document_id", primaryConfig.template_document_id)
      .eq("rfp_id", rfpId);

    if (allConfigsError || !allConfigs || allConfigs.length === 0) {
      return NextResponse.json(
        { error: "No configurations found for this template" },
        { status: 404 }
      );
    }

    console.log(
      `Found ${allConfigs.length} configurations for template ${primaryConfig.template_document.original_filename}`
    );

    // 3. Get requirements for this RFP (Fetch once)
    const { data: requirements, error: requirementsError } = await supabase
      .from("requirements")
      .select(
        `
        id,
        requirement_id_external,
        title,
        description,
        weight,
        category_id
      `
      )
      .eq("rfp_id", rfpId)
      .eq("level", 4) // Only leaf requirements
      .order("display_order", { ascending: true });

    if (requirementsError) {
      return NextResponse.json(
        { error: "Failed to fetch requirements" },
        { status: 500 }
      );
    }

    // Helper to calculate local weight percentage for a requirement
    const calculateLocalWeightPercent = (
      requirementId: string,
      categoryId: string | null
    ): number => {
      if (!categoryId) return 1; // No category = 100% = 1.0

      // Find all siblings (requirements with same category_id)
      const siblings = requirements.filter((r) => r.category_id === categoryId);

      // Calculate total weight of siblings
      const totalWeight = siblings.reduce((sum, r) => sum + (r.weight || 0), 0);

      // Avoid division by zero
      if (totalWeight === 0) return 0;

      // Find current requirement's weight
      const currentReq = siblings.find((r) => r.id === requirementId);
      const currentWeight = currentReq?.weight || 0;

      // Calculate local weight as decimal: (current / total)
      const localWeight = currentWeight / totalWeight;

      // Round to 4 decimal places (same as database weight format)
      return Math.round(localWeight * 10000) / 10000;
    };

    // 4. Load Template File
    const { generateDownloadSignedUrl } = await import("@/lib/gcs");
    const templateUrl = await generateDownloadSignedUrl(
      primaryConfig.template_document.gcs_object_name
    );

    const templateResponse = await fetch(templateUrl);
    if (!templateResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch template file" },
        { status: 500 }
      );
    }

    const templateBuffer = await templateResponse.arrayBuffer();
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(templateBuffer);

    // 5. Iterate over each configuration and populate the corresponding worksheet
    for (const config of allConfigs) {
      console.log(
        `Processing worksheet: ${config.worksheet_name} for supplier: ${config.supplier.name}`
      );

      const worksheet = workbook.getWorksheet(config.worksheet_name);
      if (!worksheet) {
        console.warn(
          `Worksheet "${config.worksheet_name}" not found in template. Skipping.`
        );
        continue;
      }

      // Fetch responses for this specific supplier
      let responsesQuery = supabase
        .from("responses")
        .select(
          `
          requirement_id,
          response_text,
          ai_score,
          manual_score,
          ai_comment,
          manual_comment,
          question,
          status
        `
        )
        .eq("supplier_id", config.supplier.id)
        .in(
          "requirement_id",
          requirements.map((r) => r.id)
        );

      if (versionId) {
        responsesQuery = responsesQuery.eq("version_id", versionId);
      }

      const { data: responses, error: responsesError } = await responsesQuery;

      if (responsesError) {
        console.error(
          `Error fetching responses for supplier ${config.supplier.name}:`,
          responsesError
        );
        continue;
      }

      const startRow = config.start_row || 2;

      // Helper function to get cell value for a field
      const getCellValue = (field: string, requirement: any, response: any) => {
        switch (field) {
          case "requirement_code":
            return requirement.requirement_id_external;
          case "requirement_title":
            return requirement.title;
          case "requirement_description":
            return requirement.description;
          case "requirement_weight":
            return requirement.weight;
          case "requirement_weight_local_percent":
            return calculateLocalWeightPercent(
              requirement.id,
              requirement.category_id
            );
          case "supplier_response":
            return response?.response_text || "";
          case "ai_score":
            return response?.ai_score || 0;
          case "manual_score":
            return response?.manual_score || 0;
          case "smart_score":
            return response?.manual_score !== null &&
              response?.manual_score !== undefined
              ? response.manual_score
              : response?.ai_score || 0;
          case "ai_comment":
            return response?.ai_comment || "";
          case "manual_comment":
            return response?.manual_comment || "";
          case "smart_comment":
            return response?.manual_comment !== null &&
              response?.manual_comment !== "" &&
              response?.manual_comment !== undefined
              ? response.manual_comment
              : response?.ai_comment || "";
          case "question":
            return response?.question || "";
          case "status":
            return response?.status || "pending";
          case "annotations":
            return "";
          default:
            return "";
        }
      };

      // Check if using requirement mapping mode
      if (config.use_requirement_mapping && config.requirement_mapping_column) {
        // Requirement mapping mode: find rows by requirement code and update them
        const mappingColumn = config.requirement_mapping_column;
        console.log(
          `Using requirement mapping mode with column ${mappingColumn} for ${config.supplier.name}`
        );

        let matchedCount = 0;
        let unmatchedCodes: string[] = [];

        requirements.forEach((requirement) => {
          const response = responses?.find(
            (r) => r.requirement_id === requirement.id
          );
          const requirementCode = requirement.requirement_id_external;

          if (!requirementCode) {
            unmatchedCodes.push("(no code)");
            return;
          }

          // Search for the row with this requirement code
          // Use a reasonable max row limit (1000) instead of worksheet.rowCount which might be 0
          const maxSearchRow = Math.max(worksheet.rowCount || 0, 1000);
          let targetRow = null;

          // Debug: Log the first few cells to see what we're comparing
          if (matchedCount === 0 && unmatchedCodes.length === 0) {
            console.log(
              `\nDEBUG: Looking for requirement code: "${requirementCode}" (type: ${typeof requirementCode})`
            );
            for (
              let debugRow = startRow;
              debugRow <= Math.min(startRow + 5, maxSearchRow);
              debugRow++
            ) {
              const debugCell = worksheet.getCell(
                `${mappingColumn}${debugRow}`
              );
              console.log(
                `  Row ${debugRow}: "${debugCell.value}" (type: ${typeof debugCell.value}, text: "${debugCell.text}")`
              );
            }
          }

          for (let rowNum = startRow; rowNum <= maxSearchRow; rowNum++) {
            const cell = worksheet.getCell(`${mappingColumn}${rowNum}`);
            const cellValue = cell.value;
            const cellText = cell.text;

            // Try multiple comparison methods
            if (
              cellValue === requirementCode ||
              cellText === requirementCode ||
              String(cellValue).trim() === String(requirementCode).trim()
            ) {
              targetRow = rowNum;
              break;
            }
          }

          if (targetRow) {
            // Found matching row - update all mapped columns
            matchedCount++;
            config.column_mappings.forEach((mapping: any) => {
              const columnLetter = mapping.column;
              const cellValue = getCellValue(
                mapping.field,
                requirement,
                response
              );
              const cell = worksheet.getCell(`${columnLetter}${targetRow}`);
              cell.value = cellValue;
            });
          } else {
            unmatchedCodes.push(requirementCode);
          }
        });

        console.log(
          `Requirement mapping results for ${config.supplier.name}: ${matchedCount}/${requirements.length} matched`
        );
        if (unmatchedCodes.length > 0) {
          console.log(
            `Unmatched requirement codes (first 10): ${unmatchedCodes.slice(0, 10).join(", ")}`
          );
        }
      } else {
        // Sequential mode: write rows in order
        let currentRow = startRow;

        // Write headers if requested (only if NOT preserving formatting, or if explicitly requested)
        if (
          config.include_headers !== false &&
          !config.preserve_template_formatting
        ) {
          config.column_mappings.forEach((mapping: any) => {
            const columnLetter = mapping.column;
            const headerValue = mapping.header_name || mapping.column;
            const cell = worksheet.getCell(`${columnLetter}${currentRow}`);
            cell.value = headerValue;
          });
          currentRow++;
        }

        // Write data rows
        requirements.forEach((requirement) => {
          const response = responses?.find(
            (r) => r.requirement_id === requirement.id
          );

          config.column_mappings.forEach((mapping: any) => {
            const columnLetter = mapping.column;
            const cellValue = getCellValue(
              mapping.field,
              requirement,
              response
            );
            const cell = worksheet.getCell(`${columnLetter}${currentRow}`);
            cell.value = cellValue;
          });

          currentRow++;
        });
      }
    }

    // 6. Generate final filename and upload
    const templateName = primaryConfig.template_document.original_filename;
    const nameWithoutExt = templateName.replace(/\.[^/.]+$/, "");
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    // Filename is now generic for the RFP/Template, not specific to one supplier
    const filename = `${nameWithoutExt}_Export_${timestamp}.xlsx`;

    const exportBuffer = await workbook.xlsx.writeBuffer();

    const { generateUploadSignedUrl } = await import("@/lib/gcs");
    const exportId = uuidv4();
    const objectName = `exports/${rfp.organization_id}/${rfpId}/${exportId}-${filename}`;

    const uploadUrl = await generateUploadSignedUrl(objectName, 15 * 60 * 1000);

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

    const downloadUrl = await generateDownloadSignedUrl(
      objectName,
      24 * 60 * 60 * 1000
    );

    return NextResponse.json({
      filename,
      downloadUrl,
      message: "Export generated successfully (Multi-tab)",
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
