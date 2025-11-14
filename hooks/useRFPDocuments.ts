import { useState, useEffect } from "react";

export interface RFPDocument {
  id: string;
  filename: string;
  original_filename: string;
  document_type: string;
  mime_type: string;
  file_size: number;
  created_by: string;
  created_at: string;
  page_count?: number;
}

export function useRFPDocuments(rfpId: string) {
  const [documents, setDocuments] = useState<RFPDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/rfps/${rfpId}/documents`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch documents");
      }

      const data = await response.json();
      setDocuments(data.documents || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("Error fetching documents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [rfpId]);

  const deleteDocument = async (documentId: string) => {
    try {
      const response = await fetch(
        `/api/rfps/${rfpId}/documents?documentId=${documentId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete document");
      }

      // Remove from local state
      setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error("Error deleting document:", err);
      throw new Error(errorMessage);
    }
  };

  const refreshDocuments = () => {
    fetchDocuments();
  };

  return {
    documents,
    isLoading,
    error,
    deleteDocument,
    refreshDocuments,
  };
}
