import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";
import {
    buildLineTree,
    calculateAllSubtotals,
    calculateTotals,
    FinancialOfferValue
} from "@/lib/financial/calculations";

/**
 * GET /api/rfps/[rfpId]/financial-summary
 * Calcule la synthèse financière (TCO, Setup, Récurrent) pour les versions sélectionnées
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { rfpId: string } }
) {
    try {
        const { rfpId } = params;
        const supabase = await createServerClient();

        // Auth & Access
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const accessCheck = await verifyRFPAccess(rfpId, user.id);
        if (accessCheck) return accessCheck;

        // Params
        const { searchParams } = new URL(request.url);
        const versionIdsStr = searchParams.get("versionIds");
        const rawTco = parseInt(searchParams.get("tcoPeriod") || "3", 10);
        const tcoPeriod = isNaN(rawTco) || rawTco <= 0 ? 3 : rawTco;

        if (!versionIdsStr) {
            return NextResponse.json({ summary: [] });
        }

        const versionIds = versionIdsStr.split(",");

        // 1. Fetch Template Lines
        const { data: templateLines, error: linesError } = await supabase
            .from("financial_template_lines")
            .select("*")
            .eq("is_active", true)
            .order("sort_order");

        if (linesError) throw linesError;

        // 2. Fetch Offer Values for all versions
        const { data: allValues, error: valuesError } = await supabase
            .from("financial_offer_values")
            .select("*")
            .in("version_id", versionIds);

        if (valuesError) throw valuesError;

        // 3. Fetch Suppliers & Versions info
        const { data: versions, error: versionsError } = await supabase
            .from("financial_offer_versions")
            .select(`
                id,
                version_name,
                supplier_id,
                suppliers (
                    name,
                    id
                )
            `)
            .in("id", versionIds);

        if (versionsError) throw versionsError;

        // 4. Group calculations by version
        const summary = versions.map(v => {
            const versionValues = allValues.filter(val => val.version_id === v.id);

            // Map plain values to the expected type for calculation
            const typedValues: FinancialOfferValue[] = versionValues.map(val => ({
                id: val.id,
                version_id: val.version_id,
                template_line_id: val.template_line_id,
                setup_cost: val.setup_cost ? Number(val.setup_cost) : null,
                recurrent_cost: val.recurrent_cost ? Number(val.recurrent_cost) : null,
                quantity: Number(val.quantity || 1)
            }));

            const tree = buildLineTree(templateLines, typedValues);
            calculateAllSubtotals(tree);
            const totals = calculateTotals(tree, tcoPeriod);

            const supplier = v.suppliers as any;

            return {
                supplier_id: v.supplier_id,
                supplier_name: supplier?.name || "Inconnu",
                version_id: v.id,
                version_name: v.version_name,
                setup_total: totals.total_setup,
                total_setup: totals.total_setup,
                recurrent_annual_total: totals.total_recurrent_annual,
                total_recurrent_annual: totals.total_recurrent_annual,
                tco: totals.tco
            };
        });

        return NextResponse.json({ summary });

    } catch (error) {
        console.error("[FINANCIAL_SUMMARY_API]", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
