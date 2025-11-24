import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { generateDownloadSignedUrl } from "@/lib/gcs";

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string; documentId: string } }
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

    const { rfpId, documentId } = params;

    if (!rfpId || !documentId) {
      return NextResponse.json(
        { error: "RFP ID and document ID are required" },
        { status: 400 }
      );
    }

    // Get document metadata from database
    const { data: document, error: fetchError } = await supabase
      .from("rfp_documents")
      .select("id, rfp_id, organization_id, gcs_object_name, page_count")
      .eq("id", documentId)
      .eq("rfp_id", rfpId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Verify user is part of the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", document.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Generate signed URL for reading
    try {
      const ttlSeconds = parseInt(process.env.SIGN_URL_TTL_SEC || "3600", 10);

      const downloadUrl = await generateDownloadSignedUrl(
        document.gcs_object_name,
        ttlSeconds * 1000
      );

      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

      // Log the view action
      await supabase.from("document_access_logs").insert({
        document_id: documentId,
        rfp_id: rfpId,
        organization_id: document.organization_id,
        user_id: user.id,
        action: "view",
        ip_address: request.headers.get("x-forwarded-for"),
        user_agent: request.headers.get("user-agent"),
      });

      return NextResponse.json(
        {
          url: downloadUrl,
          expiresAt: expiresAt.toISOString(),
          pageCount: document.page_count,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("GCS signed URL generation error:", error);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("View URL error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
