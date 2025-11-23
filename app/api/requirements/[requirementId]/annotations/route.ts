import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/requirements/[requirementId]/annotations
 * Récupère toutes les annotations liées à une exigence
 */
export async function GET(
  _request: Request,
  { params }: { params: { requirementId: string } },
) {
  try {
    const supabase = await createClient();

    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { searchParams } = new URL(_request.url);
    const supplierId = searchParams.get("supplierId");

    // Récupérer les annotations de l'exigence
    let query = supabase
      .from("annotation_details")
      .select("*")
      .eq("requirement_id", params.requirementId)
      .eq("annotation_type", "bookmark"); // On ne veut que les signets pour le moment

    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }

    const { data: annotations, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching requirement annotations:", error);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des annotations" },
        { status: 500 },
      );
    }

    return NextResponse.json(annotations);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
