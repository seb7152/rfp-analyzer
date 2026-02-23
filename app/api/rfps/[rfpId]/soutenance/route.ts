import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * POST /api/rfps/[rfpId]/soutenance
 *
 * Génère un brief de soutenance pour un fournisseur donné.
 * Filtre les exigences par statut (partial, fail, roadmap par défaut).
 * Invoque l'edge function generate-soutenance qui enverra les données à N8N.
 *
 * Request body: { supplierId: string, versionId?: string, targetStatuses?: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;

    if (!rfpId || typeof rfpId !== "string") {
      return NextResponse.json({ error: "Invalid RFP ID" }, { status: 400 });
    }

    const body = await request.json();
    const {
      supplierId,
      versionId,
      targetStatuses = ["partial", "fail", "roadmap"],
    } = body;

    if (!supplierId || typeof supplierId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: supplierId" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "partial",
      "fail",
      "roadmap",
      "pending",
      "pass",
      "pass_with_question",
    ];
    const sanitizedStatuses = (targetStatuses as string[]).filter((s) =>
      validStatuses.includes(s)
    );

    if (sanitizedStatuses.length === 0) {
      return NextResponse.json(
        { error: "At least one valid target status is required" },
        { status: 400 }
      );
    }

    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user has access to this RFP (owner level for AI features)
    const { data: assignment, error: assignmentError } = await supabase
      .from("rfp_user_assignments")
      .select("access_level")
      .eq("rfp_id", rfpId)
      .eq("user_id", user.id)
      .single();

    if (assignmentError || !assignment || assignment.access_level !== "owner") {
      return NextResponse.json(
        { error: "Only RFP owners can generate soutenance briefs" },
        { status: 403 }
      );
    }

    // Verify supplier belongs to this RFP
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("id", supplierId)
      .eq("rfp_id", rfpId)
      .single();

    if (supplierError || !supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const correlationId = `soutenance-${rfpId}-${supplierId}-${Date.now()}`;

    const { data: brief, error: briefError } = await supabase
      .from("soutenance_briefs")
      .insert({
        rfp_id: rfpId,
        supplier_id: supplierId,
        version_id: versionId || null,
        correlation_id: correlationId,
        status: "pending",
        target_statuses: sanitizedStatuses,
      })
      .select("id")
      .single();

    if (briefError || !brief) {
      console.error(
        "[/soutenance POST] Error creating brief record:",
        briefError
      );
      return NextResponse.json(
        { error: "Failed to create brief record" },
        { status: 500 }
      );
    }

    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-soutenance`;

    // Fire-and-forget: do not await to avoid Vercel timeout
    fetch(edgeFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        briefId: brief.id,
        rfpId,
        supplierId,
        versionId: versionId || null,
        correlationId,
        targetStatuses: sanitizedStatuses,
      }),
    }).catch((error) => {
      console.error(
        "[/soutenance POST] Error calling generate-soutenance edge function:",
        error
      );
    });

    return NextResponse.json(
      {
        success: true,
        briefId: brief.id,
        correlationId,
        message: "Soutenance brief generation initiated",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[/soutenance POST] Error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/rfps/[rfpId]/soutenance
 *
 * Retourne le brief le plus récent par fournisseur (ou filtré par supplierId).
 *
 * Query params: supplierId? (optionnel)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    const { rfpId } = params;
    const supplierId = request.nextUrl.searchParams.get("supplierId");

    const supabase = await createServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let query = supabase
      .from("soutenance_briefs")
      .select(
        "id, supplier_id, status, report_markdown, target_statuses, created_at, started_at, completed_at, error_message"
      )
      .eq("rfp_id", rfpId)
      .order("created_at", { ascending: false });

    if (supplierId) {
      query = query.eq("supplier_id", supplierId);
    }

    const { data: briefs, error: briefsError } = await query;

    if (briefsError) {
      console.error("[/soutenance GET] Error:", briefsError);
      return NextResponse.json({ briefs: [], count: 0 }, { status: 200 });
    }

    if (!briefs || briefs.length === 0) {
      return NextResponse.json({ briefs: [], count: 0 }, { status: 200 });
    }

    // Return only the latest brief per supplier
    const bySupplier = new Map<string, (typeof briefs)[0]>();
    for (const brief of briefs) {
      const key = brief.supplier_id || "default";
      if (!bySupplier.has(key)) {
        bySupplier.set(key, brief);
      }
    }

    const results = Array.from(bySupplier.values());

    return NextResponse.json({ briefs: results, count: results.length });
  } catch (error) {
    console.error("[/soutenance GET] Error:", error);
    return NextResponse.json({ briefs: [], count: 0 }, { status: 200 });
  }
}
