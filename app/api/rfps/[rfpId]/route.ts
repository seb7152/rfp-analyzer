import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

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

    // Verify user is part of the organization and is admin
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg || userOrg.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Only admins can delete RFPs." },
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
