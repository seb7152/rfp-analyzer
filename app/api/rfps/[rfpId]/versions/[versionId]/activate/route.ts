import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/rfps/[rfpId]/versions/[versionId]/activate
 * Set as active version (deactivates others)
 */
export async function POST(
  _request: NextRequest,
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

    // Verify version exists
    const { data: version } = await supabase
      .from("evaluation_versions")
      .select("id")
      .eq("id", versionId)
      .eq("rfp_id", rfpId)
      .single();

    if (!version) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Get current active version
    const { data: previousActive } = await supabase
      .from("evaluation_versions")
      .select("id")
      .eq("rfp_id", rfpId)
      .eq("is_active", true)
      .single();

    // Deactivate all other versions
    await supabase
      .from("evaluation_versions")
      .update({ is_active: false })
      .eq("rfp_id", rfpId)
      .neq("id", versionId);

    // Activate this version
    const { error } = await supabase
      .from("evaluation_versions")
      .update({ is_active: true })
      .eq("id", versionId);

    if (error) {
      console.error("Error activating version:", error);
      return NextResponse.json(
        { error: "Failed to activate version" },
        { status: 500 }
      );
    }

    // Log audit trail
    await supabase.from("version_changes_log").insert({
      version_id: versionId,
      rfp_id: rfpId,
      action: "version_activated",
      details: {
        previous_active_version_id: previousActive?.id || null,
      },
      created_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Version activated successfully",
      previous_active_version_id: previousActive?.id || null,
    });
  } catch (error) {
    console.error("Error in POST activate:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
