import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyRFPAccess } from "@/lib/permissions/rfp-access";

export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    if (!rfpId) {
      return NextResponse.json(
        { error: "RFP ID is required" },
        { status: 400 }
      );
    }

    const versionId = request.nextUrl.searchParams.get("versionId");
    if (!versionId) {
      return NextResponse.json(
        { error: "versionId query parameter is required" },
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

    // viewer+ access required
    const accessError = await verifyRFPAccess(rfpId, user.id, "viewer");
    if (accessError) {
      return accessError;
    }

    // Service client — access already validated above, RLS SELECT uses
    // auth.jwt() ->> 'organization_id' which is not a configured custom claim
    const adminSupabase = createServiceClient();

    const { data: statuses, error: statusError } = await adminSupabase
      .from("requirement_review_status")
      .select(
        "id, requirement_id, version_id, status, submitted_by, submitted_at, reviewed_by, reviewed_at, rejection_comment, created_at, updated_at"
      )
      .eq("version_id", versionId);

    if (statusError) {
      return NextResponse.json(
        { error: `Failed to fetch review statuses: ${statusError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ statuses: statuses ?? [] }, { status: 200 });
  } catch (error) {
    console.error("Error fetching review statuses:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
