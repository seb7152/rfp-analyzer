import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * GET /api/documents/[documentId]/annotations
 * Récupère toutes les annotations d'un document
 */
export async function GET(
  _request: Request,
  { params }: { params: { documentId: string } },
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

    // Récupérer les annotations du document
    const { data: annotations, error } = await supabase
      .from("annotation_details") // Utiliser la vue pour avoir toutes les infos
      .select("*")
      .eq("document_id", params.documentId)
      .order("page_number", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching annotations:", error);
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

/**
 * POST /api/documents/[documentId]/annotations
 * Crée une nouvelle annotation
 */
export async function POST(
  request: Request,
  { params }: { params: { documentId: string } },
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

    const body = await request.json();

    // Récupérer l'organization_id de l'utilisateur
    const { data: orgMember } = await supabase
      .from("user_organizations")
      .select("organization_id")
      .eq("user_id", user.id)
      .single();

    if (!orgMember) {
      return NextResponse.json(
        { error: "Organisation non trouvée" },
        { status: 404 },
      );
    }

    // Créer l'annotation via la fonction RPC
    const { data, error } = await supabase.rpc(
      "create_annotation_with_context",
      {
        p_organization_id: orgMember.organization_id,
        p_document_id: params.documentId,
        p_requirement_id: body.requirementId || null,
        p_annotation_type: body.annotationType,
        p_page_number: body.pageNumber,
        p_position: body.position,
        p_highlighted_text: body.highlightedText || null,
        p_note_content: body.noteContent || null,
        p_color: body.color || "#FFEB3B",
      },
    );

    if (error) {
      console.error("Error creating annotation:", error);
      return NextResponse.json(
        { error: "Erreur lors de la création de l'annotation" },
        { status: 500 },
      );
    }

    return NextResponse.json({ id: data }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 },
    );
  }
}
