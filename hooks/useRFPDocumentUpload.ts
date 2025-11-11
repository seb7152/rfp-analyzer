import { useState, useCallback } from "react";

export interface UploadedDocument {
  id: string;
  rfp_id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  document_type: string;
  uploaded_at: string;
}

export interface UploadProgress {
  documentId: string;
  filename: string;
  progress: number;
  status: "idle" | "uploading" | "committing" | "success" | "error";
  error?: string;
}

export function useRFPDocumentUpload(rfpId: string) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const uploadDocument = useCallback(
    async (file: File, documentType: string = "cahier_charges") => {
      const documentId = `upload-${Date.now()}`;

      // Initialize progress tracking
      setUploadProgress((prev) => [
        ...prev,
        {
          documentId,
          filename: file.name,
          progress: 0,
          status: "uploading",
        },
      ]);

      try {
        // Step 1: Request upload intent
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.documentId === documentId ? { ...p, progress: 10 } : p
          )
        );

        const intentResponse = await fetch(
          `/api/rfps/${rfpId}/documents/upload-intent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              mimeType: file.type,
              fileSize: file.size,
              documentType,
            }),
          }
        );

        if (!intentResponse.ok) {
          const errorData = await intentResponse.json();
          throw new Error(
            errorData.error || "Failed to get upload intent"
          );
        }

        const { uploadUrl, documentId: actualId, objectName } =
          await intentResponse.json();

        // Step 2: Upload file directly to GCS
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.documentId === documentId
              ? { ...p, progress: 30, documentId: actualId }
              : p
          )
        );

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error("Failed to upload file to cloud storage");
        }

        // Step 3: Commit the upload (save metadata to database)
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.documentId === actualId
              ? { ...p, progress: 80, status: "committing" }
              : p
          )
        );

        const commitResponse = await fetch(
          `/api/rfps/${rfpId}/documents/commit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentId: actualId,
              objectName,
              filename: file.name,
              originalFilename: file.name,
              mimeType: file.type,
              fileSize: file.size,
              documentType,
            }),
          }
        );

        if (!commitResponse.ok) {
          const errorData = await commitResponse.json();
          throw new Error(errorData.error || "Failed to commit upload");
        }

        const { document } = await commitResponse.json();

        // Mark as success
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.documentId === actualId
              ? {
                  ...p,
                  progress: 100,
                  status: "success",
                }
              : p
          )
        );

        return document as UploadedDocument;
      } catch (error) {
        // Mark as error
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.documentId === documentId
              ? { ...p, progress: 0, status: "error", error: errorMessage }
              : p
          )
        );

        throw error;
      }
    },
    [rfpId]
  );

  const clearProgress = useCallback(() => {
    setUploadProgress([]);
  }, []);

  const removeProgressItem = useCallback((documentId: string) => {
    setUploadProgress((prev) =>
      prev.filter((p) => p.documentId !== documentId)
    );
  }, []);

  return {
    uploadDocument,
    uploadProgress,
    isLoading,
    clearProgress,
    removeProgressItem,
  };
}
