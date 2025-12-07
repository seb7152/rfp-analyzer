import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getFile } from "@/lib/gcs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string; documentId: string } }
) {
  try {
    const { rfpId, documentId } = params;

    if (!rfpId || !documentId) {
      return NextResponse.json(
        { error: "RFP ID and Document ID are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get document metadata
    const { data: document, error: documentError } = await supabase
      .from("rfp_documents")
      .select(
        "id, filename, original_filename, mime_type, gcs_object_name, rfp_id, organization_id"
      )
      .eq("id", documentId)
      .eq("rfp_id", rfpId)
      .single();

    if (documentError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify user has access to this RFP's organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", document.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get file from GCS
    try {
      const fileBuffer = await getFile(document.gcs_object_name);

      // Return file with appropriate headers
      // @ts-ignore - fileBuffer is a Buffer which is compatible with BodyInit
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": document.mime_type,
          "Content-Disposition": `attachment; filename="${document.original_filename || document.filename}"`,
          "Cache-Control": "private, max-age=3600", // Cache for 1 hour
        },
      });
    } catch (gcsError) {
      console.error("GCS download error:", gcsError);
      return NextResponse.json(
        { error: "File not found in storage" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
