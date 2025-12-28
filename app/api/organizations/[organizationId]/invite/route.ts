import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const { organizationId } = params;
    const { email, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email and role are required" },
        { status: 400 }
      );
    }

    if (!["admin", "evaluator", "viewer"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

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
        { error: "Only admins can invite users" },
        { status: 403 }
      );
    }

    // Get user by email
    const { data: invitedUser, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: "User not found. Please ask them to register first." },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const { data: existingMembership } = await supabase
      .from("user_organizations")
      .select("id")
      .eq("user_id", invitedUser.id)
      .eq("organization_id", organizationId)
      .single();

    if (existingMembership) {
      return NextResponse.json(
        { error: "User is already a member of this organization" },
        { status: 409 }
      );
    }

    // Add user to organization
    const { data: newMembership, error: addError } = await supabase
      .from("user_organizations")
      .insert({
        user_id: invitedUser.id,
        organization_id: organizationId,
        role,
        invited_by: user.id,
      })
      .select()
      .single();

    if (addError) {
      return NextResponse.json(
        { error: "Failed to invite user", message: addError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User ${email} has been invited as ${role}`,
      membership: newMembership,
    });
  } catch (error: any) {
    console.error("Invite user error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
