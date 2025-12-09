/**
 * File chunking utilities for large file uploads
 * Splits files into smaller chunks to bypass size limits
 */

const CHUNK_SIZE = 1024 * 1024; // 1MB per chunk

export interface FileChunk {
  data: Blob;
  index: number;
  total: number;
}

/**
 * Splits a file into chunks
 * @param file The file to split
 * @param chunkSize The size of each chunk in bytes (default: 1MB)
 * @returns Array of file chunks with metadata
 */
export function createFileChunks(
  file: File,
  chunkSize: number = CHUNK_SIZE
): FileChunk[] {
  const chunks: FileChunk[] = [];
  const totalChunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < file.size; i += chunkSize) {
    const end = Math.min(i + chunkSize, file.size);
    chunks.push({
      data: file.slice(i, end),
      index: chunks.length,
      total: totalChunks,
    });
  }

  return chunks;
}

/**
 * Determines if a file should be uploaded using chunking
 * @param file The file to check
 * @param threshold Size threshold in bytes (default: 4MB)
 * @returns True if file size exceeds threshold
 */
export function shouldUseChunkedUpload(
  file: File,
  threshold: number = 4 * 1024 * 1024
): boolean {
  return file.size > threshold;
}
