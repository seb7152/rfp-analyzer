import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { generateUploadSignedUrl } from "@/lib/gcs";
import { v4 as uuidv4 } from "uuid";

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
    const {
      filename,
      mimeType = "application/pdf",
      fileSize,
      documentType = "cahier_charges",
    } = body;

    // Get file extension from filename
    const fileExtension = filename.toLowerCase().split(".").pop();

    // For script files (.py, .sh), accept if extension is valid
    const isScriptFile = [
      "py",
      "sh",
      "txt",
      "conf",
      "yaml",
      "yml",
      "json",
      "xml",
    ].includes(fileExtension || "");
    const isDocumentFile = ["pdf", "xls", "xlsx", "doc", "docx"].includes(
      fileExtension || ""
    );

    // Log for debugging
    console.log(
      `Upload request: filename=${filename}, mimeType=${mimeType}, extension=${fileExtension}`
    );
    console.log(
      `Is script file: ${isScriptFile}, Is document file: ${isDocumentFile}`
    );
    console.log(`Full MIME type details:`, {
      mimeType,
      fileExtension,
      filename,
      isScriptFile,
      isDocumentFile,
      mimeTypeLength: mimeType?.length,
      mimeTypeType: typeof mimeType,
    });

    // Validation
    if (!filename || !fileSize) {
      return NextResponse.json(
        { error: "filename and fileSize are required" },
        { status: 400 }
      );
    }

    // MIME types are now validated at database level with constraints

    if (isScriptFile) {
      // Script files with valid extension are accepted - be very permissive
      console.log(
        `Accepting script file: ${filename}, MIME type: ${mimeType}, extension: ${fileExtension}`
      );
      // No validation needed - if extension is valid, accept it
      // The database constraint will handle MIME type validation
    } else if (isDocumentFile) {
      // For document files, check MIME type strictly
      const allowedDocumentMimeTypes = [
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedDocumentMimeTypes.includes(mimeType)) {
        return NextResponse.json(
          { error: "Invalid MIME type for document file" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Only PDF, Excel, Word files and text files are allowed" },
        { status: 400 }
      );
    }

    const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || "50", 10);
    if (fileSize > maxFileSizeMB * 1024 * 1024) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum allowed (${maxFileSizeMB}MB)`,
        },
        { status: 400 }
      );
    }

    if (
      ![
        "cahier_charges",
        "specifications",
        "technical_brief",
        "appendix",
        "supplier_response",
        "template",
        "script_import",
      ].includes(documentType)
    ) {
      return NextResponse.json(
        { error: "Invalid document type" },
        { status: 400 }
      );
    }

    // Get the RFP and verify user has access
    const { data: rfp, error: rfpFetchError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpFetchError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify user is part of the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate unique document ID and object name
    const documentId = uuidv4();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");

    // Use different subfolder for templates
    const subfolder = documentType === "template" ? "templates" : "documents";
    const objectName = `rfps/${rfp.organization_id}/${rfpId}/${subfolder}/${documentId}-${sanitizedFilename}`;

    // Generate signed URL for upload (15 minutes TTL for actual upload)
    const uploadUrl = await generateUploadSignedUrl(objectName, 15 * 60 * 1000);

    const ttlSeconds = parseInt(process.env.SIGN_URL_TTL_SEC || "90", 10);
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    return NextResponse.json(
      {
        uploadUrl,
        documentId,
        objectName,
        expiresAt: expiresAt.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Upload intent error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
