import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";
import {
  getRequirements,
  getRequirementsWithTags,
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
 *   - includeTags: Optional boolean to include tag names for each requirement (default: false)
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
 *     tags: ["Fonctionnel", "Technique"],  // Only if includeTags=true
 *     children: [
 *       {
 *         id: "req-2",
 *         requirement_id_external: "CAT-1.1",
 *         title: "Category 1.1",
 *         level: 2,
 *         parent_id: "req-1",
 *         tags: ["Backend"],  // Only if includeTags=true
 *         children: [...]
 *       }
 *     ]
 *   }
 * ]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
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
    const accessCheckResponse = await verifyRFPAccess(rfpId, user.id);
    if (accessCheckResponse) {
      return accessCheckResponse;
    }

    // Fetch requirements
    const search = searchParams.get("search");
    const flatten = searchParams.get("flatten") === "true";
    const includeTags = searchParams.get("includeTags") === "true";

    let requirements;
    if (search) {
      requirements = await searchRequirements(rfpId, search);
    } else {
      // Use getRequirementsWithTags if includeTags is requested
      requirements = includeTags
        ? await getRequirementsWithTags(rfpId)
        : await getRequirements(rfpId);
    }

    // Return flat list or hierarchical structure
    const result = flatten ? requirements : buildHierarchy(requirements);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/rfps/[rfpId]/requirements:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
