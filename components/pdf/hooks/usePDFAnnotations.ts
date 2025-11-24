"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  PDFAnnotation,
  CreateAnnotationDTO,
  UpdateAnnotationDTO,
} from "../types/annotation.types";

// Helper pour mapper les champs snake_case -> camelCase
const mapAnnotationFromDB = (raw: any): PDFAnnotation => ({
  id: raw.id,
  organizationId: raw.organization_id,
  documentId: raw.document_id,
  requirementId: raw.requirement_id,
  supplierId: raw.supplier_id,
  annotationType: raw.annotation_type,
  pageNumber: raw.page_number,
  position: raw.position,
  highlightedText: raw.highlighted_text,
  noteContent: raw.note_content,
  color: raw.color,
  tags: raw.tags,
  createdBy: raw.created_by,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at,
});

export function usePDFAnnotations(documentId: string | null) {
  const queryClient = useQueryClient();

  // Récupérer les annotations d'un document via l'API
  const {
    data: annotations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["pdf-annotations", documentId],
    queryFn: async () => {
      if (!documentId) return [];

      try {
        const response = await fetch(
          `/api/documents/${documentId}/annotations`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch annotations");
        }

        const data = await response.json();
        console.log("[usePDFAnnotations] Fetched annotations:", data);

        // Mapper les données depuis la base
        return (data as any[]).map(mapAnnotationFromDB);
      } catch (err) {
        console.error("[usePDFAnnotations] Error fetching:", err);
        throw err;
      }
    },
    enabled: !!documentId,
  });

  // Créer une annotation via l'API
  const createAnnotation = useMutation({
    mutationFn: async (dto: CreateAnnotationDTO) => {
      console.log("[usePDFAnnotations] Creating annotation with DTO:", dto);

      const payload = {
        requirementId: dto.requirementId || null,
        annotationType: dto.annotationType,
        pageNumber: dto.pageNumber,
        position: dto.position,
        highlightedText: dto.highlightedText || null,
        noteContent: dto.noteContent || null,
        color: dto.color || "#FFEB3B",
      };

      console.log("[usePDFAnnotations] Sending payload:", payload);

      const response = await fetch(
        `/api/documents/${dto.documentId}/annotations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      console.log("[usePDFAnnotations] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("[usePDFAnnotations] Error response:", errorData);
        throw new Error(errorData.error || "Failed to create annotation");
      }

      const data = await response.json();
      console.log("[usePDFAnnotations] Created annotation successfully:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pdf-annotations", documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["requirement-annotations"],
      });
    },
  });

  // Supprimer une annotation (soft delete) via l'API
  const deleteAnnotation = useMutation({
    mutationFn: async (annotationId: string) => {
      const response = await fetch(
        `/api/documents/${documentId}/annotations/${annotationId}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete annotation");
      }

      const data = await response.json();
      console.log("[usePDFAnnotations] Deleted annotation:", data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["pdf-annotations", documentId],
      });
      queryClient.invalidateQueries({
        queryKey: ["requirement-annotations"],
      });
    },
  });

  // Mettre à jour une annotation via l'API
  const updateAnnotation = useMutation({
    mutationFn: async (dto: UpdateAnnotationDTO) => {
      const response = await fetch(
        `/api/documents/${documentId}/annotations/${dto.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            noteContent: dto.noteContent,
            color: dto.color,
            tags: dto.tags,
            position: dto.position,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update annotation");
      }

      const data = await response.json();
      console.log("[usePDFAnnotations] Updated annotation:", data);
      return data;
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
