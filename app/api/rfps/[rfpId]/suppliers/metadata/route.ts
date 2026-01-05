import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";
import {
  getActiveSupplierIds,
  getVersionSupplierStatuses,
} from "@/lib/suppliers/status-cache";

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("versionId") || undefined;
    const supplierId = searchParams.get("supplierId") || undefined;
    const includeDocs = searchParams.get("includeDocs") !== "false";

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const accessCheckResponse = await verifyRFPAccess(rfpId, user.id);
    if (accessCheckResponse) {
      return accessCheckResponse;
    }

    let supplierStatuses: Record<string, { shortlist_status: string | null; is_active: boolean | null }> = {};
    let supplierIds: string[] = [];

    if (versionId) {
      const statuses = await getVersionSupplierStatuses(supabase, versionId);
      supplierStatuses = statuses.reduce((acc, status) => {
        acc[status.supplier_id] = {
          shortlist_status: status.shortlist_status,
          is_active: status.is_active,
        };
        return acc;
      }, {} as Record<string, { shortlist_status: string | null; is_active: boolean | null }>);

      const activeSupplierIds = getActiveSupplierIds(statuses);
      supplierIds = supplierId
        ? activeSupplierIds.has(supplierId)
          ? [supplierId]
          : []
        : Array.from(activeSupplierIds);
    } else {
      const { data: suppliers, error: suppliersError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("rfp_id", rfpId);

      if (suppliersError) {
        console.error("Error fetching suppliers for metadata:", suppliersError);
        return NextResponse.json(
          { error: "Failed to fetch supplier metadata" },
          { status: 500 }
        );
      }

      supplierIds = (suppliers || []).map((s) => s.id);

      if (supplierId) {
        supplierIds = supplierIds.filter((id) => id === supplierId);
      }

      supplierIds.forEach((id) => {
        supplierStatuses[id] = { shortlist_status: "active", is_active: true };
      });
    }

    let suppliersWithDocs = new Set<string>();

    if (includeDocs && supplierIds.length > 0) {
      const { data: rfpDocs } = await supabase
        .from("rfp_documents")
        .select("id")
        .eq("rfp_id", rfpId)
        .is("deleted_at", null);

      const rfpDocIds = rfpDocs?.map((d) => d.id) || [];

      if (rfpDocIds.length > 0) {
        const { data: docSuppliers } = await supabase
          .from("document_suppliers")
          .select("supplier_id")
          .in("document_id", rfpDocIds)
          .in("supplier_id", supplierIds);

        docSuppliers?.forEach((ds) => suppliersWithDocs.add(ds.supplier_id));
      }
    }

    const metadata = supplierIds.map((id) => ({
      supplier_id: id,
      shortlist_status: supplierStatuses[id]?.shortlist_status ?? null,
      is_active: supplierStatuses[id]?.is_active ?? null,
      has_documents: includeDocs ? suppliersWithDocs.has(id) : undefined,
    }));

    return NextResponse.json({ suppliers: metadata, count: metadata.length });
  } catch (error) {
    console.error("Error in supplier metadata endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier metadata" },
      { status: 500 }
    );
  }
}
