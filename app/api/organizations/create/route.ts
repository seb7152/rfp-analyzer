import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/organizations/create
 * Creates a new organization and generates a 10-digit code
 * Should only be accessible to authenticated users (admins)
 */
export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check if slug already exists
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("slug")
      .eq("slug", slug)
      .maybeSingle();

    let finalSlug = slug;
    if (existingOrg) {
      finalSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`;
    }

    // Generate random 10-digit code
    const code = String(Math.floor(Math.random() * 10000000000)).padStart(
      10,
      "0",
    );

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name,
        slug: finalSlug,
        organization_code: code,
        subscription_tier: "free",
        max_users: 10,
        max_rfps: 5,
      })
      .select()
      .single();

    if (orgError) {
      console.error("Organization creation error:", orgError);
      return NextResponse.json(
        { error: "Failed to create organization", message: orgError.message },
        { status: 500 },
      );
    }

    // Link creator as admin
    const { error: linkError } = await supabase
      .from("user_organizations")
      .insert({
        user_id: authUser.id,
        organization_id: organization.id,
        role: "admin",
      });

    if (linkError) {
      console.error("User-organization link error:", linkError);
      return NextResponse.json(
        {
          error: "Failed to link user to organization",
          message: linkError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        organization_code: organization.organization_code,
      },
    });
  } catch (error: any) {
    console.error("Create organization error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 },
    );
  }
}
