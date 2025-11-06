import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      return NextResponse.json(
        { error: "Invalid credentials", message: authError.message },
        { status: 401 }
      )
    }

    // Get user profile and organizations
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
            subscription_tier
          )
        )
      `)
      .eq("id", authData.user.id)
      .single()

    if (userError) {
      return NextResponse.json(
        { error: "Failed to fetch user profile", message: userError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        organizations: user.user_organizations.map((uo: any) => ({
          id: uo.organization.id,
          name: uo.organization.name,
          slug: uo.organization.slug,
          role: uo.role,
          subscription_tier: uo.organization.subscription_tier,
        })),
      },
    })
  } catch (error: any) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}
