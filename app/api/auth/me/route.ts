import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

    if (authError || !authUser) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Get user profile with organizations
    const { data: user, error: userError } = await supabase
      .from("users")
      .select(`
        *,
        user_organizations (
          role,
          organization:organizations (
            id,
            name,
            slug,
            subscription_tier,
            max_users,
            max_rfps,
            settings
          )
        )
      `)
      .eq("id", authUser.id)
      .single()

    if (userError) {
      return NextResponse.json(
        { error: "Failed to fetch user profile", message: userError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        avatar_url: user.avatar_url,
        created_at: user.created_at,
        organizations: user.user_organizations.map((uo: any) => ({
          id: uo.organization.id,
          name: uo.organization.name,
          slug: uo.organization.slug,
          role: uo.role,
          subscription_tier: uo.organization.subscription_tier,
          max_users: uo.organization.max_users,
          max_rfps: uo.organization.max_rfps,
          settings: uo.organization.settings,
        })),
      },
    })
  } catch (error: any) {
    console.error("Get user error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}
