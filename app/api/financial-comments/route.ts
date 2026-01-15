import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { CreateFinancialCommentInput } from "@/types/financial";

/**
 * GET /api/financial-comments
 * Récupère les commentaires pour une ligne et optionnellement une version
 * Query params: lineId, versionId (optionnel)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lineId = request.nextUrl.searchParams.get("lineId");
    const versionId = request.nextUrl.searchParams.get("versionId");

    if (!lineId) {
      return NextResponse.json(
        { error: "lineId query parameter is required" },
        { status: 400 }
      );
    }

    // Build query
    let query = supabase
      .from("financial_comments")
      .select(
        `
        id,
        template_line_id,
        version_id,
        comment,
        created_by,
        created_at,
        updated_at,
        auth_user:created_by(id, email, user_metadata)
      `
      )
      .eq("template_line_id", lineId);

    if (versionId) {
      query = query.eq("version_id", versionId);
    }

    const { data: comments, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("[financial-comments] GET error:", error);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    // Transform comments to include author info
    const transformedComments = (comments || []).map((comment: any) => ({
      ...comment,
      author: comment.auth_user
        ? {
            id: comment.auth_user.id,
            email: comment.auth_user.email,
            user_metadata: comment.auth_user.user_metadata,
          }
        : null,
    }));

    return NextResponse.json({ comments: transformedComments });
  } catch (error) {
    console.error("[financial-comments] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/financial-comments
 * Ajoute un nouveau commentaire
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: CreateFinancialCommentInput = await request.json();

    // Validate inputs
    if (!body.template_line_id || !body.comment) {
      return NextResponse.json(
        { error: "template_line_id and comment are required" },
        { status: 400 }
      );
    }

    // Verify that the template_line_id exists and belongs to user's RFP
    const { data: templateLine, error: lineError } = await supabase
      .from("financial_template_lines")
      .select("id, template_id")
      .eq("id", body.template_line_id)
      .single();

    if (lineError || !templateLine) {
      return NextResponse.json(
        { error: "Template line not found" },
        { status: 404 }
      );
    }

    // Verify template belongs to user's organization
    const { data: template, error: templateError } = await supabase
      .from("financial_templates")
      .select("id, rfp_id")
      .eq("id", templateLine.template_id)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Insert the comment
    const { data: comment, error: insertError } = await supabase
      .from("financial_comments")
      .insert({
        template_line_id: body.template_line_id,
        version_id: body.version_id || null,
        comment: body.comment,
        created_by: user.id,
      })
      .select(
        `
        id,
        template_line_id,
        version_id,
        comment,
        created_by,
        created_at,
        updated_at
      `
      )
      .single();

    if (insertError) {
      console.error("[financial-comments] POST error:", insertError);
      return NextResponse.json(
        { error: "Failed to create comment" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        comment: {
          ...comment,
          author: {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[financial-comments] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
