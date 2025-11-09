import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { getResponse } from "@/lib/supabase/queries";

/**
 * GET /api/responses/[responseId]
 * Fetch a single response with full details including supplier information
 * 
 * Returns: Response object with supplier details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { responseId: string } },
) {
  try {
    const { responseId } = params;

    // Verify user is authenticated
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

    // Fetch response with supplier information
    const response = await getResponse(responseId);

    if (!response) {
      return NextResponse.json(
        { error: "Response not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      response,
    });
  } catch (error) {
    console.error("Error fetching response:", error);
    return NextResponse.json(
      { error: "Failed to fetch response" },
      { status: 500 },
    );
  }
}
