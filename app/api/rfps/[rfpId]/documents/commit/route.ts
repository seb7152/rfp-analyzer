import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { deleteFile, getFileMetadata } from "@/lib/gcs";

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
      documentId,
      objectName,
      filename,
      originalFilename,
      mimeType = "application/pdf",
      fileSize,
      documentType = "cahier_charges",
      supplierId,
    } = body;

    // Validation
    if (!documentId || !objectName || !filename || !fileSize) {
      return NextResponse.json(
        {
          error: "documentId, objectName, filename, and fileSize are required",
        },
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

    // Verify file exists in GCS
    try {
      const metadata = await getFileMetadata(objectName);

      // Validate file size matches
      if (metadata.size !== fileSize) {
        return NextResponse.json(
          {
            error: `File size mismatch: expected ${fileSize}, got ${metadata.size}`,
          },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("GCS file validation error:", error);
      return NextResponse.json(
        { error: "File not found in cloud storage" },
        { status: 404 }
      );
    }

    // Save document metadata to database
    const { data: document, error: insertError } = await supabase
      .from("rfp_documents")
      .insert({
        id: documentId,
        rfp_id: rfpId,
        organization_id: rfp.organization_id,
        filename,
        original_filename: originalFilename || filename,
        document_type: documentType,
        mime_type: mimeType,
        file_size: fileSize,
        gcs_object_name: objectName,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      // Clean up GCS file if database insertion fails
      try {
        await deleteFile(objectName);
      } catch (cleanupError) {
        console.error("GCS cleanup error:", cleanupError);
      }

      return NextResponse.json(
        {
          error: `Failed to save document metadata: ${insertError.message}`,
        },
        { status: 400 }
      );
    }

    // If this is a supplier response document, create the association
    if (documentType === "supplier_response" && supplierId) {
      // Verify supplier belongs to this RFP
      const { data: supplier, error: supplierError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("id", supplierId)
        .eq("rfp_id", rfpId)
        .single();

      if (supplierError || !supplier) {
        // Clean up the document we just created
        await supabase.from("rfp_documents").delete().eq("id", documentId);
        try {
          await deleteFile(objectName);
        } catch (cleanupError) {
          console.error("GCS cleanup error:", cleanupError);
        }

        return NextResponse.json(
          { error: "Supplier not found or does not belong to this RFP" },
          { status: 400 }
        );
      }

      // Create the document-supplier association
      const { error: associationError } = await supabase
        .from("document_suppliers")
        .insert({
          document_id: documentId,
          supplier_id: supplierId,
        });

      if (associationError) {
        // Clean up the document we just created
        await supabase.from("rfp_documents").delete().eq("id", documentId);
        try {
          await deleteFile(objectName);
        } catch (cleanupError) {
          console.error("GCS cleanup error:", cleanupError);
        }

        return NextResponse.json(
          {
            error: `Failed to create supplier association: ${associationError.message}`,
          },
          { status: 400 }
        );
      }
    }

    // Log the upload action
    await supabase.from("document_access_logs").insert({
      document_id: documentId,
      rfp_id: rfpId,
      organization_id: rfp.organization_id,
      user_id: user.id,
      action: "upload",
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json(
      {
        success: true,
        document: {
          id: document.id,
          rfp_id: document.rfp_id,
          filename: document.filename,
          file_size: document.file_size,
          mime_type: document.mime_type,
          document_type: document.document_type,
          uploaded_at: document.created_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Commit error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
