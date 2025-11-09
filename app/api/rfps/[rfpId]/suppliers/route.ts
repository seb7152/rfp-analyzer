import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/rfps/[rfpId]/suppliers
 * Get all suppliers for an RFP
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string }> },
) {
  try {
    const params = await context.params;
    const { rfpId } = params;

    // Verify user is authenticated
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch suppliers for this RFP
    const { data: suppliers, error } = await supabase
      .from("suppliers")
      .select("*")
      .eq("rfp_id", rfpId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching suppliers:", error);
      return NextResponse.json(
        { error: "Failed to fetch suppliers" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      suppliers: suppliers || [],
    });
  } catch (error) {
    console.error("Error in GET /api/rfps/[rfpId]/suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 },
    );
  }
}
