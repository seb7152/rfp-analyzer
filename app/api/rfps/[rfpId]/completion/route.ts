import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
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
  { params }: { params: { rfpId: string } },
) {
  try {
    const { rfpId } = params;

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    // Use server client with RLS - will automatically check user access
    const supabase = await createServerClient();

    // Try to fetch the RFP - RLS will prevent access if user doesn't have permission
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json(
        { error: "RFP not found or access denied" },
        { status: 404 },
      );
    }

    // Get completion percentage
    const percentage = await getRFPCompletionPercentage(rfpId);

    return NextResponse.json({ percentage }, { status: 200 });
  } catch (error) {
    console.error("Error getting RFP completion:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
