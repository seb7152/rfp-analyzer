import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/rfps/[rfpId]/suppliers
 * Get all suppliers for an RFP
 * Query params:
 * - includeStats: "true" | "false" (default: "false") - Include completion stats and documents
 * - versionId: UUID (optional) - Filter by version and exclude removed suppliers
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId } = params;
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get("includeStats") === "true";
    const versionId = searchParams.get("versionId");

    // Verify user is authenticated
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch suppliers for this RFP
    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("rfp_id", rfpId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching suppliers:", error);
      return NextResponse.json(
        { error: "Failed to fetch suppliers" },
        { status: 500 }
      );
    }

    // Filter suppliers by version and fetch statuses if versionId is provided
    let suppliersToUse = suppliers || [];
    let supplierStatusesMap: Record<string, any> = {};

    console.log("[SUPPLIERS API] rfpId:", rfpId, "versionId:", versionId);
    console.log("[SUPPLIERS API] Total suppliers from DB:", suppliers?.length);

    if (versionId) {
      // Fetch all supplier statuses for this version
      const { data: supplierStatuses, error: statusError } = await supabase
        .from("version_supplier_status")
        .select("supplier_id, shortlist_status, removal_reason")
        .eq("version_id", versionId);

      console.log(
        "[SUPPLIERS API] Supplier statuses fetched:",
        supplierStatuses?.length,
        "error:",
        statusError
      );

      if (supplierStatuses && supplierStatuses.length > 0) {
        console.log(
          "[SUPPLIERS API] Sample statuses:",
          supplierStatuses.slice(0, 3)
        );
      }

      // Build a map of supplier statuses
      supplierStatusesMap = {};
      (supplierStatuses || []).forEach((status: any) => {
        supplierStatusesMap[status.supplier_id] = {
          shortlist_status: status.shortlist_status,
          removal_reason: status.removal_reason,
        };
      });

      console.log(
        "[SUPPLIERS API] Status map size:",
        Object.keys(supplierStatusesMap).length
      );
      console.log(
        "[SUPPLIERS API] Status map keys (first 3):",
        Object.keys(supplierStatusesMap).slice(0, 3)
      );

      // Filter out removed suppliers
      const removedSupplierIds = new Set(
        (supplierStatuses || [])
          .filter((s: any) => s.shortlist_status === "removed")
          .map((s: any) => s.supplier_id)
      );

      console.log(
        "[SUPPLIERS API] Removed suppliers count:",
        removedSupplierIds.size
      );

      suppliersToUse = suppliersToUse.filter(
        (s) => !removedSupplierIds.has(s.id)
      );

      console.log(
        "[SUPPLIERS API] Suppliers after filtering:",
        suppliersToUse.length
      );
    } else {
      console.log(
        "[SUPPLIERS API] No versionId provided, skipping version filtering"
      );
    }

    // Add status info to suppliers before returning
    const suppliersWithStatus = suppliersToUse.map((supplier) => ({
      ...supplier,
      shortlist_status:
        supplierStatusesMap[supplier.id]?.shortlist_status || "active",
      removal_reason: supplierStatusesMap[supplier.id]?.removal_reason || null,
    }));

    console.log(
      "[SUPPLIERS API] Response - first supplier:",
      suppliersWithStatus[0]
        ? {
            id: suppliersWithStatus[0].id,
            name: suppliersWithStatus[0].name,
            shortlist_status: suppliersWithStatus[0].shortlist_status,
            removal_reason: suppliersWithStatus[0].removal_reason,
          }
        : null
    );

    if (!includeStats) {
      return NextResponse.json({
        success: true,
        suppliers: suppliersWithStatus,
      });
    }

    // --- Stats Calculation ---

    // 1. Fetch all necessary data in parallel
    // We need to fetch documents first to get their IDs for the join table,
    // but we can also just fetch all rfp_documents and then fetch the join table.
    // However, Promise.all runs in parallel.
    // Let's fetch rfp_documents separately or use a join if Supabase supports it easily.
    // For simplicity and to avoid complex joins in one query, let's do it in steps or use a slightly different approach.

    // Actually, we can fetch rfp_documents and other things in parallel,
    // then fetch document_suppliers based on the document IDs.
    // But to keep it in one Promise.all block for the main data:

    const responsesQuery = versionId
      ? supabase
          .from("responses")
          .select(
            "id, supplier_id, requirement_id, manual_score, ai_score, is_checked"
          )
          .eq("rfp_id", rfpId)
          .eq("version_id", versionId)
      : supabase
          .from("responses")
          .select(
            "id, supplier_id, requirement_id, manual_score, ai_score, is_checked"
          )
          .eq("rfp_id", rfpId);

    const [
      { data: categories },
      { data: requirements },
      { data: responses },
      { data: rfpDocuments },
    ] = await Promise.all([
      supabase.from("categories").select("id, weight").eq("rfp_id", rfpId),
      supabase.from("requirements").select("id, weight").eq("rfp_id", rfpId),
      responsesQuery,
      supabase
        .from("rfp_documents")
        .select("id, filename, original_filename, created_at")
        .eq("rfp_id", rfpId)
        .is("deleted_at", null),
    ]);

    // Now fetch the link between documents and suppliers
    const docIds = rfpDocuments?.map((d) => d.id) || [];
    let documentSuppliers: any[] = [];

    if (docIds.length > 0) {
      const { data: ds } = await supabase
        .from("document_suppliers")
        .select("document_id, supplier_id")
        .in("document_id", docIds);
      documentSuppliers = ds || [];
    }

    // 2. Prepare weights map
    const weightsConfig: Record<string, number> = {};
    let totalWeight = 0;

    (categories || []).forEach((cat: any) => {
      if (cat.weight) weightsConfig[cat.id] = cat.weight;
    });

    (requirements || []).forEach((req: any) => {
      if (req.weight) {
        weightsConfig[req.id] = req.weight;
        totalWeight += req.weight;
      }
    });

    // 3. Group data by supplier
    const suppliersWithStats = suppliersToUse.map((supplier) => {
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

      supplierResponses.forEach((r) => {
        const score = r.manual_score ?? r.ai_score;
        if (score !== null && score !== undefined) {
          const weight = weightsConfig[r.requirement_id] || 0;
          totalWeightedScore += score * weight;
        }
      });

      const maxPossibleScore = 5 * totalWeight;
      const completionPercentage =
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

      // --- Documents ---
      const formattedDocs = supplierDocs.map((doc) => ({
        id: doc.id,
        name: doc.filename || doc.original_filename || "Document",
        uploadedAt: doc.created_at || "",
      }));

      return {
        ...supplier,
        scorePercentage: Math.min(100, Math.max(0, completionPercentage)),
        responseCompletionPercentage,
        checkedResponses,
        totalResponses: totalResponsesCount,
        documents: formattedDocs,
        hasDocuments: formattedDocs.length > 0,
        shortlist_status:
          supplierStatusesMap[supplier.id]?.shortlist_status || "active",
        removal_reason:
          supplierStatusesMap[supplier.id]?.removal_reason || null,
      };
    });

    return NextResponse.json({
      success: true,
      suppliers: suppliersWithStats || [],
    });
  } catch (error) {
    console.error("Error in GET /api/rfps/[rfpId]/suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}
