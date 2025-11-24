import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/rfps/[rfpId]/suppliers/[supplierId]/responses
 * Get response completion stats for a supplier
 * Returns: total responses and number of checked responses
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string; supplierId: string } }
) {
  try {
    const { rfpId, supplierId } = params;

    if (!rfpId || !supplierId) {
      return NextResponse.json(
        { error: "RFP ID and Supplier ID are required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all responses for this supplier with checked status
    const { data: responses, error: responsesError } = await supabase
      .from("responses")
      .select("id, is_checked")
      .eq("supplier_id", supplierId)
      .eq("rfp_id", rfpId);

    if (responsesError) {
      throw responsesError;
    }

    const totalResponses = responses?.length || 0;
    const checkedResponses = responses?.filter((r) => r.is_checked).length || 0;
    const completionPercentage =
      totalResponses > 0
        ? Math.round((checkedResponses / totalResponses) * 100)
        : 0;

    return NextResponse.json(
      {
        supplierId,
        totalResponses,
        checkedResponses,
        completionPercentage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching supplier responses stats:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
