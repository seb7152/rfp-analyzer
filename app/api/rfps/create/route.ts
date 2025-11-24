import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { title, description, organizationId } = body;

    if (!title || !organizationId) {
      return NextResponse.json(
        { error: "Missing required fields: title, organizationId" },
        { status: 400 }
      );
    }

    // Verify user is part of the organization and is admin
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (userOrgError || !userOrg || userOrg.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Only admins can create RFPs." },
        { status: 403 }
      );
    }

    // Create the RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .insert([
        {
          organization_id: organizationId,
          title: title.trim(),
          description: description?.trim() || null,
          status: "in_progress",
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (rfpError) {
      return NextResponse.json(
        { error: `Failed to create RFP: ${rfpError.message}` },
        { status: 400 }
      );
    }

    // Note: A database trigger (auto_assign_rfp_creator_trigger) automatically
    // assigns the creator as owner in rfp_user_assignments

    return NextResponse.json(
      {
        success: true,
        message: "RFP created successfully",
        rfp,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("RFP creation error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
