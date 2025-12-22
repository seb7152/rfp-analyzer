import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const versionId = request.nextUrl.searchParams.get("versionId");

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

    // Fetch suppliers for this RFP, filtered by version if provided
    let suppliers, suppliersError;

    if (versionId) {
      // Filter suppliers by version (only active ones, not removed)
      const result = await supabase
        .from("suppliers")
        .select(
          `
          id,
          name,
          version_supplier_status!inner (
            is_active,
            shortlist_status
          )
        `
        )
        .eq("rfp_id", rfpId)
        .eq("version_supplier_status.version_id", versionId)
        .eq("version_supplier_status.is_active", true)
        .neq("version_supplier_status.shortlist_status", "removed")
        .order("name", { ascending: true });

      suppliers = result.data;
      suppliersError = result.error;
    } else {
      // Fetch all suppliers if no versionId provided
      const result = await supabase
        .from("suppliers")
        .select("id, name")
        .eq("rfp_id", rfpId)
        .order("name", { ascending: true });

      suppliers = result.data;
      suppliersError = result.error;
    }

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
