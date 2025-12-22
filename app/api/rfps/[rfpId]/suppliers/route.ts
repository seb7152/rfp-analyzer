import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch suppliers for this RFP
    const { data: suppliers, error: suppliersError } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("rfp_id", rfpId)
      .order("name", { ascending: true });

    if (suppliersError) {
      console.error("Error fetching suppliers:", suppliersError);
      return NextResponse.json(
        { error: "Failed to fetch suppliers" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      suppliers: suppliers || [],
      count: suppliers?.length || 0,
    });
  } catch (error) {
    console.error("Error in suppliers endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
