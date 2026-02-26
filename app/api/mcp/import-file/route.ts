/**
 * POST /api/mcp/import-file
 *
 * HTTP upload endpoint for bulk imports that keeps the file content out of the
 * agent's context.  Intended to be called via `curl --data-binary @/path/to/file`
 * rather than through a MCP tool call (whose parameters always enter context).
 *
 * Query params:
 *   rfp_id        (required)
 *   type          (required) "structure" | "requirements" | "supplier_responses"
 *   mode          (optional) "append" (default) | "replace"
 *   supplier_id   (optional) UUID — required when type=supplier_responses
 *   supplier_name (optional) name — used when supplier_id is absent
 *   version_id    (optional) evaluation version UUID
 *
 * Body: raw JSON (the file content — never parsed by the agent)
 *
 * Auth: same PAT as the MCP server (Authorization: Bearer rfpa_...)
 *
 * Response: { created, skipped, errors[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateMCPRequest } from "@/lib/mcp/auth";
import { handleImportStructure } from "@/lib/mcp/tools/import-structure";
import { handleImportRequirements } from "@/lib/mcp/tools/import-requirements";
import { handleImportSupplierResponses } from "@/lib/mcp/tools/import-supplier-responses";

const ALLOWED_TYPES = ["structure", "requirements", "supplier_responses"] as const;
type ImportType = (typeof ALLOWED_TYPES)[number];

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authContext = await authenticateMCPRequest(req);
  if (!authContext) {
    return json({ error: "Unauthorized: valid Personal Access Token required" }, 401);
  }

  // ── Query params ──────────────────────────────────────────────────────────
  const sp = req.nextUrl.searchParams;
  const rfp_id = sp.get("rfp_id");
  const type = sp.get("type") as ImportType | null;
  const mode = (sp.get("mode") ?? "append") as "append" | "replace";
  const supplier_id = sp.get("supplier_id") ?? undefined;
  const supplier_name = sp.get("supplier_name") ?? undefined;
  const version_id = sp.get("version_id") ?? undefined;

  if (!rfp_id) {
    return json({ error: "Missing required query param: rfp_id" }, 400);
  }
  if (!type || !ALLOWED_TYPES.includes(type)) {
    return json(
      { error: "Missing or invalid query param: type (structure|requirements|supplier_responses)" },
      400
    );
  }
  if (!["append", "replace"].includes(mode)) {
    return json({ error: "Invalid query param: mode must be 'append' or 'replace'" }, 400);
  }
  if (type === "supplier_responses" && !supplier_id && !supplier_name) {
    return json(
      { error: "supplier_id or supplier_name is required when type=supplier_responses" },
      400
    );
  }

  // ── Body (raw JSON — never read by the agent) ─────────────────────────────
  let file_content: string;
  try {
    file_content = await req.text();
    if (!file_content.trim()) throw new Error("Empty body");
  } catch (err: any) {
    return json({ error: `Failed to read request body: ${err?.message ?? String(err)}` }, 400);
  }

  // ── Dispatch to import handler ────────────────────────────────────────────
  try {
    let result: unknown;

    if (type === "structure") {
      result = await handleImportStructure({ rfp_id, file_content, mode }, authContext);
    } else if (type === "requirements") {
      result = await handleImportRequirements({ rfp_id, file_content, mode }, authContext);
    } else {
      result = await handleImportSupplierResponses(
        { rfp_id, file_content, supplier_id, supplier_name, version_id },
        authContext
      );
    }

    return json(result);
  } catch (err: any) {
    return json({ error: err?.message ?? "Import failed" }, 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
