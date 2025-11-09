import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getResponsesForRFP } from "@/lib/supabase/queries";

/**
 * GET /api/rfps/[rfpId]/responses
 * Fetch all responses for an RFP, optionally filtered by requirement
 * 
 * Query Parameters:
 * - requirementId (optional): Filter responses to a specific requirement
 * 
 * Returns: Array of responses with supplier information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } },
) {
  try {
    const { rfpId } = params;
    const { searchParams } = new URL(request.url);
    const requirementId = searchParams.get("requirementId") || undefined;

    // Verify RFP exists and user has access
    const supabase = await createServerClient();
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
      .select("id")
      .eq("id", rfpId)
      .maybeSingle();

    if (rfpError || !rfp) {
      return NextResponse.json(
        { error: "RFP not found" },
        { status: 404 },
      );
    }

    // Fetch responses with supplier information
    const responses = await getResponsesForRFP(rfpId, requirementId);

    return NextResponse.json({
      responses,
      meta: {
        total: responses.length,
        byStatus: {
          pending: responses.filter((r) => r.status === "pending").length,
          pass: responses.filter((r) => r.status === "pass").length,
          partial: responses.filter((r) => r.status === "partial").length,
          fail: responses.filter((r) => r.status === "fail").length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching responses:", error);
    return NextResponse.json(
      { error: "Failed to fetch responses" },
      { status: 500 },
    );
  }
}
