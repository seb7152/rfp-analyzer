import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/rfps/[rfpId]/tags
 *
 * Fetch all tags for an RFP
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
        { error: "Failed to verify RFP" },
        { status: 500 },
      );
    }

    if (!rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Check if user has access to this RFP's organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (userOrgError || !userOrg) {
      return NextResponse.json(
        { error: "Access denied to this RFP" },
        { status: 403 },
      );
    }

    // Fetch tags for this RFP
    const { data: tags, error: tagsError } = await supabase
      .from("tags")
      .select("id, name, color, description, created_at, created_by")
      .eq("rfp_id", rfpId)
      .order("created_at", { ascending: true });

    if (tagsError) {
      console.error("Error fetching tags:", tagsError);
      return NextResponse.json(
        { error: "Failed to fetch tags" },
        { status: 500 },
      );
    }

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/rfps/[rfpId]/tags
 *
 * Create a new tag for an RFP
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } },
) {
  try {
    const { rfpId } = params;
    const { name, color, description } = await request.json();

    // Validate inputs
    if (!rfpId || rfpId.trim().length === 0) {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
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

    // Verify user has access to this RFP and is evaluator/owner
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", rfpId)
      .maybeSingle();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .maybeSingle();

    if (userOrgError || !userOrg || !["admin", "evaluator"].includes(userOrg.role)) {
      return NextResponse.json(
        { error: "Permission denied to create tags" },
        { status: 403 },
      );
    }

    // Create tag
    const { data: tag, error: createError } = await supabase
      .from("tags")
      .insert([
        {
          rfp_id: rfpId,
          name: name.trim(),
          color: color || null,
          description: description || null,
          created_by: user.id,
        },
      ])
      .select()
      .maybeSingle();

    if (createError) {
      console.error("Error creating tag:", createError);
      // Check if it's a unique constraint violation
      if (createError.message.includes("unique")) {
        return NextResponse.json(
          { error: "Tag with this name already exists for this RFP" },
          { status: 409 },
        );
      }
      return NextResponse.json(
        { error: "Failed to create tag" },
        { status: 500 },
      );
    }

    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
