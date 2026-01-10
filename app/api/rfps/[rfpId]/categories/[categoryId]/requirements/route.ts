import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/rfps/[rfpId]/categories/[categoryId]/requirements
 *
 * Fetch all requirements for a specific category with their response statuses
 *
 * Response:
 *   - 200: Array of requirements with status summary
 *   - 400: Invalid RFP ID or category ID
 *   - 401: User not authenticated
 *   - 403: User does not have access to this RFP
 *   - 404: RFP or category not found
 *   - 500: Server error
 *
 * Example Response:
 * [
 *   {
 *     id: "req-1",
 *     requirement_id_external: "REQ-1.1.1",
 *     title: "Requirement Title",
 *     status: "pass" | "partial" | "fail" | "pending" | "roadmap"
 *   }
 * ]
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ rfpId: string; categoryId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId, categoryId } = params;

    // Validate parameters
    if (!rfpId || rfpId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    if (!categoryId || categoryId.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid category ID" },
        { status: 400 }
      );
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
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .maybeSingle();

    if (rfpError) {
      console.error("Error fetching RFP:", rfpError);
      return NextResponse.json(
        { error: "Failed to fetch RFP" },
        { status: 500 }
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
        { status: 500 }
      );
    }

    if (!userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Verify category exists and belongs to this RFP
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", categoryId)
      .eq("rfp_id", rfpId)
      .maybeSingle();

    if (categoryError) {
      console.error("Error fetching category:", categoryError);
      return NextResponse.json(
        { error: "Failed to fetch category" },
        { status: 500 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Get all descendant categories (if current category is a parent)
    const { data: allCategories, error: allCategoriesError } = await supabase
      .from("categories")
      .select("id, parent_id")
      .eq("rfp_id", rfpId);

    if (allCategoriesError) {
      console.error("Error fetching all categories:", allCategoriesError);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 }
      );
    }

    // Build a map to find all descendants
    const getDescendantIds = (parentId: string): string[] => {
      const descendants: string[] = [parentId];
      const findChildren = (id: string) => {
        (allCategories || []).forEach((cat: any) => {
          if (cat.parent_id === id) {
            descendants.push(cat.id);
            findChildren(cat.id);
          }
        });
      };
      findChildren(parentId);
      return descendants;
    };

    const descendantCategoryIds = getDescendantIds(categoryId);

    // Fetch requirements for this category and all descendants with their status
    const { data: requirements, error: requirementsError } = await supabase
      .from("requirements")
      .select(
        `
        id,
        requirement_id_external,
        title,
        description,
        category_id,
        responses (
          status,
          is_checked
        )
      `
      )
      .eq("rfp_id", rfpId)
      .in("category_id", descendantCategoryIds)
      .order("requirement_id_external");

    if (requirementsError) {
      console.error("Error fetching requirements:", requirementsError);
      return NextResponse.json(
        { error: "Failed to fetch requirements" },
        { status: 500 }
      );
    }

    // Calculate treatment status for each requirement (based on is_checked)
    const requirementsWithStatus = requirements.map((req: any) => {
      const responses = req.responses || [];

      // If no responses, status is pending
      if (responses.length === 0) {
        return {
          id: req.id,
          requirement_id_external: req.requirement_id_external,
          title: req.title,
          description: req.description,
          status: "pending" as const,
        };
      }

      // Check how many responses are checked
      const checkedCount = responses.filter((r: any) => r.is_checked).length;
      const totalCount = responses.length;

      if (checkedCount === 0) {
        // No responses checked
        return {
          id: req.id,
          requirement_id_external: req.requirement_id_external,
          title: req.title,
          description: req.description,
          status: "pending" as const,
        };
      } else if (checkedCount === totalCount) {
        // All responses checked
        return {
          id: req.id,
          requirement_id_external: req.requirement_id_external,
          title: req.title,
          description: req.description,
          status: "pass" as const,
        };
      } else {
        // Some responses checked, some not
        return {
          id: req.id,
          requirement_id_external: req.requirement_id_external,
          title: req.title,
          description: req.description,
          status: "partial" as const,
        };
      }
    });

    return NextResponse.json(requirementsWithStatus, { status: 200 });
  } catch (error) {
    console.error(
      "Error in GET /api/rfps/[rfpId]/categories/[categoryId]/requirements:",
      error
    );
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
