import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/rfps/[rfpId]/versions/[versionId]/finalize
 * Finalize a version (make it read-only)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ rfpId: string; versionId: string }> }
) {
  try {
    const params = await context.params;
    const { rfpId, versionId } = params;

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify version exists and is not already finalized
    const { data: version } = await supabase
      .from("evaluation_versions")
      .select("finalized_at, is_active")
      .eq("id", versionId)
      .eq("rfp_id", rfpId)
      .single();

    if (!version) {
      return NextResponse.json(
        { error: "Version not found" },
        { status: 404 }
      );
    }

    if (version.finalized_at) {
      return NextResponse.json(
        { error: "Version is already finalized" },
        { status: 400 }
      );
    }

    // Finalize the version
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("evaluation_versions")
      .update({
        finalized_at: now,
        finalized_by: user.id,
      })
      .eq("id", versionId);

    if (error) {
      console.error("Error finalizing version:", error);
      return NextResponse.json(
        { error: "Failed to finalize version" },
        { status: 500 }
      );
    }

    // Log audit trail
    await supabase.from("version_changes_log").insert({
      version_id: versionId,
      rfp_id: rfpId,
      action: "version_finalized",
      details: {
        finalized_at: now,
      },
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Version finalized successfully",
    });
  } catch (error) {
    console.error("Error in POST finalize:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
