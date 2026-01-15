import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
    request: NextRequest,
    { params }: { params: { rfpId: string } }
) {
    try {
        const supabase = await createClient();
        const { rfpId } = params;
        const searchParams = request.nextUrl.searchParams;
        const mode = searchParams.get("mode") || "comparison";
        const supplierId = searchParams.get("supplierId");

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Step 1: Identify which versions we need to fetch values for
        let versionIds: string[] = [];

        if (mode === "supplier" && supplierId) {
            // Validating supplier belongs to RFP (via RLS mostly, but explicit check doesn't hurt)
            const { data: versions, error: versionError } = await supabase
                .from("financial_offer_versions")
                .select("id")
                .eq("supplier_id", supplierId);

            if (versionError) {
                throw versionError;
            }

            versionIds = versions?.map((v) => v.id) || [];
        } else {
            // Comparison mode or default: fetch all versions for this RFP
            // This might be heavy if there are many versions, but usually manageable.
            // Optimization: accept a list of versionIds in query if client knows what they want.

            const { data: versions, error: versionError } = await supabase
                .from("financial_offer_versions")
                .select("id, supplier:suppliers!inner(rfp_id)")
                .eq("supplier.rfp_id", rfpId);

            if (versionError) {
                throw versionError;
            }

            versionIds = versions?.map((v) => v.id) || [];
        }

        if (versionIds.length === 0) {
            return NextResponse.json([]);
        }

        // Step 2: Fetch values for these versions
        const { data: values, error: valuesError } = await supabase
            .from("financial_offer_values")
            .select("*")
            .in("version_id", versionIds);

        if (valuesError) {
            console.error("Error fetching financial values:", valuesError);
            return NextResponse.json({ error: valuesError.message }, { status: 500 });
        }

        return NextResponse.json(values);
    } catch (error) {
        console.error("Error in GET /api/rfps/[rfpId]/financial-values:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
