import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { rfpId: string; documentId: string } }
) {
  try {
    const supabase = await createClient();
    const { rfpId, documentId } = params;

    // Verify user has access to this RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json(
        { error: "RFP not found or access denied" },
        { status: 404 }
      );
    }

    // Verify document exists and belongs to this RFP
    const { data: document, error: docError } = await supabase
      .from("rfp_documents")
      .select("*")
      .eq("id", documentId)
      .eq("rfp_id", rfpId)
      .eq("mime_type", "application/pdf")
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: "Document not found or not a PDF" },
        { status: 404 }
      );
    }

    // First, reset all other cahier_charges documents for this RFP to NULL
    await supabase
      .from("rfp_documents")
      .update({ document_type: null })
      .eq("rfp_id", rfpId)
      .eq("document_type", "cahier_charges")
      .neq("id", documentId);

    // Then update this document to be the cahier_charges
    const { error: updateError } = await supabase
      .from("rfp_documents")
      .update({ document_type: "cahier_charges" })
      .eq("id", documentId);

    if (updateError) {
      console.error("Error updating document type:", updateError);
      return NextResponse.json(
        { error: "Failed to update document type" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Document set as default cahier des charges",
      document: {
        id: document.id,
        filename: document.filename,
        document_type: "cahier_charges",
      },
    });
  } catch (error) {
    console.error("Error in set-default document API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
