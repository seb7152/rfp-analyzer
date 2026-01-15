import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * PUT /api/financial-template-lines/[lineId]
 * Modifie une ligne existante du template
 * US-1-007
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { lineId: string } }
) {
  try {
    const { lineId } = params;

    if (!lineId) {
      return NextResponse.json(
        { error: "Line ID is required" },
        { status: 400 }
      );
    }

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
      line_code,
      name,
      line_type,
      recurrence_type,
      custom_formula,
      parent_id,
      sort_order,
    } = body;

    // Get the existing line to verify access and check template_id
    const { data: existingLine, error: lineError } = await supabase
      .from("financial_template_lines")
      .select("id, template_id, parent_id, line_type")
      .eq("id", lineId)
      .single();

    if (lineError || !existingLine) {
      return NextResponse.json(
        { error: "Line not found or access denied" },
        { status: 404 }
      );
    }

    // Verify template access
    const { data: template, error: templateError } = await supabase
      .from("financial_templates")
      .select("id, rfp_id")
      .eq("id", existingLine.template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found or access denied" },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (line_code !== undefined) {
      if (typeof line_code !== "string" || line_code.trim().length === 0) {
        return NextResponse.json(
          { error: "line_code must be a non-empty string" },
          { status: 400 }
        );
      }

      // Check if new line_code conflicts with existing lines (excluding current line)
      const { data: conflictingLine } = await supabase
        .from("financial_template_lines")
        .select("id")
        .eq("template_id", existingLine.template_id)
        .eq("line_code", line_code.trim())
        .neq("id", lineId)
        .single();

      if (conflictingLine) {
        return NextResponse.json(
          { error: `Line code '${line_code}' already exists in this template` },
          { status: 409 }
        );
      }

      updateData.line_code = line_code.trim();
    }

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "name must be a non-empty string" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (line_type !== undefined) {
      if (["setup", "recurrent"].indexOf(line_type) === -1) {
        return NextResponse.json(
          { error: "line_type must be 'setup' or 'recurrent'" },
          { status: 400 }
        );
      }
      updateData.line_type = line_type;
    }

    if (recurrence_type !== undefined) {
      const finalLineType = line_type || existingLine.line_type;
      if (finalLineType === "recurrent") {
        if (!recurrence_type || ["monthly", "yearly"].indexOf(recurrence_type) === -1) {
          return NextResponse.json(
            { error: "recurrence_type must be 'monthly' or 'yearly' for recurrent lines" },
            { status: 400 }
          );
        }
        updateData.recurrence_type = recurrence_type;
      } else {
        updateData.recurrence_type = null;
      }
    }

    if (custom_formula !== undefined) {
      updateData.custom_formula = custom_formula || null;
    }

    if (parent_id !== undefined) {
      if (parent_id === lineId) {
        return NextResponse.json(
          { error: "parent_id cannot reference the line itself" },
          { status: 400 }
        );
      }

      // Check if parent_id would create a cycle
      if (parent_id) {
        // Verify parent exists in the same template
        const { data: parentLine, error: parentError } = await supabase
          .from("financial_template_lines")
          .select("id, template_id")
          .eq("id", parent_id)
          .eq("template_id", existingLine.template_id)
          .single();

        if (parentError || !parentLine) {
          return NextResponse.json(
            { error: "Parent line not found in this template" },
            { status: 404 }
          );
        }

      }
      updateData.parent_id = parent_id || null;
    }

    if (sort_order !== undefined) {
      updateData.sort_order = sort_order;
    }

    // Update the line
    const { data: updatedLine, error: updateError } = await supabase
      .from("financial_template_lines")
      .update(updateData)
      .eq("id", lineId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating template line:", updateError);
      if (updateError.message?.includes("Circular reference detected")) {
        return NextResponse.json(
          { error: "Cannot set parent_id to a descendant line (would create a cycle)" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: `Failed to update template line: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Template line updated successfully",
        line: updatedLine,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in PUT /api/financial-template-lines/[lineId]:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/financial-template-lines/[lineId]
 * Supprime une ligne du template (soft delete ou hard delete)
 * US-1-008
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { lineId: string } }
) {
  try {
    const { lineId } = params;

    if (!lineId) {
      return NextResponse.json(
        { error: "Line ID is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the line to verify access
    const { data: line, error: lineError } = await supabase
      .from("financial_template_lines")
      .select("id, template_id")
      .eq("id", lineId)
      .single();

    if (lineError || !line) {
      return NextResponse.json(
        { error: "Line not found or access denied" },
        { status: 404 }
      );
    }

    // Verify template access
    const { data: template, error: templateError } = await supabase
      .from("financial_templates")
      .select("id, rfp_id")
      .eq("id", line.template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found or access denied" },
        { status: 404 }
      );
    }

    // Check if line has children
    const { data: children, error: childrenError } = await supabase
      .from("financial_template_lines")
      .select("id")
      .eq("parent_id", lineId)
      .eq("is_active", true);

    if (childrenError) {
      console.error("Error checking for children:", childrenError);
      return NextResponse.json(
        { error: "Failed to check for child lines" },
        { status: 500 }
      );
    }

    // Check if line has associated values (table may not exist yet in US-1)
    const { data: values, error: valuesError } = await supabase
      .from("financial_offer_values")
      .select("id")
      .eq("template_line_id", lineId)
      .limit(1);

    // Ignore error if table doesn't exist yet (will be created in US-2)
    const hasValues = !valuesError && values && values.length > 0;

    // If has children or values, do soft delete (cascade to descendants)
    if ((children && children.length > 0) || hasValues) {
      const { data: descendants, error: descendantsError } = await supabase.rpc(
        "get_line_descendants",
        { line_id: lineId }
      );

      if (descendantsError) {
        console.error("Error fetching descendants:", descendantsError);
        return NextResponse.json(
          { error: "Failed to fetch descendant lines" },
          { status: 500 }
        );
      }

      const descendantIds = descendants?.map((d: { id: string }) => d.id) || [];
      const idsToDeactivate = [lineId, ...descendantIds];

      const { error: softDeleteError } = await supabase
        .from("financial_template_lines")
        .update({ is_active: false })
        .in("id", idsToDeactivate);

      if (softDeleteError) {
        console.error("Error soft deleting line:", softDeleteError);
        return NextResponse.json(
          { error: `Failed to delete line: ${softDeleteError.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Line deactivated successfully (soft delete)",
          deleted_type: "soft",
        },
        { status: 200 }
      );
    }

    // Otherwise, do hard delete
    const { error: deleteError } = await supabase
      .from("financial_template_lines")
      .delete()
      .eq("id", lineId);

    if (deleteError) {
      console.error("Error hard deleting line:", deleteError);
      return NextResponse.json(
        { error: `Failed to delete line: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Line deleted successfully",
        deleted_type: "hard",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in DELETE /api/financial-template-lines/[lineId]:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
