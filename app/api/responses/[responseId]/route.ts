import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";
import { getResponse } from "@/lib/supabase/queries";

/**
 * GET /api/responses/[responseId]
 * Fetch a single response with full details including supplier information
 *
 * Returns: Response object with supplier details
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ responseId: string }> }
) {
  const params = await context.params;
  try {
    const { responseId } = params;

    // Verify user is authenticated
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the RFP associated with this response to verify access
    const { data: responseData, error: responseError } = await supabase
      .from("responses")
      .select("rfp_id")
      .eq("id", responseId)
      .single();

    if (responseError || !responseData) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      );
    }

    // Verify user has access to the RFP
    const accessCheckResponse = await verifyRFPAccess(
      responseData.rfp_id,
      user.id
    );
    if (accessCheckResponse) {
      return accessCheckResponse;
    }

    // Fetch response with supplier information
    const response = await getResponse(responseId);

    if (!response) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      response,
    });
  } catch (error) {
    console.error("Error fetching response:", error);
    return NextResponse.json(
      { error: "Failed to fetch response" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/responses/[responseId]
 * Update a response with manual scoring, status, and comments
 *
 * Body: {
 *   manual_score?: number (0-5),
 *   status?: "pending" | "pass" | "partial" | "fail",
 *   is_checked?: boolean,
 *   manual_comment?: string,
 *   question?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ responseId: string }> }
) {
  const params = await context.params;

  try {
    const { responseId } = params;
    const { searchParams } = new URL(request.url);
    const versionId = searchParams.get("versionId");

    // Verify user is authenticated
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { manual_score, status, is_checked, manual_comment, question } = body;

    // Validate manual_score if provided
    if (manual_score !== undefined && manual_score !== null) {
      if (
        typeof manual_score !== "number" ||
        manual_score < 0 ||
        manual_score > 5
      ) {
        return NextResponse.json(
          { error: "Manual score must be a number between 0 and 5" },
          { status: 400 }
        );
      }
    }

    // Validate status if provided
    if (status !== undefined) {
      const validStatuses = ["pending", "pass", "partial", "fail"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Status must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
    }

    // Get current response to check RFP access
    const currentResponse = await getResponse(responseId);

    if (!currentResponse) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 }
      );
    }

    // Check if user has evaluator or owner access to this RFP
    const { data: assignment, error: assignmentError } = await supabase
      .from("rfp_user_assignments")
      .select("access_level")
      .eq("rfp_id", currentResponse.rfp_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: "Access denied: You must be assigned to this RFP" },
        { status: 403 }
      );
    }

    if (!["owner", "evaluator"].includes(assignment.access_level)) {
      return NextResponse.json(
        { error: "Access denied: You must have evaluator or owner access" },
        { status: 403 }
      );
    }

    // Build update object
    const updateData: Record<string, any> = {
      last_modified_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Add version_id if provided
    if (versionId) {
      updateData.version_id = versionId;
    }

    if (manual_score !== undefined) updateData.manual_score = manual_score;
    if (status !== undefined) updateData.status = status;
    if (is_checked !== undefined) updateData.is_checked = is_checked;
    if (manual_comment !== undefined)
      updateData.manual_comment = manual_comment;
    if (question !== undefined) updateData.question = question;

    // Update response
    const { data: updatedResponse, error: updateError } = await supabase
      .from("responses")
      .update(updateData)
      .eq("id", responseId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating response:", updateError);
      return NextResponse.json(
        { error: `Failed to update response: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      response: updatedResponse,
      message: "Response updated successfully",
    });
  } catch (error) {
    console.error("Error updating response:", error);
    return NextResponse.json(
      { error: "Failed to update response" },
      { status: 500 }
    );
  }
}
