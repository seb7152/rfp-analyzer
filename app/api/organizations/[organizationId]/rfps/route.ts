import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { organizationId: string } },
) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is part of the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", params.organizationId)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch RFPs for this organization
    const { data: rfps, error: rfpsError } = await supabase
      .from("rfps")
      .select(
        `
        id,
        title,
        description,
        status,
        created_at,
        updated_at,
        created_by,
        organization_id
      `,
      )
      .eq("organization_id", params.organizationId)
      .order("created_at", { ascending: false });

    if (rfpsError) {
      return NextResponse.json(
        { error: `Failed to fetch RFPs: ${rfpsError.message}` },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        rfps: rfps || [],
        total: rfps?.length || 0,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("RFPs list error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
