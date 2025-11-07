import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getRequirement, getRequirementBreadcrumb } from "@/lib/supabase/queries"

/**
 * GET /api/requirements/[requirementId]
 *
 * Fetch a specific requirement with its full details and breadcrumb path
 *
 * Query Parameters:
 *   - includeBreadcrumb: Optional boolean (default true) to include parent path
 *
 * Response:
 *   - 200: Requirement object with optional breadcrumb array
 *   - 400: Invalid requirement ID
 *   - 401: User not authenticated
 *   - 403: User does not have access to this requirement's RFP
 *   - 404: Requirement not found
 *   - 500: Server error
 *
 * Example Response:
 * {
 *   id: "req-4",
 *   requirement_id_external: "REQ-001",
 *   title: "Requirement 1",
 *   description: "Detailed description...",
 *   context: "Background context...",
 *   level: 4,
 *   weight: 0.75,
 *   parent_id: "req-3",
 *   rfp_id: "rfp-1",
 *   ...,
 *   breadcrumb: [
 *     { id: "req-1", title: "Domain 1", level: 1, ... },
 *     { id: "req-2", title: "Category 1.1", level: 2, ... },
 *     { id: "req-3", title: "Subcategory 1.1.1", level: 3, ... },
 *     { id: "req-4", title: "Requirement 1", level: 4, ... }
 *   ]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { requirementId: string } }
) {
  try {
    const { requirementId } = params
    const { searchParams } = request.nextUrl

    // Validate requirement ID
    if (!requirementId || requirementId.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid requirement ID" },
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

    // Fetch the requirement
    const requirement = await getRequirement(requirementId)

    if (!requirement) {
      return NextResponse.json(
        { error: "Requirement not found" },
        { status: 404 }
      )
    }

    // Verify user has access to this requirement's RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", requirement.rfp_id)
      .maybeSingle()

    if (rfpError) {
      console.error("Error fetching RFP:", rfpError)
      return NextResponse.json(
        { error: "Failed to verify access" },
        { status: 500 }
      )
    }

    if (!rfp) {
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

    if (userOrgError) {
      console.error("Error checking user organization:", userOrgError)
      return NextResponse.json(
        { error: "Failed to verify access" },
        { status: 500 }
      )
    }

    if (!userOrg) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Fetch breadcrumb if requested (default true)
    const includeBreadcrumb = searchParams.get("includeBreadcrumb") !== "false"
    const breadcrumb = includeBreadcrumb
      ? await getRequirementBreadcrumb(requirementId)
      : undefined

    // Return requirement with optional breadcrumb
    const response = {
      ...requirement,
      ...(breadcrumb && { breadcrumb }),
    }

    return NextResponse.json(response, { status: 200 })
  } catch (error) {
    console.error("Error in GET /api/requirements/[requirementId]:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
