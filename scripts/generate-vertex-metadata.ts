/**
 * Script de génération du fichier JSONL avec métadonnées pour Vertex AI Search
 *
 * Ce script récupère tous les documents PDF du bucket GCS et génère un fichier JSONL
 * contenant les métadonnées custom (supplier_id, rfp_id, organization_id, etc.)
 *
 * Format JSONL attendu par Vertex AI Search :
 * {
 *   "id": "document-uuid",
 *   "structData": {
 *     "supplier_id": "uuid",
 *     "rfp_id": "uuid",
 *     "organization_id": "uuid",
 *     "document_type": "supplier_response"
 *   },
 *   "content": {
 *     "mimeType": "application/pdf",
 *     "uri": "gs://rfps-documents/path/to/file.pdf"
 *   }
 * }
 *
 * Usage: npx tsx scripts/generate-vertex-metadata.ts
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "fs";
import { join } from "path";

// Charger les variables d'environnement
config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

interface DocumentMetadata {
  id: string;
  gcs_object_name: string;
  rfp_id: string;
  organization_id: string;
  document_type: string;
  filename: string;
  supplier_ids: string[]; // Un document peut avoir plusieurs fournisseurs
}

interface VertexMetadataEntry {
  id: string;
  structData: {
    supplier_id?: string;
    rfp_id: string;
    organization_id: string;
    document_type: string;
    filename: string;
  };
  content: {
    mimeType: string;
    uri: string;
  };
}

async function generateMetadataJsonl() {
  console.log("🚀 Génération du fichier JSONL pour Vertex AI Search");
  console.log("─".repeat(60));

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // 1. Récupérer tous les documents non supprimés
  console.log("📄 Récupération des documents depuis Supabase...");
  const { data: documents, error: docsError } = await supabase
    .from("rfp_documents")
    .select(
      `
      id,
      gcs_object_name,
      rfp_id,
      organization_id,
      document_type,
      filename,
      deleted_at
    `
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (docsError || !documents) {
    console.error("❌ Erreur lors de la récupération des documents:", docsError);
    process.exit(1);
  }

  console.log(`✅ ${documents.length} documents trouvés`);
  console.log("");

  // 2. Récupérer les associations document-supplier pour tous les documents
  console.log("🔗 Récupération des associations document-supplier...");
  const documentIds = documents.map((d) => d.id);

  const { data: docSuppliers, error: suppliersError } = await supabase
    .from("document_suppliers")
    .select("document_id, supplier_id")
    .in("document_id", documentIds);

  if (suppliersError) {
    console.error(
      "❌ Erreur lors de la récupération des associations:",
      suppliersError
    );
    process.exit(1);
  }

  console.log(
    `✅ ${docSuppliers?.length || 0} associations document-supplier trouvées`
  );
  console.log("");

  // 3. Créer un Map document_id -> supplier_ids[]
  const docSupplierMap = new Map<string, string[]>();
  docSuppliers?.forEach((ds) => {
    if (!docSupplierMap.has(ds.document_id)) {
      docSupplierMap.set(ds.document_id, []);
    }
    docSupplierMap.get(ds.document_id)!.push(ds.supplier_id);
  });

  // 4. Générer les entrées JSONL
  console.log("📝 Génération des entrées JSONL...");
  const jsonlEntries: string[] = [];
  let documentsWithSuppliers = 0;
  let documentsWithoutSuppliers = 0;

  for (const doc of documents) {
    const supplierIds = docSupplierMap.get(doc.id) || [];
    const gcsUri = `gs://rfps-documents/${doc.gcs_object_name}`;

    if (supplierIds.length > 0) {
      // Document avec fournisseur(s) : créer une entrée par fournisseur
      // pour permettre le filtrage par supplier_id
      documentsWithSuppliers++;
      for (const supplierId of supplierIds) {
        const entry: VertexMetadataEntry = {
          id: `${doc.id}-${supplierId}`, // ID unique par combinaison doc-supplier
          structData: {
            supplier_id: supplierId,
            rfp_id: doc.rfp_id,
            organization_id: doc.organization_id,
            document_type: doc.document_type,
            filename: doc.filename,
          },
          content: {
            mimeType: "application/pdf",
            uri: gcsUri,
          },
        };
        jsonlEntries.push(JSON.stringify(entry));
      }
    } else {
      // Document sans fournisseur (ex: cahier des charges)
      documentsWithoutSuppliers++;
      const entry: VertexMetadataEntry = {
        id: doc.id,
        structData: {
          rfp_id: doc.rfp_id,
          organization_id: doc.organization_id,
          document_type: doc.document_type,
          filename: doc.filename,
        },
        content: {
          mimeType: "application/pdf",
          uri: gcsUri,
        },
      };
      jsonlEntries.push(JSON.stringify(entry));
    }
  }

  console.log(`✅ ${jsonlEntries.length} entrées JSONL générées`);
  console.log(`   - ${documentsWithSuppliers} documents avec fournisseur(s)`);
  console.log(`   - ${documentsWithoutSuppliers} documents sans fournisseur`);
  console.log("");

  // 5. Écrire le fichier JSONL
  const outputPath = join(process.cwd(), "vertex-metadata.jsonl");
  writeFileSync(outputPath, jsonlEntries.join("\n"), "utf-8");

  console.log(`✅ Fichier JSONL généré : ${outputPath}`);
  console.log(`   Taille : ${(jsonlEntries.join("\n").length / 1024).toFixed(2)} KB`);
  console.log("");

  // 6. Afficher un exemple d'entrée
  console.log("📋 Exemple d'entrée JSONL :");
  console.log(JSON.stringify(JSON.parse(jsonlEntries[0]), null, 2));
  console.log("");

  console.log("─".repeat(60));
  console.log("✅ Génération terminée avec succès !");
  console.log("");
  console.log("📌 Prochaines étapes :");
  console.log("   1. Upload du fichier JSONL dans GCS :");
  console.log("      gsutil cp vertex-metadata.jsonl gs://rfps-documents/metadata/");
  console.log("");
  console.log("   2. Importer les métadonnées dans Vertex AI Search :");
  console.log("      Via la console GCP ou API Discovery Engine");
  console.log("");
  console.log("   3. Modifier l'API route pour utiliser le filtrage natif :");
  console.log('      filter: "supplier_id: ANY(\\"uuid1\\", \\"uuid2\\")"');
}

// Exécuter le script
generateMetadataJsonl().catch((error) => {
  console.error("❌ Erreur lors de la génération :", error);
  process.exit(1);
});
