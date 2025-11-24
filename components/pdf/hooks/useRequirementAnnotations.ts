"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { PDFAnnotation } from "../types/annotation.types";

// Helper pour mapper les champs snake_case -> camelCase (dupliqué de usePDFAnnotations pour l'instant)
const mapAnnotationFromDB = (
  raw: any
): PDFAnnotation & { documentName?: string } => ({
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
  documentName: raw.document_name, // Supposant que la vue annotation_details contient le nom du document
});

export function useRequirementAnnotations(requirementId: string) {
  const {
    data: annotations,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["requirement-annotations", requirementId],
    queryFn: async () => {
      if (!requirementId) return [];

      try {
        const response = await fetch(
          `/api/requirements/${requirementId}/annotations`,
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
        return (data as any[]).map(mapAnnotationFromDB);
      } catch (err) {
        console.error("[useRequirementAnnotations] Error fetching:", err);
        throw err;
      }
    },
    enabled: !!requirementId,
  });

  const queryClient = useQueryClient();

  const deleteAnnotation = useMutation({
    mutationFn: async (annotation: { id: string; documentId: string }) => {
      const response = await fetch(
        `/api/documents/${annotation.documentId}/annotations/${annotation.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete annotation");
      }

      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["requirement-annotations", requirementId],
      });
      // Also invalidate the document specific annotations if needed
      queryClient.invalidateQueries({
        queryKey: ["pdf-annotations"],
      });
    },
  });

  return {
    annotations: annotations || [],
    isLoading,
    error,
    deleteAnnotation: deleteAnnotation.mutate,
    isDeleting: deleteAnnotation.isPending,
  };
}
