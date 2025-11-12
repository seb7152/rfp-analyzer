import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { deleteFile } from "@/lib/gcs";

// GET: List all documents for an RFP
export async function GET(
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

    // Get documents for this RFP
    const { data: documents, error: fetchError } = await supabase
      .from("rfp_documents")
      .select("id, filename, original_filename, document_type, file_size, created_by, created_at, page_count")
      .eq("rfp_id", rfpId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (fetchError) {
      return NextResponse.json(
        { error: `Failed to fetch documents: ${fetchError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        documents: documents || [],
        count: (documents || []).length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Delete a document
export async function DELETE(
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

    // Get documentId from query parameters
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
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

    // Get document and verify it exists
    const { data: document, error: docFetchError } = await supabase
      .from("rfp_documents")
      .select("id, gcs_object_name")
      .eq("id", documentId)
      .eq("rfp_id", rfpId)
      .is("deleted_at", null)
      .single();

    if (docFetchError || !document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete file from GCS
    try {
      await deleteFile(document.gcs_object_name);
    } catch (gcsError) {
      // Log error but continue with soft delete
      console.error("GCS deletion error:", gcsError);
    }

    // Soft delete document (set deleted_at timestamp)
    const { error: updateError } = await supabase
      .from("rfp_documents")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", documentId);

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to delete document: ${updateError.message}` },
        { status: 400 }
      );
    }

    // Log the delete action
    await supabase.from("document_access_logs").insert({
      document_id: documentId,
      rfp_id: rfpId,
      organization_id: rfp.organization_id,
      user_id: user.id,
      action: "delete",
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Document deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
