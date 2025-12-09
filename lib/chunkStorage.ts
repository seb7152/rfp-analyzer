/**
 * Chunk storage utilities for handling file upload chunks
 * Manages temporary storage of chunks during upload
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";

/**
 * Get the temporary directory for storing chunks
 * Uses /tmp on Unix-like systems (writable on Vercel)
 * Falls back to system temp directory
 */
function getTempDir(): string {
  // Try /tmp first (works on Linux and Vercel)
  if (fs.existsSync("/tmp")) {
    return path.join("/tmp", "rfp-chunks");
  }
  // Fallback to system temp directory
  return path.join(os.tmpdir(), "rfp-chunks");
}

/**
 * Get the directory for a specific document's chunks
 */
export function getDocumentChunkDir(documentId: string): string {
  return path.join(getTempDir(), documentId);
}

/**
 * Get the path for a specific chunk
 */
export function getChunkPath(documentId: string, index: number): string {
  return path.join(getDocumentChunkDir(documentId), `chunk_${index}`);
}

/**
 * Save a chunk to temporary storage
 */
export async function saveChunk(
  documentId: string,
  index: number,
  data: Buffer
): Promise<void> {
  const chunkDir = getDocumentChunkDir(documentId);

  // Create directory if it doesn't exist
  if (!fs.existsSync(chunkDir)) {
    fs.mkdirSync(chunkDir, { recursive: true });
  }

  const chunkPath = getChunkPath(documentId, index);
  fs.writeFileSync(chunkPath, data);
}

/**
 * Read a chunk from temporary storage
 */
export async function readChunk(
  documentId: string,
  index: number
): Promise<Buffer> {
  const chunkPath = getChunkPath(documentId, index);
  return fs.readFileSync(chunkPath);
}

/**
 * Check if all chunks exist
 */
export function allChunksExist(documentId: string, total: number): boolean {
  for (let i = 0; i < total; i++) {
    const chunkPath = getChunkPath(documentId, i);
    if (!fs.existsSync(chunkPath)) {
      return false;
    }
  }
  return true;
}

/**
 * Assemble chunks into a single buffer
 */
export async function assembleChunks(
  documentId: string,
  total: number
): Promise<Buffer> {
  const buffers: Buffer[] = [];

  for (let i = 0; i < total; i++) {
    const chunkBuffer = await readChunk(documentId, i);
    buffers.push(chunkBuffer);
  }

  return Buffer.concat(buffers);
}

/**
 * Clean up chunks for a document
 */
export async function cleanupChunks(documentId: string): Promise<void> {
  const chunkDir = getDocumentChunkDir(documentId);

  if (fs.existsSync(chunkDir)) {
    fs.rmSync(chunkDir, { recursive: true, force: true });
  }
}

/**
 * Clean up old chunks (older than specified minutes)
 */
export async function cleanupOldChunks(olderThanMinutes: number = 300): Promise<void> {
  const tempDir = getTempDir();

  if (!fs.existsSync(tempDir)) {
    return;
  }

  const now = Date.now();
  const maxAge = olderThanMinutes * 60 * 1000;

  const dirs = fs.readdirSync(tempDir);

  for (const dir of dirs) {
    const dirPath = path.join(tempDir, dir);
    const stats = fs.statSync(dirPath);

    if (now - stats.mtimeMs > maxAge) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  }
}
