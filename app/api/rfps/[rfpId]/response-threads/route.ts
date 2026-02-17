import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRFPAccess } from "@/lib/permissions/rfp-access";
import type {
  CreateThreadRequest,
  ThreadsQueryFilters,
} from "@/types/response-thread";

// ─── GET /api/rfps/[rfpId]/response-threads ─────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

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

    // Parse filters from query params
    const searchParams = request.nextUrl.searchParams;
    const filters: ThreadsQueryFilters = {
      response_id: searchParams.get("response_id") || undefined,
      status: (searchParams.get("status") as ThreadsQueryFilters["status"]) || undefined,
      priority: (searchParams.get("priority") as ThreadsQueryFilters["priority"]) || undefined,
      supplier_id: searchParams.get("supplier_id") || undefined,
      created_by: searchParams.get("created_by") || undefined,
    };

    const adminSupabase = createServiceClient();

    // Build query — single bulk fetch with aggregates, no N+1
    let query = adminSupabase
      .from("response_threads")
      .select(
        `
        id,
        response_id,
        title,
        status,
        priority,
        created_by,
        resolved_by,
        resolved_at,
        created_at,
        updated_at,
        responses!inner (
          id,
          rfp_id,
          requirement_id,
          supplier_id,
          requirements ( id, title, requirement_id_external ),
          suppliers ( id, name )
        )
      `
      )
      .eq("responses.rfp_id", rfpId);

    // Apply filters
    if (filters.response_id) {
      query = query.eq("response_id", filters.response_id);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.priority) {
      query = query.eq("priority", filters.priority);
    }
    if (filters.supplier_id) {
      query = query.eq("responses.supplier_id", filters.supplier_id);
    }
    if (filters.created_by) {
      query = query.eq("created_by", filters.created_by);
    }

    query = query.order("created_at", { ascending: false });

    const { data: threads, error: threadsError } = await query;

    if (threadsError) {
      console.error("[response-threads] GET error:", threadsError);
      return NextResponse.json(
        { error: `Failed to fetch threads: ${threadsError.message}` },
        { status: 500 }
      );
    }

    // Fetch comment counts for all threads in one query
    const threadIds = (threads || []).map((t: any) => t.id);
    let commentCountsMap: Record<string, { count: number; last_at: string | null }> = {};

    if (threadIds.length > 0) {
      const { data: commentStats, error: countError } = await adminSupabase
        .rpc("get_thread_comment_stats", { thread_ids: threadIds });

      if (!countError && commentStats) {
        commentCountsMap = Object.fromEntries(
          (commentStats as any[]).map((s: any) => [
            s.thread_id,
            { count: s.comment_count, last_at: s.last_comment_at },
          ])
        );
      } else {
        // Fallback: fetch counts individually (if RPC not available)
        const { data: comments } = await adminSupabase
          .from("thread_comments")
          .select("thread_id, created_at")
          .in("thread_id", threadIds)
          .order("created_at", { ascending: false });

        if (comments) {
          for (const c of comments) {
            if (!commentCountsMap[c.thread_id]) {
              commentCountsMap[c.thread_id] = { count: 0, last_at: c.created_at };
            }
            commentCountsMap[c.thread_id].count++;
          }
        }
      }
    }

    // Fetch creator/resolver user info
    const userIds = new Set<string>();
    for (const t of threads || []) {
      const thread = t as any;
      if (thread.created_by) userIds.add(thread.created_by);
      if (thread.resolved_by) userIds.add(thread.resolved_by);
    }

    let usersMap: Record<string, { email: string; display_name: string | null }> = {};
    if (userIds.size > 0) {
      const { data: users } = await adminSupabase
        .from("users")
        .select("id, email, full_name")
        .in("id", Array.from(userIds));

      if (users) {
        usersMap = Object.fromEntries(
          users.map((u: any) => [
            u.id,
            { email: u.email || "", display_name: u.full_name || null },
          ])
        );
      }
    }

    // Transform to API response shape
    const transformedThreads = (threads || []).map((t: any) => {
      const stats = commentCountsMap[t.id] || { count: 0, last_at: null };
      return {
        id: t.id,
        response_id: t.response_id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        created_by: t.created_by,
        creator: usersMap[t.created_by] || { email: "", display_name: null },
        resolved_by: t.resolved_by,
        resolver: t.resolved_by
          ? usersMap[t.resolved_by] || { email: "", display_name: null }
          : null,
        resolved_at: t.resolved_at,
        created_at: t.created_at,
        updated_at: t.updated_at,
        comment_count: stats.count,
        last_comment_at: stats.last_at,
        requirement_title: t.responses?.requirements?.title || null,
        requirement_id_external:
          t.responses?.requirements?.requirement_id_external || null,
        requirement_id: t.responses?.requirement_id || null,
        supplier_name: t.responses?.suppliers?.name || null,
        supplier_id: t.responses?.supplier_id || null,
      };
    });

    // Compute counts
    const allThreads = transformedThreads;
    const counts = {
      total: allThreads.length,
      open: allThreads.filter((t: any) => t.status === "open").length,
      resolved: allThreads.filter((t: any) => t.status === "resolved").length,
      blocking: allThreads.filter(
        (t: any) => t.priority === "blocking" && t.status === "open"
      ).length,
    };

    return NextResponse.json({ threads: transformedThreads, counts }, { status: 200 });
  } catch (error) {
    console.error("[response-threads] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

// ─── POST /api/rfps/[rfpId]/response-threads ────────────────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

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
        { error: "Viewers cannot create threads" },
        { status: 403 }
      );
    }

    const body: CreateThreadRequest = await request.json();

    if (!body.response_id || !body.content?.trim()) {
      return NextResponse.json(
        { error: "response_id and content are required" },
        { status: 400 }
      );
    }

    const adminSupabase = createServiceClient();

    // Verify response belongs to this RFP
    const { data: response, error: responseError } = await adminSupabase
      .from("responses")
      .select("id, rfp_id")
      .eq("id", body.response_id)
      .eq("rfp_id", rfpId)
      .single();

    if (responseError || !response) {
      return NextResponse.json(
        { error: "Response not found in this RFP" },
        { status: 404 }
      );
    }

    // Create thread
    const { data: thread, error: threadError } = await adminSupabase
      .from("response_threads")
      .insert({
        response_id: body.response_id,
        title: body.title?.trim() || null,
        priority: body.priority || "normal",
        status: "open",
        created_by: user.id,
      })
      .select("id, response_id, title, status, priority, created_by, created_at, updated_at")
      .single();

    if (threadError || !thread) {
      console.error("[response-threads] POST thread error:", threadError);
      return NextResponse.json(
        { error: "Failed to create thread" },
        { status: 500 }
      );
    }

    // Create first comment
    const { data: comment, error: commentError } = await adminSupabase
      .from("thread_comments")
      .insert({
        thread_id: thread.id,
        content: body.content.trim(),
        author_id: user.id,
      })
      .select("id, thread_id, content, author_id, created_at, updated_at")
      .single();

    if (commentError) {
      console.error("[response-threads] POST comment error:", commentError);
      // Thread was created but comment failed — clean up
      await adminSupabase.from("response_threads").delete().eq("id", thread.id);
      return NextResponse.json(
        { error: "Failed to create initial comment" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        thread: {
          ...thread,
          resolved_by: null,
          resolved_at: null,
          creator: {
            email: user.email || "",
            display_name: user.user_metadata?.display_name || user.user_metadata?.full_name || null,
          },
          resolver: null,
          comment_count: 1,
          last_comment_at: comment.created_at,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[response-threads] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
