import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ organizationId: string }>;

export async function GET(_request: Request, { params }: { params: Params }) {
  try {
    const { organizationId } = await params;
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify user belongs to this organization
    const { data: membership, error: memberError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (memberError || !membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get organization details
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", organizationId)
      .single();

    if (orgError || !organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      organization: {
        ...organization,
        userRole: membership.role,
      },
    });
  } catch (error: any) {
    console.error("Get organization error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: Params }) {
  try {
    const { organizationId } = await params;
    const { name, settings } = await request.json();

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify user is admin in this organization
    const { data: membership, error: memberError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (memberError || !membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can update organization" },
        { status: 403 }
      );
    }

    // Update organization
    const { data: organization, error: updateError } = await supabase
      .from("organizations")
      .update({
        ...(name && { name }),
        ...(settings && { settings }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", organizationId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          error: "Failed to update organization",
          message: updateError.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      organization,
    });
  } catch (error: any) {
    console.error("Update organization error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
