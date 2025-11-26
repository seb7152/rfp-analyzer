import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
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
        { error: "RFP ID and Document ID are required" },
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

    // Get document details
    const { data: document, error: docError } = await supabase
      .from("rfp_documents")
      .select("id, gcs_object_name, original_filename")
      .eq("id", documentId)
      .eq("rfp_id", rfpId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Get file from GCS
    const { generateDownloadSignedUrl } = await import("@/lib/gcs");
    const fileUrl = await generateDownloadSignedUrl(document.gcs_object_name);

    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch file from storage" },
        { status: 500 }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();

    // Use ExcelJS to read worksheets
    const ExcelJS = require("exceljs");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer);

    // Get all worksheet names
    const worksheetNames = workbook.worksheets.map(
      (ws: any) => ws.name
    );

    return NextResponse.json({
      worksheets: worksheetNames,
    });
  } catch (error) {
    console.error("Get worksheets error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
