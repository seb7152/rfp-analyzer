import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";
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
 *   - 404: RFP not found (or no access)
 *   - 500: Server error
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("versionId");

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    // Use server client with RLS - will automatically check user access
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

    // Get completion percentage
    const percentage = await getRFPCompletionPercentage(
      rfpId,
      versionId || undefined
    );

    return NextResponse.json({ percentage }, { status: 200 });
  } catch (error) {
    console.error("Error getting RFP completion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
