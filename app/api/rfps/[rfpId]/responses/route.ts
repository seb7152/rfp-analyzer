import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getResponsesForRFP } from "@/lib/supabase/queries";

/**
 * GET /api/rfps/[rfpId]/responses
 * Fetch all responses for an RFP, optionally filtered by requirement
 *
 * Query Parameters:
 * - requirementId (optional): Filter responses to a specific requirement
 * - versionId (optional): Filter responses to a specific version
 *
 * Returns: Array of responses with supplier information
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId } = params;
    const { searchParams } = new URL(request.url);
    const requirementId = searchParams.get("requirementId") || undefined;
    const versionId = searchParams.get("versionId") || undefined;

    // Verify RFP exists and user has access
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
      .select("id")
      .eq("id", rfpId)
      .maybeSingle();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Fetch responses with supplier information, passing versionId if provided
    let responses = await getResponsesForRFP(rfpId, requirementId, versionId);

    // Filter by supplier status to exclude removed suppliers if version is specified
    if (versionId) {
      const { data: activeSupplierStatuses } = await supabase
        .from("version_supplier_status")
        .select("supplier_id")
        .eq("version_id", versionId)
        .in("shortlist_status", ["active", "shortlisted"]);

      const activeSupplierIds = new Set(
        (activeSupplierStatuses || []).map((status) => status.supplier_id)
      );

      responses = responses.filter((r) => activeSupplierIds.has(r.supplier_id));
    }

    // Fetch document availability for these suppliers
    // 1. Get all document IDs for this RFP
    const { data: rfpDocs } = await supabase
      .from("rfp_documents")
      .select("id")
      .eq("rfp_id", rfpId)
      .is("deleted_at", null);

    const rfpDocIds = rfpDocs?.map((d) => d.id) || [];
    const supplierIds = Array.from(
      new Set(responses.map((r) => r.supplier_id))
    );
    const suppliersWithDocs = new Set<string>();

    // 2. Check which suppliers are linked to these documents
    if (rfpDocIds.length > 0 && supplierIds.length > 0) {
      const { data: docSuppliers } = await supabase
        .from("document_suppliers")
        .select("supplier_id")
        .in("document_id", rfpDocIds)
        .in("supplier_id", supplierIds);

      docSuppliers?.forEach((ds) => suppliersWithDocs.add(ds.supplier_id));
    }

    // 3. Enrich responses with has_documents flag
    const enrichedResponses = responses.map((response) => ({
      ...response,
      supplier: {
        ...response.supplier,
        has_documents: suppliersWithDocs.has(response.supplier_id),
      },
    }));

    return NextResponse.json({
      responses: enrichedResponses,
      meta: {
        total: responses.length,
        byStatus: {
          pending: responses.filter((r) => r.status === "pending").length,
          pass: responses.filter((r) => r.status === "pass").length,
          partial: responses.filter((r) => r.status === "partial").length,
          fail: responses.filter((r) => r.status === "fail").length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching responses:", error);
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 }
    );
  }
}
