import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { importCategories } from "@/lib/supabase/queries";
import { validateCategoriesJSON } from "@/lib/supabase/validators";
import type { ImportCategoriesRequest } from "@/lib/supabase/types";

export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } },
) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await request.json();

    // Validate JSON format
    if (typeof body.json !== "string") {
      return NextResponse.json(
        { error: "Missing 'json' field in request body" },
        { status: 400 },
      );
    }

    const validation = validateCategoriesJSON(body.json);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Normalize data (validator returns { categories: [...] })
    const data = validation.data as ImportCategoriesRequest;

    // Check user has access to RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", params.rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify user is part of the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Import categories
    const result = await importCategories(
      params.rfpId,
      data.categories,
      user.id,
    );

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          count: result.count,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported ${result.count} categories`,
        count: result.count,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Category import error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
