import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * PATCH /api/rfps/[rfpId]/responses/[responseId]
 * Update a specific response (manual_comment, question, etc.)
 *
 * Body: Partial response object with fields to update
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string; responseId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId, responseId } = params;
    const body = await request.json();

    // Verify user is authenticated
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify RFP exists and user has access
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id")
      .eq("id", rfpId)
      .maybeSingle();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify response exists and belongs to this RFP
    const { data: response, error: responseError } = await supabase
      .from("responses")
      .select("id, rfp_id")
      .eq("id", responseId)
      .eq("rfp_id", rfpId)
      .maybeSingle();

    if (responseError || !response) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      );
    }

    // Update the response
    const { data: updatedResponse, error: updateError } = await supabase
      .from("responses")
      .update(body)
      .eq("id", responseId)
      .select()
      .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json(updatedResponse);
  } catch (error) {
    console.error("Error updating response:", error);
    return NextResponse.json(
      { error: "Failed to update response" },
      { status: 500 }
    );
  }
}
