"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import type {
  PDFAnnotation,
  CreateAnnotationDTO,
  UpdateAnnotationDTO,
} from "../types/annotation.types";

export function usePDFAnnotations(
  documentId: string | null,
  organizationId: string,
) {
  const queryClient = useQueryClient();

  // Récupérer les annotations d'un document
  const {
    data: annotations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pdf-annotations", documentId],
    queryFn: async () => {
      if (!documentId) return [];

      const { data, error } = await supabase
        .from("pdf_annotations")
        .select("*")
        .eq("document_id", documentId)
        .is("deleted_at", null)
        .order("page_number", { ascending: true });

      if (error) throw error;
      return data as PDFAnnotation[];
    },
    enabled: !!documentId,
  });

  // Créer une annotation
  const createAnnotation = useMutation({
    mutationFn: async (dto: CreateAnnotationDTO) => {
      const { data, error } = await supabase.rpc(
        "create_annotation_with_context",
        {
          p_organization_id: organizationId,
          p_document_id: dto.documentId,
          p_requirement_id: dto.requirementId || null,
          p_annotation_type: dto.annotationType,
          p_page_number: dto.pageNumber,
          p_position: dto.position as any, // JSONB
          p_highlighted_text: dto.highlightedText || null,
          p_note_content: dto.noteContent || null,
          p_color: dto.color || "#FFEB3B",
        },
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pdf-annotations", documentId],
      });
    },
  });

  // Supprimer une annotation (soft delete)
  const deleteAnnotation = useMutation({
    mutationFn: async (annotationId: string) => {
      const { error } = await supabase
        .from("pdf_annotations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", annotationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pdf-annotations", documentId],
      });
    },
  });

  // Mettre à jour une annotation
  const updateAnnotation = useMutation({
    mutationFn: async (dto: UpdateAnnotationDTO) => {
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (dto.noteContent !== undefined)
        updateData.note_content = dto.noteContent;
      if (dto.color !== undefined) updateData.color = dto.color;
      if (dto.tags !== undefined) updateData.tags = dto.tags;

      const { error } = await supabase
        .from("pdf_annotations")
        .update(updateData)
        .eq("id", dto.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pdf-annotations", documentId],
      });
    },
  });

  return {
    annotations: annotations || [],
    isLoading,
    error,
    createAnnotation: createAnnotation.mutate,
    deleteAnnotation: deleteAnnotation.mutate,
    updateAnnotation: updateAnnotation.mutate,
    isCreating: createAnnotation.isPending,
    isDeleting: deleteAnnotation.isPending,
    isUpdating: updateAnnotation.isPending,
  };
}
