import { useState, useCallback } from "react";
import { createFileChunks, shouldUseChunkedUpload } from "@/lib/fileChunking";

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
  currentChunk?: number;
  totalChunks?: number;
}

export function useRFPDocumentUpload(rfpId: string) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  const uploadChunkedDocument = useCallback(
    async (
      file: File,
      documentType: string,
      supplierId?: string
    ) => {
      const documentId = `upload-${Date.now()}`;

      // Initialize progress tracking
      setUploadProgress((prev) => [
        ...prev,
        {
          documentId,
          filename: file.name,
          progress: 0,
          status: "uploading",
          currentChunk: 0,
          totalChunks: 0,
        },
      ]);

      try {
        // Step 1: Request upload intent
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.documentId === documentId ? { ...p, progress: 5 } : p
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
          throw new Error(errorData.error || "Failed to get upload intent");
        }

        const { documentId: actualId, objectName } =
          await intentResponse.json();

        // Step 2: Create chunks and upload them
        const chunks = createFileChunks(file);
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.documentId === documentId
              ? {
                  ...p,
                  documentId: actualId,
                  totalChunks: chunks.length,
                  currentChunk: 0,
                }
              : p
          )
        );

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];

          // Upload chunk
          const formData = new FormData();
          formData.append("chunk", chunk.data);
          formData.append("index", chunk.index.toString());
          formData.append("total", chunk.total.toString());
          formData.append("filename", file.name);
          formData.append("documentId", actualId);
          formData.append("objectName", objectName);

          const chunkResponse = await fetch(
            `/api/rfps/${rfpId}/documents/upload-chunk`,
            {
              method: "POST",
              body: formData,
            }
          );

          if (!chunkResponse.ok) {
            const errorData = await chunkResponse.json();
            throw new Error(
              errorData.error || `Failed to upload chunk ${i + 1}/${chunks.length}`
            );
          }

          // Update progress
          const progressPercentage = Math.round(
            ((i + 1) / chunks.length) * 75 + 5
          );
          setUploadProgress((prev) =>
            prev.map((p) =>
              p.documentId === actualId
                ? {
                    ...p,
                    progress: progressPercentage,
                    currentChunk: i + 1,
                  }
                : p
            )
          );
        }

        // Step 3: Commit the upload (save metadata to database)
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.documentId === actualId
              ? { ...p, progress: 85, status: "committing" }
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
              supplierId: supplierId || null,
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

  const uploadDocument = useCallback(
    async (
      file: File,
      documentType: string = "cahier_charges",
      supplierId?: string
    ) => {
      // Use chunked upload for files larger than 4MB
      if (shouldUseChunkedUpload(file)) {
        return uploadChunkedDocument(file, documentType, supplierId);
      }

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
          throw new Error(errorData.error || "Failed to get upload intent");
        }

        const { documentId: actualId, objectName } =
          await intentResponse.json();

        // Step 2: Upload file to backend which handles GCS upload
        setUploadProgress((prev) =>
          prev.map((p) =>
            p.documentId === documentId
              ? { ...p, progress: 30, documentId: actualId }
              : p
          )
        );

        const uploadFormData = new FormData();
        uploadFormData.append("file", file);
        uploadFormData.append("documentId", actualId);
        uploadFormData.append("objectName", objectName);

        const uploadResponse = await fetch(
          `/api/rfps/${rfpId}/documents/upload`,
          {
            method: "POST",
            body: uploadFormData,
          }
        );

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(
            errorData.error || "Failed to upload file to cloud storage"
          );
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
              supplierId: supplierId || null,
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
    [rfpId, uploadChunkedDocument]
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
    clearProgress,
    removeProgressItem,
  };
}
