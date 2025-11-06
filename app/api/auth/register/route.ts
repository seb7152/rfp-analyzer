import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/auth/register
 * Creates user profile, organization, and links them together
 */
export async function POST(request: Request) {
  try {
    const { userId, email, fullName, organizationName } = await request.json()

    // Validate required fields
    if (!userId || !email || !fullName || !organizationName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Generate organization slug from name
    const slug = organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

    // Check if slug already exists
    const { data: existingOrg } = await supabase
      .from("organizations")
      .select("slug")
      .eq("slug", slug)
      .single()

    let finalSlug = slug
    if (existingOrg) {
      // Add random suffix if slug exists
      finalSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`
    }

    // 1. Create user profile
    const { error: userError } = await supabase.from("users").insert({
      id: userId,
      email,
      full_name: fullName,
    })

    if (userError) {
      console.error("User creation error:", userError)
      return NextResponse.json(
        { error: "Failed to create user profile", message: userError.message },
        { status: 500 }
      )
    }

    // 2. Create organization
    const { data: organization, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: organizationName,
        slug: finalSlug,
        subscription_tier: "free",
        max_users: 10,
        max_rfps: 5,
      })
      .select()
      .single()

    if (orgError) {
      console.error("Organization creation error:", orgError)
      return NextResponse.json(
        { error: "Failed to create organization", message: orgError.message },
        { status: 500 }
      )
    }

    // 3. Link user to organization as admin
    const { error: linkError } = await supabase
      .from("user_organizations")
      .insert({
        user_id: userId,
        organization_id: organization.id,
        role: "admin",
      })

    if (linkError) {
      console.error("User-organization link error:", linkError)
      return NextResponse.json(
        {
          error: "Failed to link user to organization",
          message: linkError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: { id: userId, email, full_name: fullName },
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
    })
  } catch (error: any) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    )
  }
}
