import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { rfpId: string; configId: string } }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { error } = await supabase
      .from("docx_import_configs")
      .delete()
      .eq("id", params.configId)
      .eq("rfp_id", params.rfpId);

    if (error) {
      console.error("Error deleting DOCX config:", error);
      return NextResponse.json(
        { error: "Failed to delete configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DOCX config deletion error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { rfpId: string; configId: string } }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await _request.json();

    // If setting as default, unset other defaults first
    if (body.isDefault) {
      await supabase
        .from("docx_import_configs")
        .update({ is_default: false })
        .eq("rfp_id", params.rfpId)
        .eq("is_default", true)
        .neq("id", params.configId);
    }

    const updateData: any = {};
    if (body.name) updateData.name = body.name;
    if (body.codeType) updateData.code_type = body.codeType;
    if (body.codePattern) updateData.code_pattern = body.codePattern;
    if (body.codeGroupIndex !== undefined)
      updateData.code_group_index = body.codeGroupIndex;
    if (body.codeColumnIndex !== undefined)
      updateData.code_column_index = body.codeColumnIndex;
    if (body.codeTemplate) updateData.code_template = body.codeTemplate;
    if (body.titleType !== undefined) updateData.title_type = body.titleType;
    if (body.titlePattern !== undefined)
      updateData.title_pattern = body.titlePattern;
    if (body.titleGroupIndex !== undefined)
      updateData.title_group_index = body.titleGroupIndex;
    if (body.titleColumnIndex !== undefined)
      updateData.title_column_index = body.titleColumnIndex;
    if (body.contentType !== undefined)
      updateData.content_type = body.contentType;
    if (body.contentPattern !== undefined)
      updateData.content_pattern = body.contentPattern;
    if (body.contentGroupIndex !== undefined)
      updateData.content_group_index = body.contentGroupIndex;
    if (body.contentColumnIndex !== undefined)
      updateData.content_column_index = body.contentColumnIndex;
    if (body.enableTitleExtraction !== undefined)
      updateData.enable_title_extraction = body.enableTitleExtraction;
    if (body.enableContentExtraction !== undefined)
      updateData.enable_content_extraction = body.enableContentExtraction;
    if (body.isDefault !== undefined) updateData.is_default = body.isDefault;

    const { data: config, error } = await supabase
      .from("docx_import_configs")
      .update(updateData)
      .eq("id", params.configId)
      .eq("rfp_id", params.rfpId)
      .select()
      .single();

    if (error) {
      console.error("Error updating DOCX config:", error);
      return NextResponse.json(
        { error: "Failed to update configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json({ config });
  } catch (error) {
    console.error("DOCX config update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
