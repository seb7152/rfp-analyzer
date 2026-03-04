/**
 * Vertex AI Search Index Management
 *
 * Handles automatic index updates when documents are uploaded to GCS.
 * Uses INCREMENTAL import mode to add new documents to the existing index.
 */

interface VertexMetadataEntry {
  id: string;
  structData: {
    supplier_id: string;
    rfp_id: string;
    organization_id: string;
    document_type: string;
    filename: string;
  };
  content: {
    mimeType: string;
    uri: string;
  };
}

interface UpdateIndexParams {
  documentId: string;
  supplierId: string;
  rfpId: string;
  organizationId: string;
  documentType: string;
  filename: string;
  gcsObjectName: string;
}

/**
 * Update Vertex AI Search index with a new document
 *
 * This function:
 * 1. Generates a JSONL entry for the document
 * 2. Uploads it to GCS (temp location)
 * 3. Triggers an INCREMENTAL import into Vertex AI Search
 * 4. Cleans up the temp JSONL file
 *
 * @param params - Document metadata for indexing
 * @returns Promise<void>
 */
export async function updateVertexAIIndex(
  params: UpdateIndexParams
): Promise<void> {
  const {
    documentId,
    supplierId,
    rfpId,
    organizationId,
    documentType,
    filename,
    gcsObjectName,
  } = params;

  const projectNumber = process.env.GCP_VERTEX_AI_PROJECT_NUMBER;
  const dataStoreId = process.env.GCP_VERTEX_AI_DATA_STORE_ID;
  const bucketName = process.env.GCP_BUCKET_NAME || "rfps-documents";
  const quotaProject = process.env.GCP_PROJECT_ID;

  if (!projectNumber || !dataStoreId || !quotaProject) {
    console.error("[Vertex AI] Missing required environment variables");
    throw new Error(
      "GCP_VERTEX_AI_PROJECT_NUMBER, GCP_VERTEX_AI_DATA_STORE_ID, and GCP_PROJECT_ID are required"
    );
  }

  // 1. Generate JSONL entry for this document
  const gcsUri = `gs://${bucketName}/${gcsObjectName}`;

  const entry: VertexMetadataEntry = {
    id: `${documentId}-${supplierId}`,
    structData: {
      supplier_id: supplierId,
      rfp_id: rfpId,
      organization_id: organizationId,
      document_type: documentType,
      filename,
    },
    content: {
      mimeType: "application/pdf",
      uri: gcsUri,
    },
  };

  const jsonlContent = JSON.stringify(entry);

  // 2. Upload JSONL to temp location in GCS
  const timestamp = Date.now();
  const tempJsonlPath = `vertex-metadata/incremental/${documentId}-${supplierId}-${timestamp}.jsonl`;
  const tempJsonlUri = `gs://${bucketName}/${tempJsonlPath}`;

  try {
    const { Storage } = await import("@google-cloud/storage");
    const { getGCSClient } = await import("@/lib/gcs");

    const storage = getGCSClient();
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(tempJsonlPath);

    await file.save(jsonlContent, {
      contentType: "application/jsonl",
      metadata: {
        cacheControl: "no-cache",
      },
    });

    console.log(`[Vertex AI] JSONL uploaded to ${tempJsonlUri}`);

    // 3. Trigger INCREMENTAL import via Discovery Engine API
    const importUrl = `https://discoveryengine.googleapis.com/v1/projects/${projectNumber}/locations/global/collections/default_collection/dataStores/${dataStoreId}/branches/0/documents:import`;

    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
      throw new Error("Failed to get GCP access token");
    }

    const importRequest = {
      reconciliationMode: "INCREMENTAL",
      gcsSource: {
        inputUris: [tempJsonlUri],
        dataSchema: "document",
      },
    };

    const response = await fetch(importUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
        "X-Goog-User-Project": quotaProject,
      },
      body: JSON.stringify(importRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Vertex AI] Import failed: ${errorText}`);
      throw new Error(`Vertex AI import failed: ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`[Vertex AI] Import triggered successfully:`, result.name);

    // 4. Optional: Clean up temp JSONL file after a delay
    // We wait a bit to ensure Vertex AI has time to read it
    setTimeout(async () => {
      try {
        await file.delete();
        console.log(`[Vertex AI] Cleaned up temp JSONL: ${tempJsonlPath}`);
      } catch (cleanupError) {
        console.error(
          `[Vertex AI] Failed to cleanup temp JSONL:`,
          cleanupError
        );
        // Non-critical error, don't throw
      }
    }, 5 * 60 * 1000); // 5 minutes delay
  } catch (error) {
    console.error("[Vertex AI] Index update failed:", error);
    // Don't throw - this is a non-critical operation
    // The document upload should succeed even if indexing fails
    // We can run the batch re-index script later if needed
  }
}

/**
 * Remove a document from Vertex AI Search index
 *
 * Called when a document is deleted (soft delete in database).
 * Uses the DELETE operation to remove all entries associated with this document.
 *
 * @param documentId - Document UUID
 * @param supplierIds - Array of supplier IDs associated with this document
 */
export async function removeFromVertexAIIndex(
  documentId: string,
  supplierIds: string[]
): Promise<void> {
  const projectNumber = process.env.GCP_VERTEX_AI_PROJECT_NUMBER;
  const dataStoreId = process.env.GCP_VERTEX_AI_DATA_STORE_ID;
  const quotaProject = process.env.GCP_PROJECT_ID;

  if (!projectNumber || !dataStoreId || !quotaProject) {
    console.error("[Vertex AI] Missing required environment variables");
    return; // Silent fail - non-critical
  }

  try {
    const { GoogleAuth } = await import("google-auth-library");
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    if (!accessToken.token) {
      throw new Error("Failed to get GCP access token");
    }

    // Delete each document-supplier combination
    for (const supplierId of supplierIds) {
      const docId = `${documentId}-${supplierId}`;
      const deleteUrl = `https://discoveryengine.googleapis.com/v1/projects/${projectNumber}/locations/global/collections/default_collection/dataStores/${dataStoreId}/branches/0/documents/${docId}`;

      const response = await fetch(deleteUrl, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken.token}`,
          "X-Goog-User-Project": quotaProject,
        },
      });

      if (response.ok) {
        console.log(`[Vertex AI] Deleted document from index: ${docId}`);
      } else {
        // Document might not exist in index yet, that's ok
        console.log(
          `[Vertex AI] Document not found in index (may not have been indexed yet): ${docId}`
        );
      }
    }
  } catch (error) {
    console.error("[Vertex AI] Index removal failed:", error);
    // Non-critical error, don't throw
  }
}
