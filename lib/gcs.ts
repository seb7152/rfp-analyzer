import { Storage } from "@google-cloud/storage";

const projectId = process.env.GCP_PROJECT_ID;
const keyFilePath = process.env.GCP_KEY_FILE_PATH;

if (!projectId) {
  throw new Error("GCP_PROJECT_ID environment variable is not set");
}

/**
 * Lazy load GCS client
 * Uses Application Default Credentials if no key file is provided
 */
let gcsInstance: Storage | null = null;

export function getGCSClient(): Storage {
  if (gcsInstance) {
    return gcsInstance;
  }

  const options: any = {
    projectId,
  };

  // If key file path is provided, use it
  // Otherwise, use Application Default Credentials (for Vercel/deployment)
  if (keyFilePath) {
    options.keyFilename = keyFilePath;
  }

  gcsInstance = new Storage(options);
  return gcsInstance;
}

/**
 * Get reference to RFP documents bucket
 */
export function getRFPDocumentsBucket() {
  const bucketName = process.env.GCP_BUCKET_NAME || "rfp-analyzer-storage";
  const storage = getGCSClient();
  return storage.bucket(bucketName);
}

/**
 * Generate a V4 signed URL for file upload
 * @param bucketName - GCS bucket name
 * @param objectName - Full object path in bucket
 * @param expiresIn - Expiration time in milliseconds (default: 90 seconds)
 * @returns Signed URL for upload
 */
export async function generateUploadSignedUrl(
  objectName: string,
  expiresIn: number = 90 * 1000 // 90 seconds
): Promise<string> {
  const bucket = getRFPDocumentsBucket();
  const file = bucket.file(objectName);

  // Generate V4 signed URL for upload (PUT method)
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + expiresIn,
  });

  return url;
}

/**
 * Generate a V4 signed URL for file download/view
 * @param objectName - Full object path in bucket
 * @param expiresIn - Expiration time in milliseconds (default: 90 seconds)
 * @returns Signed URL for download
 */
export async function generateDownloadSignedUrl(
  objectName: string,
  expiresIn: number = 90 * 1000 // 90 seconds
): Promise<string> {
  const bucket = getRFPDocumentsBucket();
  const file = bucket.file(objectName);

  // Generate V4 signed URL for download (GET method)
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + expiresIn,
  });

  return url;
}

/**
 * Check if a file exists in GCS
 * @param objectName - Full object path in bucket
 * @returns Boolean indicating if file exists
 */
export async function fileExists(objectName: string): Promise<boolean> {
  const bucket = getRFPDocumentsBucket();
  const file = bucket.file(objectName);

  try {
    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error(`Error checking if file exists ${objectName}:`, error);
    return false;
  }
}

/**
 * Delete a file from GCS
 * @param objectName - Full object path in bucket
 */
export async function deleteFile(objectName: string): Promise<void> {
  const bucket = getRFPDocumentsBucket();
  const file = bucket.file(objectName);

  try {
    await file.delete();
    console.log(`[GCS] Deleted file: ${objectName}`);
  } catch (error) {
    console.error(`Error deleting file ${objectName}:`, error);
    throw error;
  }
}

/**
 * Get file metadata from GCS
 * @param objectName - Full object path in bucket
 * @returns File metadata including size, content type, etc.
 */
export async function getFileMetadata(objectName: string) {
  const bucket = getRFPDocumentsBucket();
  const file = bucket.file(objectName);

  try {
    const [metadata] = await file.getMetadata();
    // Ensure size is a number (GCS may return it as a string)
    return {
      ...metadata,
      size: parseInt(metadata.size as any, 10),
    };
  } catch (error) {
    console.error(`Error getting file metadata for ${objectName}:`, error);
    throw error;
  }
}
