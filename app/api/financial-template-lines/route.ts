import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/financial-template-lines
 * Ajoute une nouvelle ligne au template financier
 * US-1-006
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      template_id,
      parent_id,
      line_code,
      name,
      line_type,
      recurrence_type,
      custom_formula,
      sort_order,
    } = body;

    // Validate required inputs
    if (!template_id) {
      return NextResponse.json(
        { error: "template_id is required" },
        { status: 400 }
      );
    }

    if (
      !line_code ||
      typeof line_code !== "string" ||
      line_code.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "line_code is required" },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (!line_type || ["setup", "recurrent"].indexOf(line_type) === -1) {
      return NextResponse.json(
        { error: "line_type must be 'setup' or 'recurrent'" },
        { status: 400 }
      );
    }

    // Validate recurrence_type for recurrent lines
    if (line_type === "recurrent") {
      if (
        !recurrence_type ||
        ["monthly", "yearly"].indexOf(recurrence_type) === -1
      ) {
        return NextResponse.json(
          {
            error:
              "recurrence_type must be 'monthly' or 'yearly' for recurrent lines",
          },
          { status: 400 }
        );
      }
    }

    // Verify template exists and user has access
    const { data: template, error: templateError } = await supabase
      .from("financial_templates")
      .select("id, rfp_id")
      .eq("id", template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found or access denied" },
        { status: 404 }
      );
    }

    // Verify parent_id exists if provided
    if (parent_id) {
      const { data: parentLine, error: parentError } = await supabase
        .from("financial_template_lines")
        .select("id, template_id")
        .eq("id", parent_id)
        .eq("template_id", template_id)
        .single();

      if (parentError || !parentLine) {
        return NextResponse.json(
          { error: "Parent line not found in this template" },
          { status: 404 }
        );
      }
    }

    // Check if line_code already exists in this template
    const { data: existingLine } = await supabase
      .from("financial_template_lines")
      .select("id")
      .eq("template_id", template_id)
      .eq("line_code", line_code.trim())
      .single();

    if (existingLine) {
      return NextResponse.json(
        { error: `Line code '${line_code}' already exists in this template` },
        { status: 409 }
      );
    }

    // Generate sort_order if not provided
    let finalSortOrder = sort_order;
    if (finalSortOrder === undefined || finalSortOrder === null) {
      // Get max sort_order at the same level
      const { data: maxOrderLine } = await supabase
        .from("financial_template_lines")
        .select("sort_order")
        .eq("template_id", template_id)
        .eq("parent_id", parent_id || null)
        .order("sort_order", { ascending: false })
        .limit(1)
        .single();

      finalSortOrder = maxOrderLine ? maxOrderLine.sort_order + 1 : 0;
    }

    // Create the line
    const { data: line, error: createError } = await supabase
      .from("financial_template_lines")
      .insert({
        template_id,
        parent_id: parent_id || null,
        line_code: line_code.trim(),
        name: name.trim(),
        line_type,
        recurrence_type: line_type === "recurrent" ? recurrence_type : null,
        custom_formula: custom_formula || null,
        sort_order: finalSortOrder,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating template line:", createError);
      return NextResponse.json(
        { error: `Failed to create template line: ${createError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Template line created successfully",
        line,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in POST /api/financial-template-lines:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
