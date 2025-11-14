import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getRequirements,
  buildHierarchy,
  searchRequirements,
} from "@/lib/supabase/queries";

/**
 * GET /api/rfps/[rfpId]/requirements
 *
 * Fetch all requirements for a specific RFP in hierarchical structure
 *
 * Query Parameters:
 *   - search: Optional search query to filter requirements by ID or title
 *   - flatten: Optional boolean to return flat list instead of hierarchy
 *
 * Response:
 *   - 200: Array of requirements with hierarchical structure
 *   - 400: Invalid RFP ID or missing parameters
 *   - 401: User not authenticated
 *   - 403: User does not have access to this RFP
 *   - 404: RFP not found
 *   - 500: Server error
 *
 * Example Response (hierarchical):
 * [
 *   {
 *     id: "req-1",
 *     requirement_id_external: "DOM-1",
 *     title: "Domain 1",
 *     level: 1,
 *     parent_id: null,
 *     children: [
 *       {
 *         id: "req-2",
 *         requirement_id_external: "CAT-1.1",
 *         title: "Category 1.1",
 *         level: 2,
 *         parent_id: "req-1",
 *         children: [...]
 *       }
 *     ]
 *   }
 * ]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } },
) {
  try {
    const { rfpId } = params;
    const { searchParams } = request.nextUrl;

    // Validate RFP ID
    if (!rfpId || rfpId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP
    // Check if user is member of the RFP's organization
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .maybeSingle();

    if (rfpError) {
      console.error("Error fetching RFP:", rfpError);
      return NextResponse.json(
        { error: "Failed to fetch RFP" },
        { status: 500 },
      );
    }

    if (!rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Check if user is member of the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (userOrgError) {
      console.error("Error checking user organization:", userOrgError);
      return NextResponse.json(
        { error: "Failed to verify access" },
        { status: 500 },
      );
    }

    if (!userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Fetch requirements
    const search = searchParams.get("search");
    const flatten = searchParams.get("flatten") === "true";

    let requirements;
    if (search) {
      requirements = await searchRequirements(rfpId, search);
    } else {
      requirements = await getRequirements(rfpId);
    }

    // Return flat list or hierarchical structure
    const result = flatten ? requirements : buildHierarchy(requirements);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/rfps/[rfpId]/requirements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
