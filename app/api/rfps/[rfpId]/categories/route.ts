import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get categories for this RFP
    const { data: categories, error } = await supabase
      .from("categories")
      .select("id, code, title, short_name, level")
      .eq("rfp_id", params.rfpId)
      .order("level", { ascending: true })
      .order("code", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    return NextResponse.json({ categories: categories || [] });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, title, short_name, level, parent_id } = body;

    if (!code || !title) {
      return NextResponse.json(
        { error: "Missing required fields: code, title" },
        { status: 400 }
      );
    }

    // Create the category
    const { data: category, error } = await supabase
      .from("categories")
      .insert({
        rfp_id: params.rfpId,
        code,
        title,
        short_name: short_name || code,
        level: level || 1,
        parent_id: parent_id || null,
        created_by: user.id,
      })
      .select("id, code, title, short_name, level")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to create category", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
