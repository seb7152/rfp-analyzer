import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const supabase = await createServerClient();
    const scope = request.nextUrl.searchParams.get("scope");

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is part of the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", params.organizationId)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let rfps = [];
    let rfpsError: { message: string } | null = null;

    const canReadAll = userOrg.role === "admin" && scope !== "assigned";

    if (canReadAll) {
      // Admin default scope: fetch all RFPs for this organization
      const result = await supabase
        .from("rfps")
        .select(
          `
          id,
          title,
          description,
          status,
          created_at,
          updated_at,
          created_by,
          organization_id
        `
        )
        .eq("organization_id", params.organizationId)
        .order("created_at", { ascending: false });

      rfps = result.data || [];
      rfpsError = result.error;
    } else {
      // Default scope: fetch only RFPs assigned to the current user
      const assignmentsResult = await supabase
        .from("rfp_user_assignments")
        .select("rfp_id")
        .eq("user_id", user.id);

      if (assignmentsResult.error) {
        rfpsError = assignmentsResult.error;
      } else {
        const rfpIds = assignmentsResult.data?.map((a: any) => a.rfp_id) || [];

        if (rfpIds.length === 0) {
          rfps = [];
        } else {
          const rfpsResult = await supabase
            .from("rfps")
            .select(
              `
              id,
              title,
              description,
              status,
              created_at,
              updated_at,
              created_by,
              organization_id
            `
            )
            .in("id", rfpIds)
            .eq("organization_id", params.organizationId)
            .order("created_at", { ascending: false });

          rfps = rfpsResult.data || [];
          rfpsError = rfpsResult.error;
        }
      }
    }

    // Check for errors
    if (rfpsError) {
      console.error("Error fetching RFPs:", rfpsError);
      return NextResponse.json(
        { error: `Failed to fetch RFPs: ${rfpsError.message}` },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        rfps,
        total: rfps.length,
        scope: canReadAll ? "all" : "assigned",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("RFPs list error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
