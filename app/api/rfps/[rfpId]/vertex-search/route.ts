import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { SearchServiceClient } from "@google-cloud/discoveryengine";

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

    // 3. Construire le filtre GCS URI pour Vertex AI Search
    let gcsUriFilter: string;

    if (supplierIds && Array.isArray(supplierIds) && supplierIds.length > 0) {
      // Filtrage multi-fournisseurs : récupérer les GCS paths des documents associés
      const { data: docSuppliers, error: docSuppliersError } = await supabase
        .from("document_suppliers")
        .select(
          `
          document_id,
          documents:rfp_documents!inner(gcs_object_name, rfp_id)
        `
        )
        .in("supplier_id", supplierIds)
        .eq("documents.rfp_id", params.rfpId)
        .is("documents.deleted_at", null);

      if (docSuppliersError) {
        console.error("Error fetching document suppliers:", docSuppliersError);
        return NextResponse.json(
          { error: "Failed to fetch documents" },
          { status: 500 }
        );
      }

      if (!docSuppliers || docSuppliers.length === 0) {
        return NextResponse.json({
          summary: "Aucun document trouvé pour les fournisseurs sélectionnés.",
          sources: [],
          totalResults: 0,
        });
      }

      // Construire filtre OR pour les documents spécifiques
      const gcsUris = docSuppliers.map(
        (ds: any) =>
          `gcs_uri:"gs://rfps-documents/${ds.documents.gcs_object_name}"`
      );
      gcsUriFilter = gcsUris.join(" OR ");
    } else {
      // Pas de filtre fournisseur : rechercher dans tous les docs du RFP
      // Format: gs://rfps-documents/rfps/{org_id}/{rfp_id}/*
      gcsUriFilter = `gcs_uri:"gs://rfps-documents/rfps/${rfp.organization_id}/${params.rfpId}/*"`;
    }

    // 4. Appel Vertex AI Search
    const projectId = process.env.GCP_PROJECT_ID;
    const location = process.env.GCP_VERTEX_AI_LOCATION || "global";
    const engineId = process.env.GCP_VERTEX_AI_ENGINE_ID;
    const projectNumber = process.env.GCP_VERTEX_AI_PROJECT_NUMBER;

    if (!projectId || !engineId || !projectNumber) {
      console.error("Missing required GCP environment variables");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Initialize the client with credentials
    const credentials = process.env.GCP_KEY_JSON
      ? JSON.parse(process.env.GCP_KEY_JSON)
      : undefined;

    const client = new SearchServiceClient({
      credentials,
      projectId,
    });

    const servingConfig = `projects/${projectNumber}/locations/${location}/collections/default_collection/engines/${engineId}/servingConfigs/default_search`;

    const searchRequest = {
      servingConfig,
      query,
      pageSize: Number(pageSize),
      filter: gcsUriFilter, // ESSENTIEL : Filtrage par RFP et fournisseurs
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

    const [response] = await client.search(searchRequest as any);

    // 5. Traitement et enrichissement des résultats
    const rawSources: SearchSource[] =
      response.results?.map((result: any, index: number) => {
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

    // 6. Enrichir avec les noms de fournisseurs
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
    const totalResults =
      typeof response.totalSize === "number" ? response.totalSize : 0;

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
