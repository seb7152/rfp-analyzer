import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/rfps/[rfpId]/requirements/bulk-update-flags
 *
 * Bulk update mandatory/optional flags for multiple requirements
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string }> },
) {
  try {
    const { rfpId } = await context.params;
    const body = await request.json();
    const { updates } = body;

    // Validate inputs
    if (!rfpId) {
      return NextResponse.json(
        { error: "RFP ID is required" },
        { status: 400 },
      );
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: "Updates array is required and must not be empty" },
        { status: 400 },
      );
    }

    // Validate each update
    for (const update of updates) {
      if (!update.requirementId) {
        return NextResponse.json(
          { error: "Each update must have a requirementId" },
          { status: 400 },
        );
      }

      if (
        typeof update.is_mandatory !== "boolean" &&
        typeof update.is_optional !== "boolean"
      ) {
        return NextResponse.json(
          {
            error:
              "Each update must have at least one flag (is_mandatory or is_optional)",
          },
          { status: 400 },
        );
      }

      // Ensure both flags are not true simultaneously
      if (update.is_mandatory === true && update.is_optional === true) {
        return NextResponse.json(
          {
            error: `Requirement ${update.requirementId} cannot be both mandatory and optional`,
          },
          { status: 400 },
        );
      }
    }

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .maybeSingle();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: "Access denied to this RFP" },
        { status: 403 },
      );
    }

    // Update each requirement
    const results = [];
    for (const update of updates) {
      const updateData: any = {};
      if (typeof update.is_mandatory === "boolean") {
        updateData.is_mandatory = update.is_mandatory;
      }
      if (typeof update.is_optional === "boolean") {
        updateData.is_optional = update.is_optional;
      }

      const { data: requirement, error: updateError } = await supabase
        .from("requirements")
        .update(updateData)
        .eq("id", update.requirementId)
        .eq("rfp_id", rfpId)
        .select()
        .single();

      if (updateError) {
        console.error(
          `Error updating requirement ${update.requirementId}:`,
          updateError,
        );
        results.push({
          requirementId: update.requirementId,
          success: false,
          error: updateError.message,
        });
      } else {
        results.push({
          requirementId: update.requirementId,
          success: true,
          requirement,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return NextResponse.json(
      {
        message: `Updated ${successCount} requirements successfully${failureCount > 0 ? `, ${failureCount} failed` : ""}`,
        results,
        successCount,
        failureCount,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
