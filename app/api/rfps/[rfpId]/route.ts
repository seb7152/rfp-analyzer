import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";

export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    if (!rfpId) {
      return NextResponse.json(
        { error: "RFP ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    const accessCheckResponse = await verifyRFPAccess(rfpId, user.id);
    if (accessCheckResponse) {
      return accessCheckResponse;
    }

    // Get the RFP details
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select(
        "id, title, description, organization_id, created_by, created_at, updated_at"
      )
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    return NextResponse.json(rfp, { status: 200 });
  } catch (error) {
    console.error("Error fetching RFP:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rfpId } = params;

    if (!rfpId) {
      return NextResponse.json(
        { error: "RFP ID is required" },
        { status: 400 }
      );
    }

    // Get the RFP to check ownership and organization
    const { data: rfp, error: rfpFetchError } = await supabase
      .from("rfps")
      .select("id, organization_id, created_by")
      .eq("id", rfpId)
      .single();

    if (rfpFetchError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify user has access and check if they're organization admin
    // Only organization admins can delete RFPs
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: "Access denied. User not in RFP organization." },
        { status: 403 }
      );
    }

    if (userOrg.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Only organization admins can delete RFPs." },
        { status: 403 }
      );
    }

    // Delete the RFP (cascade should handle related data)
    const { error: deleteError } = await supabase
      .from("rfps")
      .delete()
      .eq("id", rfpId);

    if (deleteError) {
      return NextResponse.json(
        { error: `Failed to delete RFP: ${deleteError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "RFP deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("RFP deletion error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { rfpId } = params;

    if (!rfpId) {
      return NextResponse.json(
        { error: "RFP ID is required" },
        { status: 400 }
      );
    }

    const requestBody = await request.json();
    const { organization_id: newOrganizationId } = requestBody;

    if (!newOrganizationId) {
      return NextResponse.json(
        { error: "organization_id is required" },
        { status: 400 }
      );
    }

    // Get the RFP to check current organization
    const { data: rfp, error: rfpFetchError } = await supabase
      .from("rfps")
      .select("id, organization_id, created_by")
      .eq("id", rfpId)
      .single();

    if (rfpFetchError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify user is admin in CURRENT organization
    const { data: currentUserOrg, error: currentOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (currentOrgError || !currentUserOrg || currentUserOrg.role !== "admin") {
      return NextResponse.json(
        {
          error: "Access denied. Only admins can change RFP organizations.",
        },
        { status: 403 }
      );
    }

    // Verify target organization exists and user is admin there
    const { data: targetOrg, error: targetOrgError } = await supabase
      .from("organizations")
      .select("id")
      .eq("id", newOrganizationId)
      .single();

    if (targetOrgError || !targetOrg) {
      return NextResponse.json(
        { error: "Target organization not found" },
        { status: 404 }
      );
    }

    const { data: targetUserOrg, error: targetUserOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", newOrganizationId)
      .single();

    if (
      targetUserOrgError ||
      !targetUserOrg ||
      targetUserOrg.role !== "admin"
    ) {
      return NextResponse.json(
        {
          error:
            "Access denied. You must be an admin in the target organization.",
        },
        { status: 403 }
      );
    }

    // Update the RFP's organization
    const { data: updatedRfp, error: updateError } = await supabase
      .from("rfps")
      .update({ organization_id: newOrganizationId, updated_at: new Date() })
      .eq("id", rfpId)
      .select(
        "id, title, description, organization_id, created_by, created_at, updated_at"
      )
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: `Failed to update RFP organization: ${updateError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "RFP organization updated successfully",
        rfp: updatedRfp,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("RFP organization update error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
