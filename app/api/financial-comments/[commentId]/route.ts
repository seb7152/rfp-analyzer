import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { UpdateFinancialCommentInput } from "@/types/financial";

/**
 * PUT /api/financial-comments/[commentId]
 * Modifie un commentaire existant
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = params;
    const body: UpdateFinancialCommentInput = await request.json();

    if (!body.comment) {
      return NextResponse.json(
        { error: "comment field is required" },
        { status: 400 }
      );
    }

    // Fetch the comment to verify ownership
    const { data: comment, error: fetchError } = await supabase
      .from("financial_comments")
      .select("id, created_by")
      .eq("id", commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Verify user is the author
    if (comment.created_by !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own comments" },
        { status: 403 }
      );
    }

    // Update the comment
    const { data: updatedComment, error: updateError } = await supabase
      .from("financial_comments")
      .update({
        comment: body.comment,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
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

    if (updateError) {
      console.error("[financial-comments] PUT error:", updateError);
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment: updatedComment });
  } catch (error) {
    console.error("[financial-comments] PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/financial-comments/[commentId]
 * Supprime un commentaire
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { commentId: string } }
) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { commentId } = params;

    // Fetch the comment to verify ownership
    const { data: comment, error: fetchError } = await supabase
      .from("financial_comments")
      .select("id, created_by")
      .eq("id", commentId)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    // Verify user is the author
    if (comment.created_by !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    // Delete the comment
    const { error: deleteError } = await supabase
      .from("financial_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      console.error("[financial-comments] DELETE error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[financial-comments] DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
