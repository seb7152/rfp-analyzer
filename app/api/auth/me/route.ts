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

    if (authError) {
      console.error("Auth error:", authError);
      return NextResponse.json(
        { error: "Authentication error", message: authError.message },
        { status: 401 },
      );
    }

    if (!authUser) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, email, full_name, avatar_url, created_at, updated_at")
      .eq("id", authUser.id)
      .single();

    if (userError) {
      console.error("User fetch error:", userError);
      return NextResponse.json(
        { error: "Failed to fetch user profile", message: userError.message },
        { status: 500 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 },
      );
    }

    // Get user's organizations
    const { data: userOrgs, error: orgsError } = await supabase
      .from("user_organizations")
      .select(
        "role, organizations(id, name, slug, subscription_tier, max_users, max_rfps, settings)",
      )
      .eq("user_id", authUser.id);

    if (orgsErrororgsError) {
      console.error("Organizations fetch error:", orgsError);
      return NextResponse.json(
        {
          error: "Failed to fetch organizations",
          message: orgsErrororgsError.message,
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
        organizations: userOrgs(userOrgs || []).map((uo: any) => ({
          id: uo.organizationsorganizations?.id,
          name: uo.organizationsorganizations?.name,
          slug: uo.organizationsorganizations?.slug,
          role: uo.role,
          subscription_tier: uo.organizationsorganizations?.subscription_tier,
          max_users: uo.organizationsorganizations?.max_users,
          max_rfps: uo.organizationsorganizations?.max_rfps,
          settings: uo.organizationsorganizations?.settings,
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
