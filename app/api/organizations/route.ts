import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Get user's organizations
    const { data: organizations, error: orgError } = await supabase
      .from("user_organizations")
      .select(`
        role,
        organization:organizations (
          id,
          name,
          slug,
          subscription_tier,
          max_users,
          max_rfps,
          settings,
          created_at
        )
      `)
      .eq("user_id", user.id)

    if (orgError) {
      return NextResponse.json(
        { error: "Failed to fetch organizations", message: orgError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      organizations: organizations.map((uo: any) => ({
        ...uo.organization,
        role: uo.role,
      })),
    })
  } catch (error: any) {
    console.error("Get organizations error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json()

    if (!name) {
      return NextResponse.json(
        { error: "Organization name is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      )
    }

    // Generate slug from organization name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    // Check if slug exists, add random suffix if needed
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("slug")
      .eq("slug", slug)
      .single()

    let finalSlug = slug
    if (existingOrg) {
      finalSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`
    }

    // Create organization
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name,
        slug: finalSlug,
        subscription_tier: "free",
        max_users: 10,
        max_rfps: 5,
      })
      .select()
      .single()

    if (orgError) {
      return NextResponse.json(
        { error: "Failed to create organization", message: orgError.message },
        { status: 500 }
      )
    }

    // Link user to organization as admin
    const { error: linkError } = await supabase
      .from("user_organizations")
      .insert({
        user_id: user.id,
        organization_id: organization.id,
        role: "admin",
      })

    if (linkError) {
      return NextResponse.json(
        { error: "Failed to link user to organization", message: linkError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        subscription_tier: organization.subscription_tier,
        max_users: organization.max_users,
        max_rfps: organization.max_rfps,
        role: "admin",
      },
    })
  } catch (error: any) {
    console.error("Create organization error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}
