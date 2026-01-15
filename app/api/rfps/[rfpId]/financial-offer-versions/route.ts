import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
    request: NextRequest,
    { params }: { params: { rfpId: string } }
) {
    try {
        const supabase = await createClient();
        const { rfpId } = params;

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch versions linked to suppliers of this RFP
        // We filter by supplier.rfp_id using inner join
        const { data, error } = await supabase
            .from("financial_offer_versions")
            .select("*, supplier:suppliers!inner(id, name, rfp_id)")
            .eq("supplier.rfp_id", rfpId)
            .eq("is_active", true)
            .order("version_date", { ascending: false });

        if (error) {
            console.error("Error fetching financial offer versions:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ versions: data });
    } catch (error) {
        console.error("Error in GET /api/rfps/[rfpId]/financial-offer-versions:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { rfpId: string } }
) {
    try {
        const supabase = await createClient();
        const { rfpId } = params;

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { supplier_id, version_name, version_date } = body;

        if (!supplier_id) {
            return NextResponse.json(
                { error: "supplier_id is required" },
                { status: 400 }
            );
        }

        // Verify supplier belongs to RFP and user has access (via RLS on suppliers)
        const { data: supplier, error: supplierError } = await supabase
            .from('suppliers')
            .select('id')
            .eq('id', supplier_id)
            .eq('rfp_id', rfpId)
            .single();

        if (supplierError || !supplier) {
            return NextResponse.json({ error: "Supplier not found or not in this RFP" }, { status: 400 });
        }

        // Generate version name if missing
        let finalVersionName = version_name;
        if (!finalVersionName) {
            // Count existing versions for this supplier
            const { count, error: countError } = await supabase
                .from('financial_offer_versions')
                .select('*', { count: 'exact', head: true })
                .eq('supplier_id', supplier_id);

            if (countError) {
                console.error("Error counting versions:", countError);
            }

            finalVersionName = `Version ${(count || 0) + 1}`;
        }

        const { data: version, error } = await supabase
            .from('financial_offer_versions')
            .insert({
                supplier_id,
                version_name: finalVersionName,
                version_date: version_date || new Date().toISOString(),
                is_active: true
            })
            .select()
            .single();

        if (error) {
            console.error("Error creating financial offer version:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ version }, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/rfps/[rfpId]/financial-offer-versions:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
