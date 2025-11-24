import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * PUT /api/documents/[documentId]/annotations/[annotationId]
 * Met à jour une annotation existante
 */
export async function PUT(
  request: Request,
  { params }: { params: { documentId: string; annotationId: string } }
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

    // Construire l'objet de mise à jour
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.noteContent !== undefined)
      updateData.note_content = body.noteContent;
    if (body.color !== undefined) updateData.color = body.color;
    if (body.tags !== undefined) updateData.tags = body.tags;
    if (body.position !== undefined) updateData.position = body.position;

    // Mettre à jour l'annotation
    // RLS s'assure que l'utilisateur ne peut modifier que ses propres annotations
    const { data, error } = await supabase
      .from("pdf_annotations")
      .update(updateData)
      .eq("id", params.annotationId)
      .eq("created_by", user.id) // S'assurer que c'est l'auteur
      .select()
      .single();

    if (error) {
      console.error("Error updating annotation:", error);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour de l'annotation" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Annotation non trouvée ou non autorisée" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/documents/[documentId]/annotations/[annotationId]
 * Supprime (soft delete) une annotation
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { documentId: string; annotationId: string } }
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

    // Soft delete de l'annotation
    // RLS s'assure que l'utilisateur ne peut supprimer que ses propres annotations
    const { data, error } = await supabase
      .from("pdf_annotations")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", params.annotationId)
      .eq("created_by", user.id) // S'assurer que c'est l'auteur
      .select()
      .single();

    if (error) {
      console.error("Error deleting annotation:", error);
      return NextResponse.json(
        { error: "Erreur lors de la suppression de l'annotation" },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Annotation non trouvée ou non autorisée" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
