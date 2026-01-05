import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/rfps/[rfpId]/responses/export
 * Export responses for a specific supplier
 * Query params:
 * - supplierId: UUID (required) - The supplier ID to export responses for
 * - versionId: UUID (optional) - Filter by version
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get("supplierId");
    const versionId = searchParams.get("versionId");

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    if (!supplierId) {
      return NextResponse.json(
        { error: "supplierId is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    const accessCheckResponse = await verifyRFPAccess(rfpId, user.id);
    if (accessCheckResponse) {
      return accessCheckResponse;
    }

    // Build the query for responses
    let query = supabase
      .from("responses")
      .select(
        `
        id,
        requirement_id,
        response_text,
        ai_score,
        ai_comment,
        manual_score,
        manual_comment,
        question,
        status,
        is_checked
      `
      )
      .eq("rfp_id", rfpId)
      .eq("supplier_id", supplierId);

    // Filter by version if provided
    if (versionId) {
      query = query.eq("version_id", versionId);
    }

    const { data: responses, error: responsesError } = await query;

    if (responsesError) {
      console.error("Error fetching responses:", responsesError);
      return NextResponse.json(
        { error: "Failed to fetch responses" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      responses: responses || [],
      count: responses?.length || 0,
    });
  } catch (error) {
    console.error("Error in responses export endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
