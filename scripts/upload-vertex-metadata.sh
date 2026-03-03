#!/bin/bash

# Script d'upload du fichier JSONL de métadonnées vers GCS
# et import dans Vertex AI Search
#
# Prérequis :
# - gcloud CLI installé et configuré
# - Permissions sur le bucket rfps-documents
# - Permissions sur Vertex AI Search engine
#
# Usage: ./scripts/upload-vertex-metadata.sh

set -e

JSONL_FILE="vertex-metadata.jsonl"
GCS_BUCKET="rfps-documents"
GCS_METADATA_PATH="gs://${GCS_BUCKET}/metadata/vertex-metadata.jsonl"
PROJECT_NUMBER="895472224132"
LOCATION="global"
ENGINE_ID="rfp-rag-1772536484"
DATA_STORE_ID="rfps_1772495157302_gcs_store"

echo "🚀 Upload et import des métadonnées Vertex AI Search"
echo "──────────────────────────────────────────────────────"
echo ""

# Vérifier que le fichier JSONL existe
if [ ! -f "$JSONL_FILE" ]; then
  echo "❌ Fichier $JSONL_FILE introuvable"
  echo "   Exécutez d'abord : npx tsx scripts/generate-vertex-metadata.ts"
  exit 1
fi

# Afficher les stats du fichier
LINE_COUNT=$(wc -l < "$JSONL_FILE")
FILE_SIZE=$(du -h "$JSONL_FILE" | cut -f1)
echo "📄 Fichier : $JSONL_FILE"
echo "   - $LINE_COUNT entrées"
echo "   - Taille : $FILE_SIZE"
echo ""

# Upload vers GCS
echo "📤 Upload vers GCS : $GCS_METADATA_PATH"
gsutil cp "$JSONL_FILE" "$GCS_METADATA_PATH"
echo "✅ Upload terminé"
echo ""

# Afficher les instructions pour l'import dans Vertex AI Search
echo "──────────────────────────────────────────────────────"
echo "📌 Import des métadonnées dans Vertex AI Search"
echo ""
echo "⚠️  L'import doit être fait via la console GCP ou l'API Discovery Engine"
echo ""
echo "Via la console GCP :"
echo "  1. Ouvrir : https://console.cloud.google.com/gen-app-builder/engines"
echo "  2. Sélectionner l'engine : $ENGINE_ID"
echo "  3. Aller dans 'Data' → 'Import'"
echo "  4. Sélectionner 'Cloud Storage JSONL'"
echo "  5. URI : $GCS_METADATA_PATH"
echo "  6. Lancer l'import"
echo ""
echo "Via gcloud CLI (métadonnées seulement) :"
echo "  gcloud alpha discovery-engine documents import \\"
echo "    --data-store=$DATA_STORE_ID \\"
echo "    --location=$LOCATION \\"
echo "    --project=$PROJECT_NUMBER \\"
echo "    --gcs-uri=$GCS_METADATA_PATH \\"
echo "    --reconciliation-mode=INCREMENTAL"
echo ""
echo "⏱️  L'import peut prendre plusieurs minutes selon le nombre de documents"
echo "──────────────────────────────────────────────────────"
echo ""
echo "✅ Upload terminé ! Voir les instructions ci-dessus pour l'import"
