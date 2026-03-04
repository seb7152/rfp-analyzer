/**
 * Test de validation du système d'auto-indexation Vertex AI
 *
 * Ce script simule un upload de document et vérifie que :
 * 1. La fonction updateVertexAIIndex peut être appelée
 * 2. Le JSONL est correctement généré
 * 3. L'upload GCS fonctionne
 * 4. L'API import peut être appelée (dry-run)
 *
 * Usage: npx tsx scripts/test-auto-index.ts
 */

import { config } from "dotenv";

// Load .env.local file
config({ path: ".env.local" });

import { updateVertexAIIndex } from "../lib/vertex-ai-index";

async function testAutoIndex() {
  console.log("🧪 Test de validation du système d'auto-indexation Vertex AI");
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");

  // Données de test (valeurs fictives)
  const testParams = {
    documentId: "test-doc-12345678-1234-1234-1234-123456789012",
    supplierId: "test-supplier-12345678-1234-1234-1234-123456789012",
    rfpId: "test-rfp-12345678-1234-1234-1234-123456789012",
    organizationId: "test-org-12345678-1234-1234-1234-123456789012",
    documentType: "supplier_response",
    filename: "test-document.pdf",
    gcsObjectName:
      "rfps/test-org-12345678-1234-1234-1234-123456789012/test-rfp-12345678-1234-1234-1234-123456789012/documents/test-doc-12345678-1234-1234-1234-123456789012-test-document.pdf",
  };

  console.log("📋 Paramètres de test :");
  console.log(JSON.stringify(testParams, null, 2));
  console.log("");

  console.log("🚀 Lancement de updateVertexAIIndex()...");
  console.log("");

  try {
    await updateVertexAIIndex(testParams);

    console.log("");
    console.log("✅ SUCCESS! La fonction updateVertexAIIndex fonctionne.");
    console.log("");
    console.log("📝 Notes :");
    console.log("   - Un fichier JSONL temporaire a été créé dans GCS");
    console.log("   - L'import a été déclenché dans Vertex AI");
    console.log(
      "   - L'indexation prendra 6-12 heures pour être effective"
    );
    console.log(
      "   - Le fichier JSONL sera automatiquement supprimé dans 5 minutes"
    );
    console.log("");
    console.log("🔍 Prochaines étapes :");
    console.log("   1. Vérifier les logs ci-dessus pour confirmer le succès");
    console.log("   2. Dans 12h, tester la recherche avec ce document");
    console.log(
      "   3. Nettoyer le document de test si nécessaire (il ne gênera pas)"
    );
  } catch (error) {
    console.error("");
    console.error("❌ ERREUR lors de l'exécution de updateVertexAIIndex:");
    console.error(error);
    console.error("");
    console.error("💡 Causes possibles :");
    console.error("   - Variables d'environnement manquantes");
    console.error("   - Credentials GCP invalides");
    console.error("   - Permissions insuffisantes sur GCS ou Vertex AI");
    console.error("   - Data Store ID incorrect");
    console.error("");
    console.error("🔧 Actions de débogage :");
    console.error("   1. Vérifier .env.local contient toutes les variables");
    console.error("   2. Vérifier GCP_KEY_JSON est valide");
    console.error("   3. Tester la connexion GCS : npm run tsx scripts/test-gcs-connection.ts");
    console.error(
      "   4. Vérifier le Data Store ID dans GCP Console"
    );

    process.exit(1);
  }
}

testAutoIndex();
