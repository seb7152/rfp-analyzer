/**
 * Utility for resolving import data from a file_url or file_content,
 * as an alternative to passing inline arrays in MCP bulk import tools.
 *
 * Supported sources:
 *   - file_url  : HTTPS URL fetched server-side (e.g. GCS signed URL, any HTTPS endpoint)
 *   - file_content : Raw text content (JSON string or CSV) passed directly
 *
 * Supported formats:
 *   - "json"  : JSON array or object with a data array at a known key
 *   - "auto"  : detect from Content-Type header (for URL) or by attempting JSON parse
 */

/** Max file size accepted (bytes). Prevents runaway downloads. */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Timeout for URL fetches (ms). */
const FETCH_TIMEOUT_MS = 15_000;

/**
 * Fetch raw text from an HTTPS URL.
 * Throws on non-HTTPS, HTTP errors, or oversized responses.
 */
export async function fetchFileFromUrl(url: string): Promise<{ text: string; contentType: string }> {
  if (!url.startsWith("https://")) {
    throw new Error("file_url must use HTTPS");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err: any) {
    throw new Error(`Failed to fetch file_url: ${err?.message ?? String(err)}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`file_url returned HTTP ${response.status}: ${response.statusText}`);
  }

  // Guard against oversized responses
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `file_url response too large (${contentLength} bytes, max ${MAX_FILE_SIZE_BYTES})`
    );
  }

  const text = await response.text();
  if (text.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File content too large (${text.length} chars, max ${MAX_FILE_SIZE_BYTES})`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  return { text, contentType };
}

/**
 * Parse raw text content into an array of objects.
 *
 * Supports:
 *   - JSON array:   [...] → returned as-is
 *   - JSON object:  { "requirements": [...] } → extracts first array value found
 *                   { "categories": [...] }
 *                   { "responses": [...] }
 *                   { "data": [...] }
 */
export function parseJsonImportContent(text: string): unknown[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("file content is not valid JSON");
  }

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === "object") {
    // Try known wrapper keys in priority order
    const knownKeys = ["requirements", "categories", "responses", "data", "items"];
    for (const key of knownKeys) {
      const value = (parsed as Record<string, unknown>)[key];
      if (Array.isArray(value)) {
        return value;
      }
    }
    // Fallback: try the first array-valued property
    for (const value of Object.values(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        return value;
      }
    }
  }

  throw new Error(
    "file content must be a JSON array or an object containing a 'requirements', 'categories', or 'responses' array"
  );
}

/**
 * Resolve an array of import records from either:
 *   1. An already-provided inline array (existing behavior, returned as-is)
 *   2. A file_url (fetched server-side)
 *   3. A file_content string (raw text)
 *
 * Exactly one of `inlineData`, `file_url`, or `file_content` must be provided.
 */
export async function resolveImportData(params: {
  inlineData?: unknown[];
  file_url?: string;
  file_content?: string;
}): Promise<unknown[]> {
  const { inlineData, file_url, file_content } = params;

  if (inlineData && inlineData.length > 0) {
    return inlineData;
  }

  if (file_url) {
    const { text } = await fetchFileFromUrl(file_url);
    return parseJsonImportContent(text);
  }

  if (file_content) {
    return parseJsonImportContent(file_content);
  }

  throw new Error(
    "No import data provided. Supply one of: inline data array, file_url, or file_content."
  );
}
