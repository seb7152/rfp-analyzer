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

    console.log("Auth user:", authUser.id);

    // Get user profile
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (userError) {
      console.error("User fetch error:", userError);
      return NextResponse.json(
        { error: "Failed to fetch user profile", message: userError.message },
        { status: 500 },
      );
    }

    if (!user) {
      console.error("User not found:", authUser.id);
      return NextResponse.json(
        { error: "User profile not found - please create one by registering" },
        { status: 404 },
      );
    }

    console.log("User found:", user.id);

    // Get user's organizations
    const { data: userOrgs, error: orgsError } = await supabase
      .from("user_organizations")
      .select("role, organizations(*)")
      .eq("user_id", authUser.id);

    if (orgsError) {
      console.error("Organizations fetch error:", orgsError);
      return NextResponse.json({
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          avatar_url: user.avatar_url,
          created_at: user.created_at,
          organizations: [],
        },
      });
    }

    console.log("Organizations found:", userOrgs?.length || 0);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        organizations: (userOrgs || []).map((uo: any) => ({
          id: uo.organizations?.id,
          name: uo.organizations?.name,
          slug: uo.organizations?.slug,
          role: uo.role,
          subscription_tier: uo.organizations?.subscription_tier,
          max_users: uo.organizations?.max_users,
          max_rfps: uo.organizations?.max_rfps,
          settings: uo.organizations?.settings,
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
