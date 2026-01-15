import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
    _: NextRequest,
    { params }: { params: { rfpId: string } }
) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { data, error } = await supabase
            .from("financial_grid_preferences")
            .select("*")
            .eq("rfp_id", params.rfpId)
            .eq("user_id", user.id)
            .single();

        if (error && error.code !== "PGRST116") {
            // PGRST116 is "The result contains 0 rows" which is fine (default return)
            console.error("Error fetching preferences:", error);
            return new NextResponse("Internal Server Error", { status: 500 });
        }

        // Default preferences if none found
        const preferences = data || {
            rfp_id: params.rfpId,
            ui_mode: "comparison",
            selected_supplier_id: null,
            displayed_versions: {},
            tco_period_years: 3,
            expanded_lines: [],
            show_comments: false,
        };

        return NextResponse.json(preferences);
    } catch (error) {
        console.error("Error in GET preferences:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { rfpId: string } }
) {
    try {
        const supabase = await createClient();
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await request.json();
        const {
            ui_mode,
            selected_supplier_id,
            displayed_versions,
            tco_period_years,
            expanded_lines,
            show_comments,
        } = body;

        // Validate inputs generally? Or trust schema checks?
        if (tco_period_years && ![1, 3, 5].includes(tco_period_years)) {
            return new NextResponse("Invalid TCO period", { status: 400 });
        }

        const { data, error } = await supabase
            .from("financial_grid_preferences")
            .upsert(
                {
                    rfp_id: params.rfpId,
                    user_id: user.id,
                    ui_mode: ui_mode || "comparison",
                    selected_supplier_id,
                    displayed_versions: displayed_versions || {},
                    tco_period_years: tco_period_years || 3,
                    expanded_lines: expanded_lines || [],
                    show_comments: show_comments || false,
                    updated_at: new Date().toISOString(),
                },
                {
                    onConflict: "rfp_id, user_id",
                }
            )
            .select()
            .single();

        if (error) {
            console.error("Error saving preferences:", error);
            return new NextResponse("Internal Server Error", { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error in PUT preferences:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
