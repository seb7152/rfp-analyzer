import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface TreeNode {
  id: string;
  type: "category" | "requirement";
  code: string;
  title: string;
  level: number;
  is_mandatory?: boolean;
  is_optional?: boolean;
  children?: TreeNode[];
}

/**
 * GET /api/rfps/[rfpId]/tree
 *
 * Fetch categories and requirements in a combined hierarchical tree structure
 * Categories are displayed with requirements as children
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string } },
) {
  try {
    const { rfpId } = params;

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

    // Fetch categories
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, code, title, parent_id, level, display_order")
      .eq("rfp_id", rfpId)
      .order("display_order", { ascending: true });

    if (catError) {
      console.error("Error fetching categories:", catError);
      return NextResponse.json(
        { error: "Failed to fetch categories" },
        { status: 500 },
      );
    }

    // Fetch requirements
    const { data: requirements, error: reqError } = await supabase
      .from("requirements")
      .select(
        "id, requirement_id_external, title, category_id, level, display_order, is_mandatory, is_optional",
      )
      .eq("rfp_id", rfpId)
      .order("display_order", { ascending: true });

    if (reqError) {
      console.error("Error fetching requirements:", reqError);
      return NextResponse.json(
        { error: "Failed to fetch requirements" },
        { status: 500 },
      );
    }

    // Build category map for quick lookup
    const categoryMap = new Map<string, TreeNode>();
    for (const cat of categories || []) {
      categoryMap.set(cat.id, {
        id: cat.id,
        type: "category",
        code: cat.code,
        title: cat.title,
        level: cat.level,
        children: [],
      });
    }

    // Build category hierarchy
    const categoryRoots: TreeNode[] = [];
    for (const cat of categories || []) {
      const node = categoryMap.get(cat.id)!;
      if (cat.parent_id) {
        const parent = categoryMap.get(cat.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
      } else {
        categoryRoots.push(node);
      }
    }

    // Map requirements to categories
    const requirementsByCategory = new Map<string, TreeNode[]>();
    for (const req of requirements || []) {
      const reqNode: TreeNode = {
        id: req.id,
        type: "requirement",
        code: req.requirement_id_external,
        title: req.title,
        level: req.level,
        is_mandatory: req.is_mandatory,
        is_optional: req.is_optional,
      };

      if (req.category_id) {
        if (!requirementsByCategory.has(req.category_id)) {
          requirementsByCategory.set(req.category_id, []);
        }
        requirementsByCategory.get(req.category_id)!.push(reqNode);
      }
    }

    // Add requirements to categories
    function addRequirementsToCategories(nodes: TreeNode[]) {
      for (const node of nodes) {
        if (node.type === "category") {
          const catRequirements = requirementsByCategory.get(node.id) || [];
          node.children = [...(node.children || []), ...catRequirements];

          // Recursively process child categories
          if (node.children) {
            addRequirementsToCategories(
              node.children.filter((c) => c.type === "category"),
            );
          }
        }
      }
    }

    addRequirementsToCategories(categoryRoots);

    return NextResponse.json(categoryRoots, { status: 200 });
  } catch (error) {
    console.error("Error in GET /api/rfps/[rfpId]/tree:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
