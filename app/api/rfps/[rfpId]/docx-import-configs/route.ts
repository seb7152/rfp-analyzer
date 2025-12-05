import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
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

    // Fetch all configs for this RFP
    const { data: configs, error } = await supabase
      .from("docx_import_configs")
      .select("*")
      .eq("rfp_id", params.rfpId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching DOCX configs:", error);
      return NextResponse.json(
        { error: "Failed to fetch configurations" },
        { status: 500 }
      );
    }

    return NextResponse.json({ configs: configs || [] });
  } catch (error) {
    console.error("DOCX configs fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
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
    const {
      name,
      codeType,
      codePattern,
      codeGroupIndex,
      codeColumnIndex,
      codeTemplate,
      titleType,
      titlePattern,
      titleGroupIndex,
      titleColumnIndex,
      contentType,
      contentPattern,
      contentGroupIndex,
      contentColumnIndex,
      enableTitleExtraction,
      enableContentExtraction,
      isDefault,
    } = body;

    // Validate required fields
    if (
      !name ||
      !codeType ||
      !codePattern ||
      codeGroupIndex === undefined ||
      !codeTemplate
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (isDefault) {
      await supabase
        .from("docx_import_configs")
        .update({ is_default: false })
        .eq("rfp_id", params.rfpId)
        .eq("is_default", true);
    }

    // Insert new config
    const { data: config, error } = await supabase
      .from("docx_import_configs")
      .insert({
        rfp_id: params.rfpId,
        name,
        code_type: codeType,
        code_pattern: codePattern,
        code_group_index: codeGroupIndex,
        code_column_index: codeColumnIndex,
        code_template: codeTemplate,
        title_type: titleType,
        title_pattern: titlePattern,
        title_group_index: titleGroupIndex,
        title_column_index: titleColumnIndex,
        content_type: contentType,
        content_pattern: contentPattern,
        content_group_index: contentGroupIndex,
        content_column_index: contentColumnIndex,
        enable_title_extraction: enableTitleExtraction,
        enable_content_extraction: enableContentExtraction,
        is_default: isDefault || false,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating DOCX config:", error);
      return NextResponse.json(
        { error: "Failed to create configuration" },
        { status: 500 }
      );
    }

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error("DOCX config creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
