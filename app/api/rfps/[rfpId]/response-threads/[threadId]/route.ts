import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { checkRFPAccess } from "@/lib/permissions/rfp-access";
import type { UpdateThreadRequest } from "@/types/response-thread";

// ─── PATCH /api/rfps/[rfpId]/response-threads/[threadId] ────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { rfpId: string; threadId: string } }
) {
  try {
    const { rfpId, threadId } = params;

    if (!rfpId || !threadId) {
      return NextResponse.json(
        { error: "rfpId and threadId are required" },
        { status: 400 }
      );
    }

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
        { error: "Viewers cannot update threads" },
        { status: 403 }
      );
    }

    const adminSupabase = createServiceClient();

    // Verify thread belongs to a response in this RFP
    const { data: thread, error: threadError } = await adminSupabase
      .from("response_threads")
      .select(
        `
        id, response_id, status, priority, title,
        responses!inner ( rfp_id )
      `
      )
      .eq("id", threadId)
      .eq("responses.rfp_id", rfpId)
      .single();

    if (threadError || !thread) {
      return NextResponse.json(
        { error: "Thread not found" },
        { status: 404 }
      );
    }

    const body: UpdateThreadRequest = await request.json();
    const updatePayload: Record<string, unknown> = {};

    // Update status
    if (body.status && body.status !== thread.status) {
      if (!["open", "resolved"].includes(body.status)) {
        return NextResponse.json(
          { error: "Invalid status. Must be 'open' or 'resolved'." },
          { status: 400 }
        );
      }

      updatePayload.status = body.status;

      if (body.status === "resolved") {
        updatePayload.resolved_by = user.id;
        updatePayload.resolved_at = new Date().toISOString();
      } else {
        // Reopening
        updatePayload.resolved_by = null;
        updatePayload.resolved_at = null;
      }
    }

    // Update priority
    if (body.priority && body.priority !== thread.priority) {
      if (!["normal", "important", "blocking"].includes(body.priority)) {
        return NextResponse.json(
          { error: "Invalid priority. Must be 'normal', 'important', or 'blocking'." },
          { status: 400 }
        );
      }
      updatePayload.priority = body.priority;
    }

    // Update title
    if (body.title !== undefined) {
      updatePayload.title = body.title?.trim() || null;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error: updateError } = await adminSupabase
      .from("response_threads")
      .update(updatePayload)
      .eq("id", threadId)
      .select(
        "id, response_id, title, status, priority, created_by, resolved_by, resolved_at, created_at, updated_at"
      )
      .single();

    if (updateError) {
      console.error("[response-threads] PATCH error:", updateError);
      return NextResponse.json(
        { error: "Failed to update thread" },
        { status: 500 }
      );
    }

    return NextResponse.json({ thread: updated }, { status: 200 });
  } catch (error) {
    console.error("[response-threads] PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
