import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

interface SearchSource {
  id: string;
  title: string;
  gcsUri: string;
  pageNumber: number;
  excerpt: string;
  documentId: string;
  supplierName: string | null;
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

    // 4. Récupérer les GCS URIs des fournisseurs actifs pour filtrage post-recherche
    let allowedGcsUris: Set<string> = new Set();

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

      const activeSupplierIds =
        activeSuppliers?.map((s) => s.supplier_id) || [];

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

      // Filtrage multi-fournisseurs : récupérer les GCS paths des documents associés
      const { data: docSuppliers, error: docSuppliersError } = await supabase
        .from("document_suppliers")
        .select(
          `
          document_id,
          documents:rfp_documents!inner(gcs_object_name, rfp_id)
        `
        )
        .in("supplier_id", activeSupplierIds)
        .eq("documents.rfp_id", params.rfpId)
        .is("documents.deleted_at", null);

      if (docSuppliersError) {
        console.error("Error fetching document suppliers:", docSuppliersError);
        return NextResponse.json(
          { error: "Failed to fetch documents" },
          { status: 500 }
        );
      }

      console.log(
        `[Vertex Search] Found ${docSuppliers?.length || 0} documents for suppliers:`,
        supplierIds
      );

      if (!docSuppliers || docSuppliers.length === 0) {
        console.log(
          "[Vertex Search] No documents found in database for suppliers"
        );
        return NextResponse.json({
          summary: "Aucun document trouvé pour les fournisseurs sélectionnés.",
          sources: [],
          totalResults: 0,
        });
      }

      // Collecter les URIs autorisés pour filtrage post-recherche
      docSuppliers.forEach((ds: any) => {
        allowedGcsUris.add(
          `gs://rfps-documents/${ds.documents.gcs_object_name}`
        );
      });

      console.log("[Vertex Search] Documents found:", docSuppliers);
      console.log(
        "[Vertex Search] Allowed URIs:",
        Array.from(allowedGcsUris)
      );
    } else {
      // Pas de filtre fournisseur : collecter tous les docs des fournisseurs actifs
      const { data: activeSuppliers, error: supplierStatusError } =
        await supabase
          .from("version_supplier_status")
          .select("supplier_id")
          .eq("version_id", activeVersion.id)
          .eq("is_active", true)
          .neq("shortlist_status", "removed");

      if (!supplierStatusError && activeSuppliers && activeSuppliers.length > 0) {
        const activeSupplierIds =
          activeSuppliers.map((s) => s.supplier_id) || [];

        console.log(
          `[Vertex Search] Searching all documents for active suppliers:`,
          activeSupplierIds
        );

        const { data: docSuppliers } = await supabase
          .from("document_suppliers")
          .select(
            `
            document_id,
            documents:rfp_documents!inner(gcs_object_name, rfp_id)
          `
          )
          .in("supplier_id", activeSupplierIds)
          .eq("documents.rfp_id", params.rfpId)
          .is("documents.deleted_at", null);

        if (docSuppliers && docSuppliers.length > 0) {
          docSuppliers.forEach((ds: any) => {
            allowedGcsUris.add(
              `gs://rfps-documents/${ds.documents.gcs_object_name}`
            );
          });
        }
      }

      console.log(
        "[Vertex Search] Allowed URIs for all active suppliers:",
        Array.from(allowedGcsUris)
      );
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

    const requestBody = {
      query,
      pageSize: Number(pageSize) * 5, // Request 5x more results for post-filtering
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
    console.log(
      "[Vertex Search] Will filter results to allowed URIs:",
      allowedGcsUris.size,
      "documents"
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

    // 6. Filtrer les résultats par URIs autorisés (fournisseurs actifs)
    let filteredResults = response.results || [];

    if (allowedGcsUris.size > 0) {
      const beforeCount = filteredResults.length;
      filteredResults = filteredResults.filter((result: any) => {
        const gcsUri =
          typeof result.document?.derivedStructData?.link === "string"
            ? result.document.derivedStructData.link
            : "";
        const isAllowed = allowedGcsUris.has(gcsUri);
        if (!isAllowed) {
          console.log(`[Vertex Search] Filtered out URI: ${gcsUri}`);
        }
        return isAllowed;
      });

      console.log(
        `[Vertex Search] Filtered from ${beforeCount} to ${filteredResults.length} results`
      );
      console.log(
        `[Vertex Search] Summary result count in request: ${summaryResultCount}`
      );
    }

    // Limiter au nombre demandé APRÈS filtrage
    const beforeSlice = filteredResults.length;
    filteredResults = filteredResults.slice(0, Number(pageSize));
    console.log(
      `[Vertex Search] After limiting to pageSize ${pageSize}: ${beforeSlice} → ${filteredResults.length} results`
    );

    // 7. Traitement et enrichissement des résultats
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

    // 8. Enrichir avec les noms de fournisseurs
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

      // Enrichir les sources
      rawSources.forEach((source) => {
        if (source.documentId && supplierMap.has(source.documentId)) {
          source.supplierName = supplierMap.get(source.documentId) || null;
        }
      });
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
