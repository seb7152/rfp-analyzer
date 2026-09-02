import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRFPAccess } from "@/lib/permissions/rfp-access";
import { fetchAllRows } from "@/lib/supabase/fetch-all";

/**
 * GET /api/rfps/[rfpId]/preparation
 *
 * Everything the preparation hub shows, in one request: how far the
 * specification, the supplier list and the supplier responses have got.
 *
 * The hub used to be assembled client-side from five separate endpoints (RFP,
 * categories, requirements, suppliers, responses), which is what made the old
 * import screen slow to become useful. Here the counts are computed server-side
 * and only the counts travel.
 */

export type PreparationBlockState = "empty" | "partial" | "done";

interface SupplierProgress {
  id: string;
  name: string;
  supplier_id_external: string;
  contact_name: string | null;
  contact_email: string | null;
  /** Responses recorded for this supplier in the active version. */
  responsesTotal: number;
  /** Of those, the ones an evaluator has ticked off. */
  responsesAnswered: number;
  documents: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const versionIdParam = request.nextUrl.searchParams.get("versionId");

    if (!rfpId) {
      return NextResponse.json(
        { error: "RFP ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [rfpResult, access, activeVersionResult] = await Promise.all([
      supabase
        .from("rfps")
        .select(
          "id, title, description, status, peer_review_enabled, created_at, updated_at"
        )
        .eq("id", rfpId)
        .maybeSingle(),
      checkRFPAccess(rfpId, user.id),
      versionIdParam
        ? supabase
            .from("evaluation_versions")
            .select("id, version_name, version_number")
            .eq("id", versionIdParam)
            .maybeSingle()
        : supabase
            .from("evaluation_versions")
            .select("id, version_name, version_number")
            .eq("rfp_id", rfpId)
            .eq("is_active", true)
            .maybeSingle(),
    ]);

    if (!access.hasAccess) {
      if (access.error?.includes("not found")) {
        return NextResponse.json({ error: "RFP not found" }, { status: 404 });
      }
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const rfp = rfpResult.data;
    if (rfpResult.error || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const activeVersion = activeVersionResult.data ?? null;

    const [
      categoriesCount,
      requirementsCount,
      mandatoryCount,
      optionalCount,
      weightedRequirementsCount,
      suppliersResult,
      documentsResult,
    ] = await Promise.all([
      supabase
        .from("categories")
        .select("id", { count: "exact", head: true })
        .eq("rfp_id", rfpId),
      supabase
        .from("requirements")
        .select("id", { count: "exact", head: true })
        .eq("rfp_id", rfpId),
      supabase
        .from("requirements")
        .select("id", { count: "exact", head: true })
        .eq("rfp_id", rfpId)
        .eq("is_mandatory", true),
      supabase
        .from("requirements")
        .select("id", { count: "exact", head: true })
        .eq("rfp_id", rfpId)
        .eq("is_optional", true),
      supabase
        .from("requirements")
        .select("id", { count: "exact", head: true })
        .eq("rfp_id", rfpId)
        .neq("weight", 1),
      supabase
        .from("suppliers")
        .select(
          "id, name, supplier_id_external, contact_name, contact_email, created_at"
        )
        .eq("rfp_id", rfpId)
        .order("name", { ascending: true }),
      // One read covers both halves of the documents question: which files the
      // specification came from, and how many files each supplier has attached.
      supabase
        .from("rfp_documents")
        .select(
          "id, original_filename, document_type, created_at, document_suppliers(supplier_id)"
        )
        .eq("rfp_id", rfpId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false }),
    ]);

    const suppliers = suppliersResult.data || [];
    const documents = (documentsResult.data || []) as Array<{
      id: string;
      original_filename: string | null;
      document_type: string;
      created_at: string;
      document_suppliers: Array<{ supplier_id: string }> | null;
    }>;

    // Responses: one paged read of two columns rather than a count per
    // supplier, which would be a query per row of the table the hub renders.
    const responseRows = await fetchAllRows<{
      supplier_id: string;
      is_checked: boolean;
    }>(
      () => {
        let query = supabase
          .from("responses")
          .select("supplier_id, is_checked, id")
          .eq("rfp_id", rfpId);
        if (activeVersion) {
          query = query.eq("version_id", activeVersion.id);
        }
        return query.order("id", { ascending: true }) as never;
      },
      { label: "responses for preparation" }
    );

    const responsesBySupplier = new Map<
      string,
      { total: number; answered: number }
    >();
    for (const row of responseRows) {
      const entry = responsesBySupplier.get(row.supplier_id) || {
        total: 0,
        answered: 0,
      };
      entry.total++;
      if (row.is_checked) entry.answered++;
      responsesBySupplier.set(row.supplier_id, entry);
    }

    const documentsBySupplier = new Map<string, number>();
    for (const document of documents) {
      for (const link of document.document_suppliers || []) {
        documentsBySupplier.set(
          link.supplier_id,
          (documentsBySupplier.get(link.supplier_id) || 0) + 1
        );
      }
    }

    const supplierProgress: SupplierProgress[] = suppliers.map((supplier) => {
      const counts = responsesBySupplier.get(supplier.id);
      return {
        id: supplier.id,
        name: supplier.name,
        supplier_id_external: supplier.supplier_id_external,
        contact_name: supplier.contact_name,
        contact_email: supplier.contact_email,
        responsesTotal: counts?.total ?? 0,
        responsesAnswered: counts?.answered ?? 0,
        documents: documentsBySupplier.get(supplier.id) || 0,
      };
    });

    const requirementsTotal = requirementsCount.count ?? 0;

    const sourceDocuments = documents
      .filter((document) =>
        ["cahier_charges", "specifications", "technical_brief"].includes(
          document.document_type
        )
      )
      .map((document) => ({
        id: document.id,
        filename: document.original_filename,
        created_at: document.created_at,
      }));

    const suppliersWithResponses = supplierProgress.filter(
      (supplier) => supplier.responsesTotal > 0
    ).length;

    const specificationState: PreparationBlockState =
      requirementsTotal === 0 ? "empty" : "done";
    const suppliersState: PreparationBlockState =
      supplierProgress.length === 0 ? "empty" : "done";
    const responsesState: PreparationBlockState =
      suppliersWithResponses === 0
        ? "empty"
        : suppliersWithResponses < supplierProgress.length
          ? "partial"
          : "done";
    const weightsState: PreparationBlockState =
      (weightedRequirementsCount.count ?? 0) > 0 ? "done" : "empty";

    return NextResponse.json({
      rfp,
      userAccessLevel: access.accessLevel || "viewer",
      activeVersion,
      specification: {
        state: specificationState,
        categories: categoriesCount.count ?? 0,
        requirements: requirementsTotal,
        mandatory: mandatoryCount.count ?? 0,
        optional: optionalCount.count ?? 0,
        sourceDocuments,
      },
      suppliers: {
        state: suppliersState,
        total: supplierProgress.length,
        withContact: supplierProgress.filter((s) => s.contact_email).length,
        items: supplierProgress,
      },
      responses: {
        state: responsesState,
        suppliersWithResponses,
        requirementsTotal,
      },
      weights: {
        state: weightsState,
        customisedRequirements: weightedRequirementsCount.count ?? 0,
      },
      documents: { total: documents.length },
    });
  } catch (error) {
    console.error("Error in GET /api/rfps/[rfpId]/preparation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
