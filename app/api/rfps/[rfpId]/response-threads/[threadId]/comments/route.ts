import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRFPAccess } from "@/lib/permissions/rfp-access";

// ─── GET /api/rfps/[rfpId]/response-threads/[threadId]/comments ─────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { rfpId: string; threadId: string } }
) {
  try {
    const { rfpId, threadId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hasAccess } = await checkRFPAccess(rfpId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const adminSupabase = createServiceClient();

    // Verify thread belongs to this RFP
    const { data: thread, error: threadError } = await adminSupabase
      .from("response_threads")
      .select("id, response_id")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    const { data: responseLink, error: responseLinkError } = await adminSupabase
      .from("responses")
      .select("id")
      .eq("id", thread.response_id)
      .eq("rfp_id", rfpId)
      .single();

    if (responseLinkError || !responseLink) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    // Fetch comments with author info
    const { data: comments, error: commentsError } = await adminSupabase
      .from("thread_comments")
      .select(
        `
        id,
        thread_id,
        content,
        author_id,
        edited_at,
        created_at,
        updated_at,
        users ( id, email, full_name )
      `
      )
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (commentsError) {
      console.error("[thread-comments] GET error:", commentsError);
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500 }
      );
    }

    const transformedComments = (comments || []).map((c: any) => ({
      id: c.id,
      thread_id: c.thread_id,
      content: c.content,
      author_id: c.author_id,
      edited_at: c.edited_at,
      created_at: c.created_at,
      updated_at: c.updated_at,
      author: c.users
        ? {
            email: c.users.email || "",
            display_name: c.users.full_name || null,
          }
        : { email: "", display_name: null },
    }));

    return NextResponse.json({ comments: transformedComments }, { status: 200 });
  } catch (error) {
    console.error("[thread-comments] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/rfps/[rfpId]/response-threads/[threadId]/comments ────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string; threadId: string } }
) {
  try {
    const { rfpId, threadId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hasAccess, accessLevel } = await checkRFPAccess(rfpId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    if (accessLevel === "viewer") {
      return NextResponse.json(
        { error: "Viewers cannot add comments" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
    }

    const adminSupabase = createServiceClient();

    // Verify thread belongs to this RFP
    const { data: thread, error: threadError } = await adminSupabase
      .from("response_threads")
      .select("id, response_id")
      .eq("id", threadId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    const { data: responseLink, error: responseLinkError } = await adminSupabase
      .from("responses")
      .select("id")
      .eq("id", thread.response_id)
      .eq("rfp_id", rfpId)
      .single();

    if (responseLinkError || !responseLink) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    const { data: comment, error: insertError } = await adminSupabase
      .from("thread_comments")
      .insert({
        thread_id: threadId,
        content,
        author_id: user.id,
      })
      .select("id, thread_id, content, author_id, edited_at, created_at, updated_at")
      .single();

    if (insertError) {
      console.error("[thread-comments] POST error:", insertError);
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
            email: user.email || "",
            display_name:
              user.user_metadata?.display_name ||
              user.user_metadata?.full_name ||
              null,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[thread-comments] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── PATCH /api/rfps/[rfpId]/response-threads/[threadId]/comments ───────────
// Used for updating a specific comment (by commentId in body)

export async function PATCH(
  request: NextRequest,
  { params }: { params: { rfpId: string; threadId: string } }
) {
  try {
    const { rfpId, threadId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hasAccess } = await checkRFPAccess(rfpId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const body = await request.json();
    const { comment_id: commentId, content } = body as {
      comment_id: string;
      content: string;
    };

    if (!commentId || !content?.trim()) {
      return NextResponse.json(
        { error: "comment_id and content are required" },
        { status: 400 }
      );
    }

    const adminSupabase = createServiceClient();

    // Verify comment belongs to this thread and user is the author
    const { data: existing, error: existingError } = await adminSupabase
      .from("thread_comments")
      .select("id, author_id, thread_id")
      .eq("id", commentId)
      .eq("thread_id", threadId)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    if (existing.author_id !== user.id) {
      return NextResponse.json(
        { error: "You can only edit your own comments" },
        { status: 403 }
      );
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from("thread_comments")
      .update({
        content: content.trim(),
        edited_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .select("id, thread_id, content, author_id, edited_at, created_at, updated_at")
      .single();

    if (updateError) {
      console.error("[thread-comments] PATCH error:", updateError);
      return NextResponse.json(
        { error: "Failed to update comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ comment: updated }, { status: 200 });
  } catch (error) {
    console.error("[thread-comments] PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── DELETE /api/rfps/[rfpId]/response-threads/[threadId]/comments ──────────
// Used for deleting a specific comment (by commentId in query param)

export async function DELETE(
  request: NextRequest,
  { params }: { params: { rfpId: string; threadId: string } }
) {
  try {
    const { rfpId, threadId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { hasAccess } = await checkRFPAccess(rfpId, user.id);
    if (!hasAccess) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const commentId = request.nextUrl.searchParams.get("commentId");
    if (!commentId) {
      return NextResponse.json(
        { error: "commentId query parameter is required" },
        { status: 400 }
      );
    }

    const adminSupabase = createServiceClient();

    // Verify comment belongs to this thread and user is the author
    const { data: existing, error: existingError } = await adminSupabase
      .from("thread_comments")
      .select("id, author_id, thread_id")
      .eq("id", commentId)
      .eq("thread_id", threadId)
      .single();

    if (existingError || !existing) {
      return NextResponse.json(
        { error: "Comment not found" },
        { status: 404 }
      );
    }

    if (existing.author_id !== user.id) {
      return NextResponse.json(
        { error: "You can only delete your own comments" },
        { status: 403 }
      );
    }

    const { error: deleteError } = await adminSupabase
      .from("thread_comments")
      .delete()
      .eq("id", commentId);

    if (deleteError) {
      console.error("[thread-comments] DELETE error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete comment" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[thread-comments] DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
