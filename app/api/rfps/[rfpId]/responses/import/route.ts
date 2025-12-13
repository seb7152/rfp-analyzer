import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { importResponses } from "@/lib/supabase/queries";

/**
 * POST /api/rfps/[rfpId]/responses/import
 * Import or update responses for an RFP from JSON (UPSERT pattern)
 *
 * For existing responses: Updates only the provided fields, preserves others
 * For new responses: Creates with provided fields, uses defaults for the rest
 *
 * Request body:
 * {
 *   responses: [
 *     {
 *       requirement_id_external: "REQ001",           // Required
 *       supplier_id_external: "SUP001",              // Required
 *       response_text: "...",                        // Optional - if not provided, existing value preserved
 *       ai_score: 4,                                 // Optional (0-5 or 0.5 increments)
 *       ai_comment: "...",                           // Optional
 *       manual_score: 3,                             // Optional (0-5 or 0.5 increments)
 *       manual_comment: "...",                       // Optional
 *       question: "...",                             // Optional
 *       status: "pass",                              // Optional (pending, pass, partial, fail)
 *       is_checked: true                             // Optional (default: false for new records)
 *     }
 *   ]
 * }
 *
 * Examples:
 * - Import complete response with AI and manual scores
 * - Update only manual notes without affecting AI scores
 * - Import only notes without response_text
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    // Verify user is authenticated
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { responses } = body;

    if (!Array.isArray(responses)) {
      return NextResponse.json(
        { error: "Invalid request: responses must be an array" },
        { status: 400 }
      );
    }

    // Import responses
    const result = await importResponses(rfpId, responses);

    if (!result.success) {
      const errorMessage = result.error || "Failed to import responses";
      return NextResponse.json(
        {
          success: false,
          error: errorMessage,
          imported: result.count || 0,
          total: responses.length,
        },
        { status: errorMessage?.includes("version") ? 400 : 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: result.count,
      total: responses.length,
      message: `Successfully imported ${result.count} out of ${responses.length} responses`,
    });
  } catch (error) {
    console.error("Error importing responses:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to import responses";
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
