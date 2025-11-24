import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ organizationId: string; userId: string }>;

export async function PATCH(request: Request, { params }: { params: Params }) {
  try {
    const { organizationId, userId } = await params;
    const { role } = await request.json();

    if (!role || !["admin", "evaluator", "viewer"].includes(role)) {
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

    // Verify current user is admin in this organization
    const { data: membership, error: memberError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (memberError || !membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can update member roles" },
        { status: 403 }
      );
    }

    // Prevent removing own admin role
    if (userId === user.id && role !== "admin") {
      return NextResponse.json(
        { error: "You cannot remove your own admin role" },
        { status: 400 }
      );
    }

    // Update member role
    const { data: updatedMembership, error: updateError } = await supabase
      .from("user_organizations")
      .update({ role })
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update member role", message: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Member role updated",
      membership: updatedMembership,
    });
  } catch (error: any) {
    console.error("Update member role error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Params }
) {
  try {
    const { organizationId, userId } = await params;

    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify current user is admin in this organization
    const { data: membership, error: memberError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId)
      .single();

    if (memberError || !membership || membership.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can remove members" },
        { status: 403 }
      );
    }

    // Prevent removing own membership
    if (userId === user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization" },
        { status: 400 }
      );
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from("user_organizations")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", organizationId);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to remove member", message: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Member removed from organization",
    });
  } catch (error: any) {
    console.error("Remove member error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}
