import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * GET /api/rfps/[rfpId]/categories/exists
 *
 * Check if categories already exist for this RFP
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params

    // Validate RFP ID
    if (!rfpId || rfpId.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid RFP ID" },
        { status: 400 }
      )
    }

    // Get authenticated user
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Verify user has access to this RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .maybeSingle()

    if (rfpError || !rfp) {
      return NextResponse.json(
        { error: "RFP not found" },
        { status: 404 }
      )
    }

    // Check if user is member of the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle()

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Check if categories exist for this RFP
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id")
      .eq("rfp_id", rfpId)
      .limit(1)

    if (catError) {
      console.error("Error checking categories:", catError)
      return NextResponse.json(
        { error: "Failed to check categories" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        exists: (categories?.length ?? 0) > 0,
        count: categories?.length ?? 0,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error in GET /api/rfps/[rfpId]/categories/exists:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
