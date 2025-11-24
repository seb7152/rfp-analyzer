"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import type { Requirement } from "@/lib/supabase/types";

export interface RequirementDocument {
  id: string;
  filename: string;
  original_filename: string;
  mime_type: string;
}

export interface UseRequirementDocumentReturn {
  isLoadingDocuments: boolean;
  availableDocuments: RequirementDocument[];
  showDocumentSelector: boolean;
  selectedDocumentId: string | null;
  selectDocument: (documentId: string) => Promise<void>;
  dismissDocumentSelector: () => void;
  openDocumentWithPage: (
    requirement: Requirement,
    documents: RequirementDocument[]
  ) => Promise<void>;
}

/**
 * Hook to manage document selection and linking for requirements
 * Handles the case where multiple 'cahier_charges' documents exist
 * and the user needs to select which one to link with the requirement
 */
export function useRequirementDocument(
  rfpId: string | null
): UseRequirementDocumentReturn {
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [availableDocuments, setAvailableDocuments] = useState<
    RequirementDocument[]
  >([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );

  // Fetch cahier_charges documents for this RFP
  const fetchDocuments = useCallback(async () => {
    if (!rfpId) return;

    setIsLoadingDocuments(true);
    try {
      const supabase = await createBrowserClient();
      const { data, error } = await supabase
        .from("rfp_documents")
        .select("id, filename, original_filename, mime_type")
        .eq("rfp_id", rfpId)
        .eq("document_type", "cahier_charges")
        .eq("mime_type", "application/pdf")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch documents:", error);
        return;
      }

      setAvailableDocuments((data || []) as RequirementDocument[]);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [rfpId]);

  // Load documents on mount
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Select and link document to requirement
  const selectDocument = useCallback(
    async (documentId: string) => {
      setSelectedDocumentId(documentId);
      setShowDocumentSelector(false);
    },
    []
  );

  // Dismiss the selector modal
  const dismissDocumentSelector = useCallback(() => {
    setShowDocumentSelector(false);
    setSelectedDocumentId(null);
  }, []);

  // Open document - show selector if multiple docs and requirement has no linked doc
  const openDocumentWithPage = useCallback(
    async (requirement: Requirement, documents: RequirementDocument[]) => {
      // If requirement already has a linked document, use it
      if (requirement.rf_document_id) {
        setSelectedDocumentId(requirement.rf_document_id);
        return;
      }

      // If multiple documents available, show selector
      if (documents.length > 1) {
        setShowDocumentSelector(true);
        return;
      }

      // If only one document, use it directly
      if (documents.length === 1) {
        setSelectedDocumentId(documents[0].id);
        return;
      }

      // No documents available
      console.warn("No documents available for this RFP");
    },
    []
  );

  return {
    isLoadingDocuments,
    availableDocuments,
    showDocumentSelector,
    selectedDocumentId,
    selectDocument,
    dismissDocumentSelector,
    openDocumentWithPage,
  };
}
