import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * PATCH /api/rfps/[rfpId]/requirements/[requirementId]/flags
 *
 * Update mandatory/optional flags for a requirement
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string; requirementId: string }> }
) {
  try {
    const { rfpId, requirementId } = await context.params;
    const body = await request.json();
    const { is_mandatory, is_optional } = body;

    // Validate inputs
    if (!rfpId || !requirementId) {
      return NextResponse.json(
        { error: "RFP ID and Requirement ID are required" },
        { status: 400 }
      );
    }

    if (typeof is_mandatory !== "boolean" && typeof is_optional !== "boolean") {
      return NextResponse.json(
        {
          error:
            "At least one flag (is_mandatory or is_optional) must be provided",
        },
        { status: 400 }
      );
    }

    // Ensure both flags are not true simultaneously
    if (is_mandatory === true && is_optional === true) {
      return NextResponse.json(
        { error: "A requirement cannot be both mandatory and optional" },
        { status: 400 }
      );
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
        { status: 403 }
      );
    }

    // Update the requirement flags
    const updateData: any = {};
    if (typeof is_mandatory === "boolean")
      updateData.is_mandatory = is_mandatory;
    if (typeof is_optional === "boolean") updateData.is_optional = is_optional;

    const { data: requirement, error: updateError } = await supabase
      .from("requirements")
      .update(updateData)
      .eq("id", requirementId)
      .eq("rfp_id", rfpId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating requirement flags:", updateError);
      return NextResponse.json(
        { error: "Failed to update requirement flags" },
        { status: 500 }
      );
    }

    return NextResponse.json({ requirement }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
