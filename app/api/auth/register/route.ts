import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * POST /api/auth/register
 * Links user to existing organization using organization code
 * Does NOT create a new organization - users must have the code from their organization
 */
export async function POST(request: Request) {
  try {
    const { userId, email, fullName, organizationCode } = await request.json()

    // Validate required fields
    if (!userId || !email || !fullName || !organizationCode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate organization code format (10 digits)
    if (!/^\d{10}$/.test(organizationCode)) {
      return NextResponse.json(
        { error: "Invalid organization code", message: "Code must be exactly 10 digits" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

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

    // 2. Find organization by code
    const { data: organization, error: orgLookupError } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("organization_code", organizationCode)
      .single()

    if (orgLookupError) {
      console.error("Organization lookup error:", orgLookupError)
      return NextResponse.json(
        { error: "Organization not found", message: `No organization found with code ${organizationCode}` },
        { status: 404 }
      )
    }

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found", message: `No organization found with code ${organizationCode}` },
        { status: 404 }
      )
    }

    // 3. Link user to organization with member role (not admin)
    const { error: linkError } = await supabase
      .from("user_organizations")
      .insert({
        user_id: userId,
        organization_id: organization.id,
        role: "member", // New users join as members, not admins
      })

    if (linkError) {
      console.error("User-organization link error:", linkError)
      return NextResponse.json(
        {
          error: "Failed to join organization",
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
