import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { UpdateSupplierStatusRequest } from "@/lib/supabase/types";

/**
 * PUT /api/rfps/[rfpId]/versions/[versionId]/suppliers/[supplierId]/status
 * Update supplier status (remove/restore supplier in version)
 *
 * Body:
 * {
 *   shortlist_status: "active" | "shortlisted" | "removed",
 *   removal_reason?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      rfpId: string;
      versionId: string;
      supplierId: string;
    }>;
  }
) {
  try {
    const params = await context.params;
    const { rfpId, versionId, supplierId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: UpdateSupplierStatusRequest = await request.json();
    const { shortlist_status, removal_reason } = body;

    if (!["active", "shortlisted", "removed"].includes(shortlist_status)) {
      return NextResponse.json(
        { error: "Invalid shortlist_status" },
        { status: 400 }
      );
    }

    // Verify version exists and is not finalized
    const { data: version } = await supabase
      .from("evaluation_versions")
      .select("finalized_at")
      .eq("id", versionId)
      .eq("rfp_id", rfpId)
      .single();

    if (!version) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    if (version.finalized_at) {
      return NextResponse.json(
        { error: "Cannot modify finalized version" },
        { status: 400 }
      );
    }

    // Verify supplier exists in this version
    const { data: supplierStatus, error: fetchError } = await supabase
      .from("version_supplier_status")
      .select("*")
      .eq("version_id", versionId)
      .eq("supplier_id", supplierId)
      .single();

    if (fetchError || !supplierStatus) {
      return NextResponse.json(
        { error: "Supplier not found in version" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      shortlist_status,
    };

    if (shortlist_status === "removed") {
      updateData.removed_at = new Date().toISOString();
      updateData.removed_by = user.id;
      updateData.removal_reason = removal_reason || null;
      updateData.is_active = false;
    } else {
      updateData.removed_at = null;
      updateData.removed_by = null;
      updateData.removal_reason = null;
      updateData.is_active = true;
    }

    // Update supplier status
    const { error: updateError } = await supabase
      .from("version_supplier_status")
      .update(updateData)
      .eq("version_id", versionId)
      .eq("supplier_id", supplierId);

    if (updateError) {
      console.error("Error updating supplier status:", updateError);
      return NextResponse.json(
        { error: "Failed to update supplier status" },
        { status: 500 }
      );
    }

    // Log audit trail
    const action =
      shortlist_status === "removed" ? "supplier_removed" : "supplier_restored";
    await supabase.from("version_changes_log").insert({
      version_id: versionId,
      rfp_id: rfpId,
      action,
      details: {
        supplier_id: supplierId,
        new_status: shortlist_status,
        old_status: supplierStatus.shortlist_status,
        reason: removal_reason || null,
      },
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Supplier ${
        shortlist_status === "removed" ? "removed from" : "restored to"
      } version`,
    });
  } catch (error) {
    console.error("Error in PUT supplier status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
