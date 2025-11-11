import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    if (!rfpId) {
      return NextResponse.json({ error: "RFP ID is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier que l'utilisateur a accès à l'organisation du RFP
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("organization_id")
      .eq("id", rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    const { data: userOrg, error: userOrgError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (userOrgError || !userOrg) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Seuls les admins peuvent modifier les poids
    if (userOrg.role !== "admin") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { categories, requirements } = body;

    if (!categories || !requirements) {
      return NextResponse.json(
        { error: "Categories and weights are required" },
        { status: 400 }
      );
    }

    // Mettre à jour les poids des catégories
    const categoryUpdates = Object.entries(categories).map(([id, weight]) => ({
      id,
      weight,
    }));

    if (categoryUpdates.length > 0) {
      const { error: categoryError } = await supabase.rpc(
        "update_category_weights",
        {
          category_updates: categoryUpdates,
        }
      );

      if (categoryError) {
        console.error("Error updating category weights:", categoryError);
        // Fallback: mise à jour individuelle
        for (const [id, weight] of Object.entries(categories)) {
          await supabase
            .from("categories")
            .update({ weight })
            .eq("id", id);
        }
      }
    }

    // Mettre à jour les poids des exigences
    const requirementUpdates = Object.entries(requirements).map(([id, weight]) => ({
      id,
      weight,
    }));

    if (requirementUpdates.length > 0) {
      const { error: requirementError } = await supabase.rpc(
        "update_requirement_weights",
        {
          requirement_updates: requirementUpdates,
        }
      );

      if (requirementError) {
        console.error("Error updating requirement weights:", requirementError);
        // Fallback: mise à jour individuelle
        for (const [id, weight] of Object.entries(requirements)) {
          await supabase
            .from("requirements")
            .update({ weight })
            .eq("id", id);
        }
      }
    }

    return NextResponse.json(
      { message: "Weights updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating weights:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}