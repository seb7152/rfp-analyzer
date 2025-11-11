import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { bucket } from "@/lib/gcs";
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

    // Validation
    if (!filename || !fileSize) {
      return NextResponse.json(
        { error: "filename and fileSize are required" },
        { status: 400 }
      );
    }

    if (mimeType !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    const maxFileSizeMB = parseInt(
      process.env.MAX_FILE_SIZE_MB || "50",
      10
    );
    if (fileSize > maxFileSizeMB * 1024 * 1024) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum allowed (${maxFileSizeMB}MB)`,
        },
        { status: 400 }
      );
    }

    if (!["cahier_charges", "specifications", "technical_brief", "appendix"].includes(documentType)) {
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
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Generate unique document ID and object name
    const documentId = uuidv4();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const objectName = `rfps/${rfp.organization_id}/${rfpId}/${documentId}-${sanitizedFilename}`;

    // Generate signed URL for upload
    const file = bucket.file(objectName);
    const [uploadUrl] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes for upload
    });

    const ttlSeconds = parseInt(
      process.env.SIGN_URL_TTL_SEC || "90",
      10
    );
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
