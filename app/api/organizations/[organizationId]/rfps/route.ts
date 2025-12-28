import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { organizationId: string } }
) {
  try {
    const supabase = await createServerClient();

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

    let rfps;
    let rfpsError;

    // If user is admin, show all RFPs in organization
    // If not admin, only show RFPs where user is assigned
    if (userOrg.role === "admin") {
      // Admin: fetch all RFPs for this organization
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

      console.log("Admin RFP query result:", {
        data: result.data,
        error: result.error,
      });
      rfps = result.data;
      rfpsError = result.error;
    } else {
      // Non-admin: fetch only RFPs where user is assigned AND in this organization
      // Step 1: Get user's RFP assignments for this organization
      const assignmentsResult = await supabase
        .from("rfp_user_assignments")
        .select("rfp_id")
        .eq("user_id", user.id);

      console.log("Assignments query result:", {
        data: assignmentsResult.data,
        error: assignmentsResult.error,
      });

      if (assignmentsResult.error) {
        rfpsError = assignmentsResult.error;
        rfps = [];
      } else {
        const rfpIds =
          assignmentsResult.data?.map((a: any) => a.rfp_id) || [];

        console.log("RFP IDs extracted:", rfpIds);

        if (rfpIds.length === 0) {
          // User has no assignments
          rfps = [];
        } else {
          // Step 2: Get the actual RFP data for assigned RFPs in this organization
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

          console.log("Non-admin RFP query result:", {
            data: rfpsResult.data,
            error: rfpsResult.error,
          });

          rfps = rfpsResult.data;
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
        rfps: rfps || [],
        total: rfps?.length || 0,
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
