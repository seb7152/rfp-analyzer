/**
 * MCP Tool: get_import_command
 *
 * Returns a ready-to-run curl command that uploads a local JSON file directly
 * to the /api/mcp/import-file endpoint — without loading the file content into
 * the agent's context.
 *
 * Intended flow:
 *   1. Agent runs a Python/script that produces a JSON file on disk.
 *   2. Agent calls get_import_command() → gets a curl command string.
 *   3. Agent executes the curl via Bash tool.
 *   4. File bytes go: disk → curl → server. Never touch the agent's context.
 *
 * The auth token is referenced as the $MCP_API_TOKEN env var so that it never
 * appears in the command string that enters the agent's context.
 */

import type { MCPAuthContext } from "@/lib/mcp/auth";

export interface GetImportCommandInput {
  rfp_id: string;
  import_type: "structure" | "requirements" | "supplier_responses";
  mode?: "append" | "replace";
  /** Required when import_type = supplier_responses */
  supplier_id?: string;
  /** Required when import_type = supplier_responses and supplier_id is absent */
  supplier_name?: string;
  /** Optional evaluation version ID (supplier_responses only) */
  version_id?: string;
  /** Optional: local file path to plug into the curl command */
  file_path?: string;
}

export interface GetImportCommandOutput {
  /** Full URL with query params, ready to POST to */
  endpoint_url: string;
  /** Ready-to-run curl command — execute with the Bash tool */
  curl_command: string;
  note: string;
}

export function handleGetImportCommand(
  input: GetImportCommandInput,
  _authContext: MCPAuthContext
): GetImportCommandOutput {
  // Resolve base URL from environment
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    "http://localhost:3000";

  // Build query string
  const params = new URLSearchParams({
    rfp_id: input.rfp_id,
    type: input.import_type,
  });
  if (input.mode && input.mode !== "append") params.set("mode", input.mode);
  if (input.supplier_id) params.set("supplier_id", input.supplier_id);
  if (input.supplier_name) params.set("supplier_name", input.supplier_name);
  if (input.version_id) params.set("version_id", input.version_id);

  const endpointUrl = `${appUrl}/api/mcp/import-file?${params.toString()}`;
  const filePlaceholder = input.file_path ?? "/path/to/your/file.json";

  const curlCommand = [
    `curl -X POST '${endpointUrl}'`,
    `  -H 'Authorization: Bearer ${authContext.rawToken}'`,
    `  -H 'Content-Type: application/json'`,
    `  --data-binary @${filePlaceholder}`,
  ].join(" \\\n");

  return {
    endpoint_url: endpointUrl,
    curl_command: curlCommand,
    note:
      "Run curl_command using the Bash tool. The file content goes directly from disk to the server and never enters agent context." +
      (input.file_path
        ? ""
        : " Replace /path/to/your/file.json with the actual path of the file produced by your script."),
  };
}
