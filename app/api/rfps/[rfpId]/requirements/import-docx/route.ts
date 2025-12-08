import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { importRequirements } from "@/lib/supabase/queries";

interface ParsedRequirement {
  code: string;
  title?: string;
  content?: string;
  contexts?: string[];
  category_name?: string;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await _request.json();
    const { requirements, options } = body as {
      requirements: ParsedRequirement[];
      options?: {
        importCode?: boolean;
        importTitle?: boolean;
        importContent?: boolean;
        importContexts?: boolean;
      };
    };

    if (!requirements || !Array.isArray(requirements)) {
      return NextResponse.json(
        { error: "Missing or invalid 'requirements' field" },
        { status: 400 }
      );
    }

    // Check user has access to RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", params.rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify user is part of the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create a "DOCX Import" category if it doesn't exist
    // This will hold all imported requirements from DOCX
    const { data: existingCategory } = await supabase
      .from("categories")
      .select("id")
      .eq("rfp_id", params.rfpId)
      .eq("code", "DOCX")
      .single();

    if (!existingCategory) {
      const { data: newCategory, error: categoryError } = await supabase
        .from("categories")
        .insert({
          rfp_id: params.rfpId,
          code: "DOCX",
          title: "DOCX Import",
          short_name: "DOCX",
          level: 1,
          parent_id: null,
        })
        .select()
        .single();

      if (categoryError || !newCategory) {
        return NextResponse.json(
          { error: "Failed to create category" },
          { status: 500 }
        );
      }
    }

    // Transform ParsedRequirement[] into format expected by importRequirements
    const validRequirements = requirements
      .filter((req) => req.code && req.code.trim())
      .map((req, index) => {
        return {
          code: req.code.trim(),
          title: req.title || req.code.trim(),
          description: (req.content || "").trim(),
          context: req.contexts ? req.contexts.join("\n") : undefined,
          weight: 0, // Will be calculated later
          category_name: req.category_name || "DOCX", // Use provided category or fallback to DOCX
          is_mandatory: false,
          is_optional: false,
          order: index,
        };
      });

    if (validRequirements.length === 0) {
      return NextResponse.json(
        { error: "No valid requirements to import" },
        { status: 400 }
      );
    }

    // Import requirements
    const requirementsResult = await importRequirements(
      params.rfpId,
      validRequirements,
      user.id,
      options
    );

    if (!requirementsResult.success) {
      return NextResponse.json(
        {
          error: requirementsResult.error,
          count: requirementsResult.count,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported ${requirementsResult.count} requirements from DOCX`,
        count: requirementsResult.count,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("DOCX requirements import error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
