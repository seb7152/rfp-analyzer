import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  EvaluationVersion,
  CreateVersionRequest,
} from "@/lib/supabase/types";

/**
 * GET /api/rfps/[rfpId]/versions
 * Get all versions for an RFP with statistics
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ rfpId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all versions for this RFP
    const { data: versions, error } = await supabase
      .from("evaluation_versions")
      .select("*")
      .eq("rfp_id", rfpId)
      .order("version_number", { ascending: true });

    if (error) {
      console.error("Error fetching versions:", error);
      return NextResponse.json(
        { error: "Failed to fetch versions" },
        { status: 500 }
      );
    }

    // Fetch statistics for each version
    const versionsWithStats = await Promise.all(
      (versions || []).map(async (version: EvaluationVersion) => {
        const [
          ,
          { count: activeSuppliers },
          { count: removedSuppliers },
        ] = await Promise.all([
          supabase
            .from("suppliers")
            .select("id", { count: "exact", head: true })
            .eq("rfp_id", rfpId),
          supabase
            .from("version_supplier_status")
            .select("id", { count: "exact", head: true })
            .eq("version_id", version.id)
            .in("shortlist_status", ["active", "shortlisted"]),
          supabase
            .from("version_supplier_status")
            .select("id", { count: "exact", head: true })
            .eq("version_id", version.id)
            .eq("shortlist_status", "removed"),
        ]);

        // Calculate completion percentage
        const { data: responses } = await supabase
          .from("responses")
          .select("id, is_checked")
          .eq("version_id", version.id);

        const evaluatedCount =
          responses?.filter((r) => r.is_checked).length || 0;
        const totalResponses = responses?.length || 0;
        const completionPercentage =
          totalResponses > 0 ? (evaluatedCount / totalResponses) * 100 : 0;

        return {
          ...version,
          active_suppliers_count: activeSuppliers || 0,
          removed_suppliers_count: removedSuppliers || 0,
          completion_percentage: Math.round(completionPercentage),
        };
      })
    );

    return NextResponse.json({
      success: true,
      versions: versionsWithStats,
    });
  } catch (error) {
    console.error("Error in GET /api/rfps/[rfpId]/versions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rfps/[rfpId]/versions
 * Create a new evaluation version
 *
 * Body:
 * {
 *   version_name: string,
 *   description?: string,
 *   copy_from_version_id?: string,
 *   inherit_supplier_status?: boolean
 * }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateVersionRequest = await request.json();
    const {
      version_name,
      description,
      copy_from_version_id,
      inherit_supplier_status = true,
    } = body;

    if (!version_name) {
      return NextResponse.json(
        { error: "version_name is required" },
        { status: 400 }
      );
    }

    // Get the next version number
    const { data: lastVersion } = await supabase
      .from("evaluation_versions")
      .select("version_number")
      .eq("rfp_id", rfpId)
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersionNumber = (lastVersion?.version_number || 0) + 1;

    // Deactivate currently active version
    await supabase
      .from("evaluation_versions")
      .update({ is_active: false })
      .eq("rfp_id", rfpId)
      .eq("is_active", true);

    // Create new version
    const { data: newVersion, error: versionError } = await supabase
      .from("evaluation_versions")
      .insert({
        rfp_id: rfpId,
        version_number: nextVersionNumber,
        version_name,
        description: description || null,
        is_active: true,
        parent_version_id: copy_from_version_id || null,
        created_by: user.id,
      } as any)
      .select()
      .single();

    if (versionError || !newVersion) {
      console.error("Error creating version:", versionError);
      return NextResponse.json(
        { error: "Failed to create version" },
        { status: 500 }
      );
    }

    // Log audit trail
    await supabase.from("version_changes_log").insert({
      version_id: newVersion.id,
      rfp_id: rfpId,
      action: "version_created",
      details: {
        version_name,
        copy_from: copy_from_version_id || null,
      },
      created_by: user.id,
    });

    // If copying from previous version, copy responses and supplier statuses
    if (copy_from_version_id) {
      // Copy responses
      const { data: sourceResponses } = await supabase
        .from("responses")
        .select("*")
        .eq("version_id", copy_from_version_id);

      if (sourceResponses && sourceResponses.length > 0) {
        const responsesToInsert = sourceResponses.map((r) => ({
          ...r,
          id: undefined, // Let DB generate new IDs
          version_id: newVersion.id,
          is_snapshot: true,
          original_response_id: r.id,
        }));

        const { error: responseError } = await supabase
          .from("responses")
          .insert(responsesToInsert as any);

        if (responseError) {
          console.error("Error copying responses:", responseError);
          return NextResponse.json(
            { error: "Failed to copy responses" },
            { status: 500 }
          );
        }

        // Log audit trail
        await supabase.from("version_changes_log").insert({
          version_id: newVersion.id,
          rfp_id: rfpId,
          action: "responses_copied",
          details: {
            source_version_id: copy_from_version_id,
            response_count: sourceResponses.length,
          },
          created_by: user.id,
        });
      }
    }

    // Copy or create supplier statuses
    if (inherit_supplier_status && copy_from_version_id) {
      // Copy from previous version
      const { data: sourceStatuses } = await supabase
        .from("version_supplier_status")
        .select("*")
        .eq("version_id", copy_from_version_id);

      if (sourceStatuses && sourceStatuses.length > 0) {
        const statusesToInsert = sourceStatuses.map((s) => ({
          ...s,
          id: undefined,
          version_id: newVersion.id,
        }));

        await supabase
          .from("version_supplier_status")
          .insert(statusesToInsert as any);
      }
    } else {
      // Create all suppliers as active for new version
      const { data: suppliers } = await supabase
        .from("suppliers")
        .select("id")
        .eq("rfp_id", rfpId);

      if (suppliers && suppliers.length > 0) {
        const statusesToInsert = suppliers.map((s) => ({
          version_id: newVersion.id,
          supplier_id: s.id,
          shortlist_status: "active",
          is_active: true,
        }));

        await supabase
          .from("version_supplier_status")
          .insert(statusesToInsert as any);
      }
    }

    return NextResponse.json(
      {
        success: true,
        version: newVersion,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/rfps/[rfpId]/versions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
