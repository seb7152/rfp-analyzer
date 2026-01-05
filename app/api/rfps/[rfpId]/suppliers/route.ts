import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/rfps/[rfpId]/suppliers
 * Get all suppliers for an RFP
 * Query params:
 * - includeStats: "true" | "false" (default: "false") - Include completion stats and documents
 * - versionId: UUID (optional) - Filter by version and exclude removed suppliers
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";
    const versionId = searchParams.get("versionId");

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    const accessCheckResponse = await verifyRFPAccess(rfpId, user.id);
    if (accessCheckResponse) {
      return accessCheckResponse;
    }

    // Fetch suppliers for this RFP, filtered by version if provided
    let suppliers, suppliersError;

    if (versionId) {
      // Fetch suppliers with their version status
      const result = await supabase
        .from("suppliers")
        .select(
          `
          id,
          name,
          version_supplier_status!inner (
            is_active,
            shortlist_status
          )
        `
        )
        .eq("rfp_id", rfpId)
        .eq("version_supplier_status.version_id", versionId)
        .order("name", { ascending: true });

      suppliersError = result.error;

      // Filter client-side to exclude removed and inactive suppliers
      // (Supabase .neq() with nested relations may not work reliably)
      // version_supplier_status might be an array or object depending on query result
      suppliers =
        result.data?.filter((supplier: any) => {
          const status = supplier.version_supplier_status;
          const statusObj = Array.isArray(status) ? status[0] : status;

          return (
            statusObj &&
            statusObj.is_active === true &&
            statusObj.shortlist_status !== "removed"
          );
        }) || [];
    } else {
      // Fetch all suppliers if no versionId provided
      const result = await supabase
        .from("suppliers")
        .select("id, name, supplier_id_external, contact_name, contact_email, contact_phone")
        .eq("rfp_id", rfpId)
        .order("name", { ascending: true });

      suppliers = result.data;
      suppliersError = result.error;
    }

    if (suppliersError) {
      console.error("Error fetching suppliers:", suppliersError);
      return NextResponse.json(
        { error: "Failed to fetch suppliers" },
        { status: 500 }
      );
    }

    if (!includeStats) {
      return NextResponse.json({
        suppliers: suppliers || [],
        count: suppliers?.length || 0,
      });
    }

    // --- Stats Calculation ---

    // Fetch all necessary data in parallel
    const [
      { data: categories },
      { data: requirements },
      { data: responses },
      { data: rfpDocuments },
    ] = await Promise.all([
      supabase.from("categories").select("id, weight").eq("rfp_id", rfpId),
      supabase
        .from("requirements")
        .select("id, weight, category_id")
        .eq("rfp_id", rfpId),
      supabase
        .from("responses")
        .select(
          "id, supplier_id, requirement_id, manual_score, ai_score, is_checked"
        )
        .eq("rfp_id", rfpId)
        .eq("version_id", versionId),
      supabase
        .from("rfp_documents")
        .select("id, filename, original_filename, created_at")
        .eq("rfp_id", rfpId)
        .is("deleted_at", null),
    ]);

    // Fetch document-suppliers join table
    const docIds = rfpDocuments?.map((d) => d.id) || [];
    let documentSuppliers: any[] = [];

    if (docIds.length > 0) {
      const { data: ds } = await supabase
        .from("document_suppliers")
        .select("document_id, supplier_id")
        .in("document_id", docIds);
      documentSuppliers = ds || [];
    }

    // Prepare weights map
    const weightsConfig: Record<string, number> = {};
    (categories || []).forEach((cat: any) => {
      if (cat.weight) weightsConfig[cat.id] = cat.weight;
    });
    (requirements || []).forEach((req: any) => {
      if (req.weight) weightsConfig[req.id] = req.weight;
    });

    // Calculate stats for each supplier
    const suppliersWithStats = suppliers?.map((supplier: any) => {
      const supplierResponses =
        responses?.filter((r) => r.supplier_id === supplier.id) || [];

      // Find documents for this supplier
      const supplierDocIds = new Set(
        documentSuppliers
          .filter((ds) => ds.supplier_id === supplier.id)
          .map((ds) => ds.document_id)
      );

      const supplierDocs =
        rfpDocuments?.filter((d) => supplierDocIds.has(d.id)) || [];

      // --- Score Calculation (Weighted) ---
      let totalWeightedScore = 0;
      let totalWeight = 0;

      supplierResponses.forEach((r) => {
        const score = r.manual_score ?? r.ai_score;
        if (score !== null && score !== undefined) {
          const weight = weightsConfig[r.requirement_id] || 0;
          totalWeightedScore += score * weight;
          totalWeight += weight;
        }
      });

      const maxPossibleScore = 5 * totalWeight;
      const scorePercentage =
        maxPossibleScore > 0
          ? Math.round((totalWeightedScore / maxPossibleScore) * 100)
          : 0;

      // --- Response Completion Stats ---
      const totalResponsesCount = supplierResponses.length;
      const checkedResponses = supplierResponses.filter(
        (r) => r.is_checked
      ).length;
      const responseCompletionPercentage =
        totalResponsesCount > 0
          ? Math.round((checkedResponses / totalResponsesCount) * 100)
          : 0;

      return {
        id: supplier.id,
        name: supplier.name,
        scorePercentage,
        responseCompletionPercentage,
        checkedResponses,
        totalResponses: totalResponsesCount,
        documents: supplierDocs,
        hasDocuments: supplierDocs.length > 0,
      };
    });

    // Calculate ranking
    const rankedSuppliers = [...(suppliersWithStats || [])].sort(
      (a, b) => b.scorePercentage - a.scorePercentage
    );
    rankedSuppliers.forEach((supplier, index) => {
      (supplier as any).ranking = index + 1;
    });

    return NextResponse.json({
      suppliers: rankedSuppliers || [],
      count: rankedSuppliers?.length || 0,
    });
  } catch (error) {
    console.error("Error in suppliers endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
