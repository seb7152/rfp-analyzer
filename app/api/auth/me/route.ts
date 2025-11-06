import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current authenticated user
    const {
      data: { user: authUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(
        `
        id,
        email,
        full_name,
        avatar_url,
        created_at,
        updated_at
      `,
      )
      .eq("id", authUser.id)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: "Failed to fetch user profile", message: userError.message },
        { status: 500 },
      );
    }

    // Get user's organizations separately to avoid relationship conflicts
    const { data: userOrgs, error: orgsError } = await supabase
      .from("user_organizations")
      .select(
        `
        role,
        organizations (
          id,
          name,
          slug,
          subscription_tier,
          max_users,
          max_rfps,
          settings
        )
      `,
      )
      .eq("user_id", authUser.id);

    if (orgsError) {
      return NextResponse.json(
        {
          error: "Failed to fetch user organizations",
          message: orgsError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        organizations: userOrgs.map((uo: any) => ({
          id: uo.organizations.id,
          name: uo.organizations.name,
          slug: uo.organizations.slug,
          role: uo.role,
          subscription_tier: uo.organizations.subscription_tier,
          max_users: uo.organizations.max_users,
          max_rfps: uo.organizations.max_rfps,
          settings: uo.organizations.settings,
        })),
      },
    });
  } catch (error: any) {
    console.error("Get user error:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 },
    );
  }
}
