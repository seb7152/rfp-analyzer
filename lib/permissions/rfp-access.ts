import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Check if a user has access to a specific RFP
 * Returns { hasAccess: boolean, accessLevel?: string, error?: string }
 */
export async function checkRFPAccess(
  rfpId: string,
  userId: string
): Promise<{
  hasAccess: boolean;
  accessLevel?: "owner" | "evaluator" | "viewer" | "admin";
  error?: string;
}> {
  try {
    const supabase = await createServerClient();

    // Get the RFP to check its organization
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return { hasAccess: false, error: "RFP not found" };
    }

    // Check if user is in the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", userId)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return {
        hasAccess: false,
        error: "User not in RFP organization",
      };
    }

    // If user is admin, they have access with "admin" level
    if (userOrg.role === "admin") {
      return { hasAccess: true, accessLevel: "admin" };
    }

    // Check if user has explicit RFP assignment
    const { data: assignment, error: assignmentError } = await supabase
      .from("rfp_user_assignments")
      .select("access_level")
      .eq("rfp_id", rfpId)
      .eq("user_id", userId)
      .single();

    if (assignmentError || !assignment) {
      return {
        hasAccess: false,
        error: "User not assigned to this RFP",
      };
    }

    return {
      hasAccess: true,
      accessLevel: assignment.access_level as "owner" | "evaluator" | "viewer",
    };
  } catch (error) {
    return {
      hasAccess: false,
      error: error instanceof Error ? error.message : "Internal server error",
    };
  }
}

/**
 * Middleware to verify RFP access in API routes
 * Returns NextResponse with 401/403/404 if no access, null if access granted
 */
export async function verifyRFPAccess(
  rfpId: string,
  userId: string,
  requiredLevel?: "owner" | "evaluator" | "viewer" | "admin"
): Promise<NextResponse | null> {
  const { hasAccess, accessLevel, error } = await checkRFPAccess(rfpId, userId);

  if (!hasAccess) {
    if (error?.includes("not found")) {
      return NextResponse.json(
        { error: "RFP not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Access denied" },
      { status: 403 }
    );
  }

  // Check if access level meets requirement (if specified)
  if (requiredLevel && requiredLevel !== "admin") {
    const accessLevels: Record<string, number> = {
      owner: 3,
      evaluator: 2,
      viewer: 1,
      admin: 4,
    };

    const userLevel = accessLevels[accessLevel || "viewer"] || 0;
    const requiredAccessLevel = accessLevels[requiredLevel] || 0;

    if (userLevel < requiredAccessLevel) {
      return NextResponse.json(
        { error: "Insufficient permissions for this RFP" },
        { status: 403 }
      );
    }
  }

  // Access granted
  return null;
}
