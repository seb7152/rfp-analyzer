import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";
import { generateDownloadSignedUrl } from "@/lib/gcs";

interface SearchSource {
  id: string;
  title: string;
  gcsUri: string;
  pageNumber: number;
  excerpt: string;
  documentId: string;
  supplierName: string | null;
  signedUrl?: string; // Signed URL pour accès direct au PDF
}

interface SearchResult {
  summary: string;
  sources: SearchSource[];
  totalResults: number;
}

// Helper pour extraire document_id depuis GCS URI
function extractDocumentIdFromGcsUri(uri: string): string {
  // Format: gs://rfps-documents/rfps/{org_id}/{rfp_id}/documents/{doc_id}-{filename}.pdf
  const match = uri.match(/\/documents\/([a-f0-9-]+)-/);
  return match ? match[1] : "";
}

export async function POST(
  request: NextRequest,
  { params }: { params: { rfpId: string } }
) {
  try {
    // 1. Auth & Access Control
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Vérifier accès RFP via organization_id
    const { data: rfp, error: rfpError } = await supabase
      .from("rfps")
      .select("organization_id")
      .eq("id", params.rfpId)
      .single();

    if (rfpError || !rfp) {
      return NextResponse.json({ error: "RFP not found" }, { status: 404 });
    }

    // Vérifier membership user
    const { data: membership, error: membershipError } = await supabase
      .from("user_organizations")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", rfp.organization_id)
      .single();

    if (membershipError || !membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Parse Request Body
    const body = await request.json();
    const {
      query,
      supplierIds,
      pageSize = 5,
      summaryResultCount = 5,
    } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Query is required" },
        { status: 400 }
      );
    }

    // 3. Get active evaluation version and filter suppliers
    const { data: activeVersion, error: versionError } = await supabase
      .from("evaluation_versions")
      .select("id")
      .eq("rfp_id", params.rfpId)
      .eq("is_active", true)
      .single();

    if (versionError || !activeVersion) {
      console.error("No active version found for RFP:", params.rfpId);
      return NextResponse.json(
        { error: "No active evaluation version found" },
        { status: 404 }
      );
    }

    // 4. Récupérer les IDs des fournisseurs actifs pour filtrage natif Vertex AI
    let activeSupplierIds: string[] = [];

    if (supplierIds && Array.isArray(supplierIds) && supplierIds.length > 0) {
      // Filter suppliers by active status in current version
      const { data: activeSuppliers, error: supplierStatusError } =
        await supabase
          .from("version_supplier_status")
          .select("supplier_id")
          .eq("version_id", activeVersion.id)
          .in("supplier_id", supplierIds)
          .eq("is_active", true)
          .neq("shortlist_status", "removed");

      if (supplierStatusError) {
        console.error("Error fetching supplier status:", supplierStatusError);
        return NextResponse.json(
          { error: "Failed to fetch supplier status" },
          { status: 500 }
        );
      }

      activeSupplierIds = activeSuppliers?.map((s) => s.supplier_id) || [];

      if (activeSupplierIds.length === 0) {
        console.log(
          "[Vertex Search] No active suppliers found in current version"
        );
        return NextResponse.json({
          summary:
            "Aucun fournisseur actif trouvé dans la version d'évaluation actuelle.",
          sources: [],
          totalResults: 0,
        });
      }

      console.log(
        `[Vertex Search] Active suppliers in version ${activeVersion.id}:`,
        activeSupplierIds
      );
    } else {
      // Pas de filtre fournisseur : utiliser tous les fournisseurs actifs
      const { data: activeSuppliers, error: supplierStatusError } =
        await supabase
          .from("version_supplier_status")
          .select("supplier_id")
          .eq("version_id", activeVersion.id)
          .eq("is_active", true)
          .neq("shortlist_status", "removed");

      if (!supplierStatusError && activeSuppliers && activeSuppliers.length > 0) {
        activeSupplierIds = activeSuppliers.map((s) => s.supplier_id) || [];

        console.log(
          `[Vertex Search] Searching all documents for active suppliers:`,
          activeSupplierIds
        );
      }
    }

    // 5. Appel Vertex AI Search
    const projectId = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_VERTEX_AI_LOCATION || "global";
    const engineId = process.env.GCP_VERTEX_AI_ENGINE_ID;
    const projectNumber = process.env.GCP_VERTEX_AI_PROJECT_NUMBER;

    if (!projectId || !engineId || !projectNumber) {
      console.error("Missing required GCP environment variables:", {
        GCP_PROJECT_ID: projectId ? "✓" : "✗ MISSING",
        GCP_VERTEX_AI_ENGINE_ID: engineId ? "✓" : "✗ MISSING",
        GCP_VERTEX_AI_PROJECT_NUMBER: projectNumber ? "✓" : "✗ MISSING",
        GCP_VERTEX_AI_LOCATION: location,
      });
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Use REST API directly instead of SDK to avoid autopagination issues
    const credentials = process.env.GCP_KEY_JSON
      ? JSON.parse(process.env.GCP_KEY_JSON)
      : undefined;

    const auth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });

    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();

    const servingConfig = `projects/${projectNumber}/locations/${location}/collections/default_collection/engines/${engineId}/servingConfigs/default_search`;
    const endpoint = `https://discoveryengine.googleapis.com/v1/${servingConfig}:search`;

    // 5. Construire le filtre natif Vertex AI (sans préfixe structData.)
    let filter = `rfp_id: ANY("${params.rfpId}")`;

    if (activeSupplierIds.length > 0) {
      const supplierFilter = activeSupplierIds
        .map((id) => `"${id}"`)
        .join(", ");
      filter += ` AND supplier_id: ANY(${supplierFilter})`;
    }

    const requestBody = {
      query,
      pageSize: Number(pageSize), // Native filtering, no need for multiplier
      filter, // ✨ Native Vertex AI filtering
      queryExpansionSpec: { condition: "AUTO" },
      spellCorrectionSpec: { mode: "AUTO" },
      contentSearchSpec: {
        summarySpec: {
          summaryResultCount: Number(summaryResultCount),
          includeCitations: true,
          ignoreAdversarialQuery: true,
          ignoreNonSummarySeekingQuery: true,
        },
        extractiveContentSpec: {
          maxExtractiveAnswerCount: 3,
        },
      },
    };

    console.log("[Vertex Search] Query:", query);
    console.log("[Vertex Search] Native filter:", filter);
    console.log(
      "[Vertex Search] Active suppliers count:",
      activeSupplierIds.length
    );
    console.log(
      "[Vertex Search] Requesting pageSize:",
      requestBody.pageSize,
      "summaryResultCount:",
      requestBody.contentSearchSpec.summarySpec.summaryResultCount
    );
    console.log("[Vertex Search] Endpoint:", endpoint);

    const vertexResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!vertexResponse.ok) {
      const errorText = await vertexResponse.text();
      console.error("[Vertex Search] API Error:", errorText);
      throw new Error(`Vertex AI Search API error: ${errorText}`);
    }

    const response = await vertexResponse.json();

    console.log("[Vertex Search] Response total results:", response.totalSize);
    console.log(
      "[Vertex Search] Response results count:",
      response.results?.length || 0
    );

    // 6. Traitement et enrichissement des résultats (filtrage natif déjà appliqué)
    const filteredResults = response.results || [];
    const rawSources: SearchSource[] =
      filteredResults?.map((result: any, index: number) => {
        const doc = result.document;
        const derivedData = doc?.derivedStructData;
        const gcsUri =
          typeof derivedData?.link === "string" ? derivedData.link : "";
        const extractiveAnswers = Array.isArray(derivedData?.extractive_answers)
          ? derivedData.extractive_answers
          : [];

        const firstAnswer = extractiveAnswers[0] || {};
        const pageNumberStr = firstAnswer.pageNumber
          ? String(firstAnswer.pageNumber)
          : "1";

        return {
          id: doc?.id || `source-${index}`,
          title:
            typeof derivedData?.title === "string"
              ? derivedData.title
              : "Document sans titre",
          gcsUri,
          pageNumber: parseInt(pageNumberStr, 10),
          excerpt:
            typeof firstAnswer.content === "string" ? firstAnswer.content : "",
          documentId: extractDocumentIdFromGcsUri(gcsUri),
          supplierName: null,
        };
      }) || [];

    // 8. Enrichir avec les noms de fournisseurs et générer des signed URLs
    const documentIds = rawSources.map((s) => s.documentId).filter(Boolean);

    if (documentIds.length > 0) {
      const { data: docSupplierData } = await supabase
        .from("document_suppliers")
        .select(
          `
          document_id,
          supplier:suppliers(name)
        `
        )
        .in("document_id", documentIds);

      // Map document_id -> supplier name
      const supplierMap = new Map<string, string>();
      docSupplierData?.forEach((ds: any) => {
        if (ds.supplier?.name && typeof ds.supplier.name === "string") {
          supplierMap.set(ds.document_id, ds.supplier.name);
        }
      });

      // Récupérer les gcs_object_name pour générer les signed URLs
      const { data: documents } = await supabase
        .from("rfp_documents")
        .select("id, gcs_object_name")
        .in("id", documentIds);

      const gcsObjectMap = new Map<string, string>();
      documents?.forEach((doc) => {
        gcsObjectMap.set(doc.id, doc.gcs_object_name);
      });

      // Enrichir les sources avec nom de fournisseur et signed URL
      for (const source of rawSources) {
        if (source.documentId) {
          // Nom du fournisseur
          if (supplierMap.has(source.documentId)) {
            source.supplierName = supplierMap.get(source.documentId) || null;
          }

          // Signed URL pour accès direct au PDF
          const gcsObjectName = gcsObjectMap.get(source.documentId);
          if (gcsObjectName) {
            try {
              // Signed URL valide 1 heure
              source.signedUrl = await generateDownloadSignedUrl(
                gcsObjectName,
                60 * 60 * 1000
              );
            } catch (error) {
              console.error(
                `[Vertex Search] Failed to generate signed URL for ${gcsObjectName}:`,
                error
              );
              // Continue without signed URL
            }
          }
        }
      }
    }

    const summary =
      typeof response.summary?.summaryText === "string"
        ? response.summary.summaryText
        : "Aucun résumé disponible.";

    // Use filtered count for total
    const totalResults = rawSources.length;

    // Log citation analysis
    const citationMatches = summary.match(/\[\d+\]/g) || [];
    const uniqueCitations = [...new Set(citationMatches)];
    console.log(
      `[Vertex Search] Summary contains citations: ${uniqueCitations.join(", ")}`
    );
    console.log(`[Vertex Search] Returning ${rawSources.length} sources`);

    // Warn if mismatch between citations and sources
    if (uniqueCitations.length > rawSources.length) {
      console.warn(
        `[Vertex Search] ⚠️  Summary cites ${uniqueCitations.length} sources but only ${rawSources.length} available after filtering`
      );
    }

    const result: SearchResult = {
      summary,
      sources: rawSources,
      totalResults,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Vertex AI Search error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
