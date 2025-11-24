import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { importSuppliers } from "@/lib/supabase/queries";

/**
 * POST /api/rfps/[rfpId]/suppliers/import
 * Import suppliers for an RFP
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

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
    const { suppliers } = body;

    if (!Array.isArray(suppliers)) {
      return NextResponse.json(
        { error: "Invalid request: suppliers must be an array" },
        { status: 400 }
      );
    }

    // Import suppliers
    const result = await importSuppliers(rfpId, suppliers);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to import suppliers" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: result.count,
      total: suppliers.length,
      message: `Successfully imported ${result.count} out of ${suppliers.length} suppliers`,
    });
  } catch (error) {
    console.error("Error importing suppliers:", error);
    return NextResponse.json(
      { error: "Failed to import suppliers" },
      { status: 500 }
    );
  }
}
