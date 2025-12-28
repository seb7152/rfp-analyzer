import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";
import type { GetRFPAssignmentsResponse } from "@/lib/supabase/types";

/**
 * GET /api/rfps/[rfpId]/assignments
 *
 * Get all user assignments for an RFP
 * Returns list of users assigned to the RFP with their access levels
 *
 * Response:
 *   - 200: { assignments: Array<RFPUserAssignment & { user: User }> }
 *   - 400: Invalid RFP ID or missing parameters
 *   - 401: User not authenticated
 *   - 404: RFP not found
 *   - 500: Server error
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
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

    // Get all assignments for this RFP
    const { data: assignments, error: assignmentsError } = await supabase
      .from("rfp_user_assignments")
      .select(
        `
        id,
        rfp_id,
        user_id,
        access_level,
        assigned_at,
        assigned_by
      `
      )
      .eq("rfp_id", rfpId)
      .order("assigned_at", { ascending: false });

    if (assignmentsError) {
      throw assignmentsError;
    }

    // Get user details separately
    const userIds = (assignments || []).map((a: any) => a.user_id);
    let users: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from("users")
        .select("id, email, full_name, avatar_url")
        .in("id", userIds);

      if (usersError) {
        throw usersError;
      }

      users = (usersData || []).reduce(
        (acc: Record<string, any>, user: any) => {
          acc[user.id] = user;
          return acc;
        },
        {}
      );
    }

    // Transform the response to match the expected type
    const transformedAssignments = (assignments || []).map(
      (assignment: any) => ({
        id: assignment.id,
        rfp_id: assignment.rfp_id,
        user_id: assignment.user_id,
        access_level: assignment.access_level,
        assigned_at: assignment.assigned_at,
        assigned_by: assignment.assigned_by,
        user: users[assignment.user_id] || null,
      })
    );

    const response: GetRFPAssignmentsResponse = {
      assignments: transformedAssignments,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error fetching RFP assignments:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/rfps/[rfpId]/assignments
 *
 * Create a new user assignment for an RFP
 * Only the RFP owner or organization admin can create assignments
 *
 * Body:
 *   - user_id: string (user to assign)
 *   - access_level: "owner" | "evaluator" | "viewer"
 *
 * Response:
 *   - 201: { id, rfp_id, user_id, access_level, assigned_at, assigned_by }
 *   - 400: Invalid parameters or user already assigned
 *   - 401: User not authenticated
 *   - 403: Access denied (not RFP owner or org admin)
 *   - 404: RFP or user not found
 *   - 500: Server error
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { user_id, access_level } = body;

    if (!user_id || !access_level) {
      return NextResponse.json(
        { error: "user_id and access_level are required" },
        { status: 400 }
      );
    }

    if (!["owner", "evaluator", "viewer"].includes(access_level)) {
      return NextResponse.json(
        { error: "Invalid access_level" },
        { status: 400 }
      );
    }

    // Verify user has access to this RFP
    const accessCheckResponse = await verifyRFPAccess(rfpId, currentUser.id);
    if (accessCheckResponse) {
      return accessCheckResponse;
    }

    // Verify RFP exists and get organization_id
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id, created_by")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json(
        { error: "RFP not found or access denied" },
        { status: 404 }
      );
    }

    // Check if current user is RFP owner or organization admin
    const { data: userOrg } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", currentUser.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    const isRFPOwner = rfp.created_by === currentUser.id;
    const isOrgAdmin = userOrg?.role === "admin";

    if (!isRFPOwner && !isOrgAdmin) {
      return NextResponse.json(
        {
          error:
            "Access denied. Only RFP owner or organization admin can assign users.",
        },
        { status: 403 }
      );
    }

    // Verify user to assign exists and belongs to the organization
    const { data: userToAssign } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url")
      .eq("id", user_id)
      .single();

    if (!userToAssign) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user belongs to the organization
    const { data: userMembership } = await supabase
      .from("user_organizations")
      .select("id")
      .eq("user_id", user_id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (!userMembership) {
      return NextResponse.json(
        {
          error: "User does not belong to this organization",
        },
        { status: 400 }
      );
    }

    // Check if user is already assigned
    const { data: existingAssignment } = await supabase
      .from("rfp_user_assignments")
      .select("id")
      .eq("rfp_id", rfpId)
      .eq("user_id", user_id)
      .single();

    if (existingAssignment) {
      return NextResponse.json(
        { error: "User is already assigned to this RFP" },
        { status: 400 }
      );
    }

    // Create the assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from("rfp_user_assignments")
      .insert({
        rfp_id: rfpId,
        user_id: user_id,
        access_level: access_level,
        assigned_by: currentUser.id,
      })
      .select()
      .single();

    if (assignmentError) {
      throw assignmentError;
    }

    return NextResponse.json(
      {
        ...assignment,
        user: userToAssign,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating RFP assignment:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
