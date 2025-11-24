import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * PATCH endpoint to update requirement details (rf_document_id, etc)
 */
export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: { rfpId: string; requirementId: string };
  }
) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await request.json();

    // Check user has access to RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", params.rfpId)
      .single();

    if (rfpError || !rfp) {
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

    // Verify requirement belongs to this RFP
    const { data: requirement, error: reqError } = await supabase
      .from("requirements")
      .select("id, rfp_id")
      .eq("id", params.requirementId)
      .eq("rfp_id", params.rfpId)
      .single();

    if (reqError || !requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      );
    }

    // If updating rf_document_id, verify the document exists and belongs to the RFP
    if (body.rf_document_id) {
      const { data: doc, error: docError } = await supabase
        .from("rfp_documents")
        .select("id, rfp_id")
        .eq("id", body.rf_document_id)
        .eq("rfp_id", params.rfpId)
        .single();

      if (docError || !doc) {
        return NextResponse.json(
          { error: "Document not found or does not belong to this RFP" },
          { status: 400 }
        );
      }
    }

    // Update the requirement
    const updateData: Record<string, unknown> = {};

    if (body.rf_document_id !== undefined) {
      updateData.rf_document_id = body.rf_document_id;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("requirements")
      .update(updateData)
      .eq("id", params.requirementId);

    if (updateError) {
      console.error("Failed to update requirement:", updateError);
      return NextResponse.json(
        { error: "Failed to update requirement" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Requirement updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Requirement update error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
