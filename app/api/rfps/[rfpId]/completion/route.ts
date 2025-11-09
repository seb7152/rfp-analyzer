import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRFPCompletionPercentage } from "@/lib/supabase/queries";

/**
 * GET /api/rfps/[rfpId]/completion
 *
 * Get the completion percentage for an RFP
 * Returns the percentage of responses marked as checked (is_checked = true)
 *
 * Response:
 *   - 200: { percentage: number (0-100) }
 *   - 400: Invalid RFP ID or missing parameters
 *   - 401: User not authenticated
 *   - 403: User does not have access to this RFP
 *   - 404: RFP not found
 *   - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } },
) {
  try {
    const { rfpId } = params;

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json(
        { error: "Invalid RFP ID" },
        { status: 400 },
      );
    }

    // Check authentication and access
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    // Verify user has access to this RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json(
        { error: "RFP not found" },
        { status: 404 },
      );
    }

    // Check if user is in the organization
    const { data: orgUser } = await supabase
      .from("user_organization")
      .select("id")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (!orgUser) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 },
      );
    }

    // Get completion percentage
    const percentage = await getRFPCompletionPercentage(rfpId);

    return NextResponse.json(
      { percentage },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error getting RFP completion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
