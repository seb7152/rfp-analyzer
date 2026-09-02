import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { checkRFPAccess } from "@/lib/permissions/rfp-access";

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

    // Access check, RFP row and response count are independent reads.
    // Callers that only need the RFP header used to hit the (much heavier)
    // /dashboard endpoint for it, so this route returns the access level and
    // the response count alongside the row.
    const [access, rfpResult, responsesCountResult] = await Promise.all([
      checkRFPAccess(rfpId, user.id),
      supabase.from("rfps").select("*").eq("id", rfpId).maybeSingle(),
      supabase
        .from("responses")
        .select("id", { count: "exact", head: true })
        .eq("rfp_id", rfpId),
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

    return NextResponse.json(
      {
        ...rfp,
        userAccessLevel: access.accessLevel || "viewer",
        responsesCount: responsesCountResult.count ?? 0,
      },
      { status: 200 }
    );
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

    // Determine which operation to perform based on request body
    if ("peer_review_enabled" in requestBody) {
      // Peer review toggle — requires owner or admin access
      const { checkRFPAccess } = await import("@/lib/permissions/rfp-access");
      const { hasAccess, accessLevel } = await checkRFPAccess(rfpId, user.id);

      if (!hasAccess) {
        return NextResponse.json({ error: "RFP not found" }, { status: 404 });
      }

      if (accessLevel !== "owner" && accessLevel !== "admin") {
        return NextResponse.json(
          {
            error:
              "Access denied. Only owners and admins can toggle peer review.",
          },
          { status: 403 }
        );
      }

      const { data: updatedRfp, error: updateError } = await supabase
        .from("rfps")
        .update({
          peer_review_enabled: requestBody.peer_review_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rfpId)
        .select(
          "id, title, description, organization_id, created_by, created_at, updated_at, peer_review_enabled"
        )
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to update RFP: ${updateError.message}` },
          { status: 400 }
        );
      }

      return NextResponse.json({ rfp: updatedRfp }, { status: 200 });
    }

    // Status update — requires owner or admin access
    if ("status" in requestBody) {
      const validStatuses = ["in_progress", "completed", "archived"];
      if (!validStatuses.includes(requestBody.status)) {
        return NextResponse.json(
          { error: "Invalid status value" },
          { status: 400 }
        );
      }

      const { checkRFPAccess } = await import("@/lib/permissions/rfp-access");
      const { hasAccess, accessLevel } = await checkRFPAccess(rfpId, user.id);

      if (!hasAccess) {
        return NextResponse.json({ error: "RFP not found" }, { status: 404 });
      }

      if (accessLevel !== "owner" && accessLevel !== "admin") {
        return NextResponse.json(
          {
            error:
              "Access denied. Only owners and admins can change the status.",
          },
          { status: 403 }
        );
      }

      const { data: updatedRfp, error: updateError } = await supabase
        .from("rfps")
        .update({
          status: requestBody.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", rfpId)
        .select(
          "id, title, description, status, organization_id, created_by, created_at, updated_at"
        )
        .single();

      if (updateError) {
        return NextResponse.json(
          { error: `Failed to update RFP status: ${updateError.message}` },
          { status: 400 }
        );
      }

      return NextResponse.json({ rfp: updatedRfp }, { status: 200 });
    }

    // Legacy: organization transfer — requires admin in both orgs
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
