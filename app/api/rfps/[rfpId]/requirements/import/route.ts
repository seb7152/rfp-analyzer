import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  importRequirements,
  importSuppliers,
  getCategories,
} from "@/lib/supabase/queries";
import { validateRequirementsJSON } from "@/lib/supabase/validators";
import type { ImportRequirementsRequest, Category } from "@/lib/supabase/types";

export async function POST(
  _request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    // Get authenticated user
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get request body
    const body = await _request.json();

    // Validate JSON format
    if (typeof body.json !== "string") {
      return NextResponse.json(
        { error: "Missing 'json' field in request body" },
        { status: 400 }
      );
    }

    // Check user has access to RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("id, organization_id")
      .eq("id", params.rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Verify user is part of the organization
    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get available categories
    const categories = await getCategories(params.rfpId);
    const categoryNames = (categories as unknown as Category[]).map(
      (c) => c.title
    );

    // Validate JSON format
    const validation = validateRequirementsJSON(body.json, categoryNames);
    if (!validation.valid) {
      console.error("Requirements validation failed:", validation.error);
      console.error("Available categories:", categoryNames);
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const data = validation.data as ImportRequirementsRequest;
    console.log("Requirements import - parsed data:", {
      requirementsCount: data.requirements.length,
      suppliersCount: data.suppliers?.length || 0,
    });

    // Import suppliers if provided
    let suppliersCount = 0;
    if (data.suppliers && data.suppliers.length > 0) {
      const supplierResult = await importSuppliers(
        params.rfpId,
        data.suppliers
      );
      suppliersCount = supplierResult.count;
    }

    // Import requirements (filter out any without id)
    const validRequirements = data.requirements.filter(
      (req: any) => req.id
    ) as Array<{
      id: string;
      code?: string;
      title: string;
      description: string;
      weight: number;
      category_name: string;
      is_mandatory?: boolean;
      is_optional?: boolean;
      order?: number;
    }>;
    const requirementsResult = await importRequirements(
      params.rfpId,
      validRequirements,
      user.id
    );

    if (!requirementsResult.success) {
      return NextResponse.json(
        {
          error: requirementsResult.error,
          count: requirementsResult.count,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported ${requirementsResult.count} requirements and ${suppliersCount} suppliers`,
        requirements: requirementsResult.count,
        suppliers: suppliersCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Requirements import error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
