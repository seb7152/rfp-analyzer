#!/bin/bash

# Script pour vérifier l'état de l'indexation Vertex AI
# Usage: ./scripts/check-vertex-index-status.sh [operation-id]
#
# Si operation-id est fourni, vérifie le statut d'une opération spécifique
# Sinon, liste les opérations récentes et affiche des stats globales

set -e

PROJECT_NUMBER="895472224132"
DATA_STORE_ID="rfps_1772495157302_gcs_store"
QUOTA_PROJECT="rfp-analyzer-477920"

TOKEN=$(gcloud auth print-access-token)

if [ -n "$1" ]; then
  # Mode 1: Vérifier une opération spécifique
  OPERATION_ID="$1"

  echo "🔍 Vérification de l'opération : $OPERATION_ID"
  echo "════════════════════════════════════════════════════════════"
  echo ""

  RESPONSE=$(curl -s -X GET \
    "https://discoveryengine.googleapis.com/v1/projects/$PROJECT_NUMBER/locations/global/collections/default_collection/dataStores/$DATA_STORE_ID/branches/0/operations/$OPERATION_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Goog-User-Project: $QUOTA_PROJECT")

  DONE=$(echo "$RESPONSE" | jq -r '.done // false')

  if [ "$DONE" = "true" ]; then
    echo "✅ Opération terminée !"
    echo ""
    SUCCESS_COUNT=$(echo "$RESPONSE" | jq -r '.response.successCount // "0"')
    ERROR_COUNT=$(echo "$RESPONSE" | jq -r '.response.failureCount // "0"')

    echo "📊 Résumé :"
    echo "   ✅ Succès : $SUCCESS_COUNT documents"
    echo "   ❌ Échecs : $ERROR_COUNT documents"

    if [ "$ERROR_COUNT" != "0" ]; then
      echo ""
      echo "⚠️  Erreurs détectées :"
      echo "$RESPONSE" | jq -r '.response.errorSamples[]? | "   - \(.message)"'
    fi
  else
    echo "⏳ Opération en cours..."
    echo ""
    PROGRESS=$(echo "$RESPONSE" | jq -r '.metadata.progressPercent // "N/A"')
    UPDATE_TIME=$(echo "$RESPONSE" | jq -r '.metadata.updateTime // "N/A"')

    echo "📈 Progression : $PROGRESS%"
    echo "🕐 Dernière mise à jour : $UPDATE_TIME"
  fi

  echo ""
  echo "📋 Détails complets :"
  echo "$RESPONSE" | jq '.'

else
  # Mode 2: Vue globale de l'index

  echo "📊 État Global de l'Index Vertex AI Search"
  echo "════════════════════════════════════════════════════════════"
  echo ""

  # 1. Lister les opérations récentes
  echo "🔄 Opérations d'import récentes :"
  echo "────────────────────────────────────────────────────────────"

  OPERATIONS=$(curl -s -X GET \
    "https://discoveryengine.googleapis.com/v1/projects/$PROJECT_NUMBER/locations/global/collections/default_collection/dataStores/$DATA_STORE_ID/branches/0/operations?filter=verb=%22import%22&pageSize=10" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Goog-User-Project: $QUOTA_PROJECT")

  OPERATIONS_COUNT=$(echo "$OPERATIONS" | jq -r '.operations | length')

  if [ "$OPERATIONS_COUNT" -gt 0 ]; then
    echo "$OPERATIONS" | jq -r '.operations[] |
      "ID: \(.name | split("/") | .[-1])\n" +
      "   État: \(if .done then "✅ Terminé" else "⏳ En cours" end)\n" +
      "   Créé: \(.metadata.createTime // "N/A")\n" +
      "   MAJ: \(.metadata.updateTime // "N/A")\n" +
      (if .done then
        "   Succès: \(.response.successCount // "0") documents\n" +
        "   Échecs: \(.response.failureCount // "0") documents\n"
      else
        "   Progression: \(.metadata.progressPercent // "N/A")%\n"
      end)'
  else
    echo "Aucune opération récente trouvée"
  fi

  echo ""
  echo "────────────────────────────────────────────────────────────"
  echo ""

  # 2. Compter les documents indexés
  echo "📄 Documents dans l'index :"
  echo "────────────────────────────────────────────────────────────"

  # Faire une recherche vide pour obtenir le total
  SEARCH_RESULT=$(curl -s -X POST \
    "https://discoveryengine.googleapis.com/v1/projects/$PROJECT_NUMBER/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Goog-User-Project: $QUOTA_PROJECT" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "*",
      "pageSize": 1
    }')

  TOTAL_DOCS=$(echo "$SEARCH_RESULT" | jq -r '.totalSize // "N/A"')

  echo "   Total de documents indexés : $TOTAL_DOCS"
  echo ""

  # 3. Tester le filtrage natif
  echo "🧪 Test du filtrage natif :"
  echo "────────────────────────────────────────────────────────────"

  # Test avec un RFP connu (le premier trouvé)
  TEST_RESULT=$(curl -s -X POST \
    "https://discoveryengine.googleapis.com/v1/projects/$PROJECT_NUMBER/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Goog-User-Project: $QUOTA_PROJECT" \
    -H "Content-Type: application/json" \
    -d '{
      "query": "test",
      "pageSize": 1,
      "filter": "rfp_id: ANY(\"1f8d89fd-547c-4db5-96c2-c9447226952e\")"
    }')

  FILTERED_COUNT=$(echo "$TEST_RESULT" | jq -r '.results | length')

  if [ "$FILTERED_COUNT" -gt 0 ]; then
    echo "   ✅ Filtrage natif par rfp_id fonctionne"
  else
    echo "   ⚠️  Filtrage natif ne retourne pas de résultats (peut-être pas encore indexé)"
  fi

  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo ""
  echo "💡 Pour suivre une opération spécifique :"
  echo "   $0 <operation-id>"
  echo ""
  echo "💡 Pour voir les détails d'un document :"
  echo "   Utilisez la console GCP : Vertex AI Search → Data Stores → Documents"
fi
