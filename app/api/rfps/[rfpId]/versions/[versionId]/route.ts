import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { UpdateVersionRequest } from "@/lib/supabase/types";

/**
 * GET /api/rfps/[rfpId]/versions/[versionId]
 * Get version details with supplier status
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ rfpId: string; versionId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId, versionId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch version details
    const { data: version, error: versionError } = await supabase
      .from("evaluation_versions")
      .select("*")
      .eq("id", versionId)
      .eq("rfp_id", rfpId)
      .single();

    if (versionError || !version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Fetch supplier statuses for this version
    const { data: supplierStatuses } = await supabase
      .from("version_supplier_status")
      .select("*")
      .eq("version_id", versionId);

    // Fetch supplier details
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("*")
      .eq("rfp_id", rfpId);

    // Enrich suppliers with their status in this version
    const suppliersWithStatus = (suppliers || []).map((supplier) => {
      const status = supplierStatuses?.find(
        (s) => s.supplier_id === supplier.id
      );
      return {
        ...supplier,
        status: status?.shortlist_status || "active",
        removal_reason: status?.removal_reason || null,
        removed_at: status?.removed_at || null,
      };
    });

    // Calculate statistics
    const { data: responses } = await supabase
      .from("responses")
      .select("id, is_checked")
      .eq("version_id", versionId);

    const { data: requirements } = await supabase
      .from("requirements")
      .select("id")
      .eq("rfp_id", rfpId);

    const evaluatedCount = responses?.filter((r) => r.is_checked).length || 0;
    const totalResponses = responses?.length || 0;
    const completionPercentage =
      totalResponses > 0 ? (evaluatedCount / totalResponses) * 100 : 0;

    const activeSuppliers =
      supplierStatuses?.filter((s) => s.shortlist_status !== "removed")
        .length || 0;
    const removedSuppliers =
      supplierStatuses?.filter((s) => s.shortlist_status === "removed")
        .length || 0;

    return NextResponse.json({
      success: true,
      version,
      suppliers: suppliersWithStatus,
      statistics: {
        total_suppliers: suppliers?.length || 0,
        active_suppliers: activeSuppliers,
        removed_suppliers: removedSuppliers,
        total_requirements: requirements?.length || 0,
        evaluated_requirements: evaluatedCount,
        completion_percentage: Math.round(completionPercentage),
      },
    });
  } catch (error) {
    console.error(
      "Error in GET /api/rfps/[rfpId]/versions/[versionId]:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/rfps/[rfpId]/versions/[versionId]
 * Update version metadata
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string; versionId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId, versionId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateVersionRequest = await request.json();

    // Verify version exists
    const { data: version } = await supabase
      .from("evaluation_versions")
      .select("id")
      .eq("id", versionId)
      .eq("rfp_id", rfpId)
      .single();

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const updateData: any = {};
    if (body.version_name !== undefined)
      updateData.version_name = body.version_name;
    if (body.description !== undefined)
      updateData.description = body.description;

    const { error } = await supabase
      .from("evaluation_versions")
      .update(updateData)
      .eq("id", versionId);

    if (error) {
      console.error("Error updating version:", error);
      return NextResponse.json(
        { error: "Failed to update version" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Version updated successfully",
    });
  } catch (error) {
    console.error(
      "Error in PUT /api/rfps/[rfpId]/versions/[versionId]:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
