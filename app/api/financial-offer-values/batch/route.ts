import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { version_id, values } = body;

    if (!version_id) {
      return NextResponse.json(
        { error: "version_id is required" },
        { status: 400 }
      );
    }

    if (!values || !Array.isArray(values) || values.length === 0) {
      return NextResponse.json(
        { error: "values array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Verify version existence and access (optional, RLS handles it but good for 404)
    // We can skip explicit check if we trust RLS to return error or 0 rows affected if not allowed.
    // However, upsert might throw error if RLS violated.

    const { data: version, error: versionError } = await supabase
      .from("financial_offer_versions")
      .select("id")
      .eq("id", version_id)
      .single();

    if (versionError || !version) {
      return NextResponse.json(
        { error: "Version not found or access denied" },
        { status: 404 }
      );
    }

    // Prepare data for upsert
    const upsertData = values.map((v: any) => ({
      version_id,
      template_line_id: v.template_line_id,
      setup_cost: v.setup_cost,
      recurrent_cost: v.recurrent_cost,
      quantity: v.quantity ?? 1,
    }));

    const { data, error } = await supabase
      .from("financial_offer_values")
      .upsert(upsertData, { onConflict: "version_id, template_line_id" })
      .select();

    if (error) {
      console.error("Error batch upserting financial values:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: data.length });
  } catch (error) {
    console.error("Error in POST /api/financial-offer-values/batch:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
