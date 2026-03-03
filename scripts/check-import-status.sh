#!/bin/bash

# Script pour vérifier le statut d'une opération d'import Vertex AI
# Usage: ./scripts/check-import-status.sh <operation-id>

set -e

if [ -z "$1" ]; then
  echo "❌ Usage: $0 <operation-id>"
  echo "   Exemple: $0 import-documents-10890362616703348338"
  exit 1
fi

OPERATION_ID="$1"
PROJECT_NUMBER="895472224132"
DATA_STORE_ID="rfps_1772495157302_gcs_store"
QUOTA_PROJECT="rfp-analyzer-477920"

echo "🔍 Vérification du statut de l'opération : $OPERATION_ID"
echo "──────────────────────────────────────────────────────"
echo ""

while true; do
  TOKEN=$(gcloud auth print-access-token)

  RESPONSE=$(curl -s -X GET \
    "https://discoveryengine.googleapis.com/v1/projects/$PROJECT_NUMBER/locations/global/collections/default_collection/dataStores/$DATA_STORE_ID/branches/0/operations/$OPERATION_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Goog-User-Project: $QUOTA_PROJECT")

  # Vérifier si l'opération est terminée
  DONE=$(echo "$RESPONSE" | jq -r '.done // false')

  if [ "$DONE" = "true" ]; then
    echo "✅ Import terminé !"
    echo ""
    echo "$RESPONSE" | jq '.'

    # Vérifier s'il y a des erreurs
    ERROR_COUNT=$(echo "$RESPONSE" | jq -r '.response.failureCount // "0"')
    SUCCESS_COUNT=$(echo "$RESPONSE" | jq -r '.response.successCount // "0"')

    echo ""
    echo "──────────────────────────────────────────────────────"
    echo "📊 Résumé :"
    echo "   ✅ Succès : $SUCCESS_COUNT documents"
    echo "   ❌ Échecs : $ERROR_COUNT documents"

    if [ "$ERROR_COUNT" != "0" ]; then
      echo ""
      echo "⚠️  Erreurs détectées. Voir errorSamples ci-dessus"
    fi

    break
  else
    # Afficher la progression
    TOTAL=$(echo "$RESPONSE" | jq -r '.metadata.totalCount // "?"')
    UPDATE_TIME=$(echo "$RESPONSE" | jq -r '.metadata.updateTime // "N/A"')

    echo "⏳ En cours... ($TOTAL documents) - Dernière mise à jour: $UPDATE_TIME"
    echo "   Prochaine vérification dans 10 secondes..."
    sleep 10
  fi
done
