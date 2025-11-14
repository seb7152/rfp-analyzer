import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/rfps/[rfpId]/documents/[documentId]/supplier
 * Get the supplier name associated with a document
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ rfpId: string; documentId: string }> },
) {
  try {
    const params = await context.params;
    const { rfpId, documentId } = params;

    // Verify user is authenticated
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get the supplier associated with this document
    const { data: association, error: associationError } = await supabase
      .from("document_suppliers")
      .select(
        `
        supplier_id (
          id,
          name
        )
      `,
      )
      .eq("document_id", documentId)
      .single();

    if (associationError || !association) {
      return NextResponse.json({ supplierName: null }, { status: 200 });
    }

    // Supabase returns foreign key relations as arrays, so we need to access the first element
    const supplierData = Array.isArray(association.supplier_id)
      ? association.supplier_id[0]
      : association.supplier_id;

    const supplierName =
      supplierData && typeof supplierData === "object" && "name" in supplierData
        ? (supplierData as { id: string; name: string }).name
        : null;

    return NextResponse.json(
      {
        supplierName,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching supplier name:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
