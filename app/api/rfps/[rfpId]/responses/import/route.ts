import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { importResponses } from "@/lib/supabase/queries";

/**
 * POST /api/rfps/[rfpId]/responses/import
 * Import responses for an RFP from JSON
 *
 * Request body:
 * {
 *   responses: [
 *     {
 *       requirement_id_external: "REQ001",           // Required
 *       supplier_id_external: "SUP001",              // Required
 *       response_text: "...",                        // Optional
 *       ai_score: 4,                                 // Optional (0-5 or 0.5 increments)
 *       ai_comment: "...",                           // Optional
 *       manual_score: 3,                             // Optional (0-5 or 0.5 increments)
 *       manual_comment: "...",                       // Optional
 *       question: "...",                             // Optional
 *       status: "pass",                              // Optional (pending, pass, partial, fail)
 *       is_checked: true                             // Optional (default: false)
 *     }
 *   ]
 * }
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
      return NextResponse.json(
        { error: result.error || "Failed to import responses" },
        { status: result.error?.includes("version") ? 400 : 500 }
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
    return NextResponse.json(
      { error: "Failed to import responses" },
      { status: 500 }
    );
  }
}
