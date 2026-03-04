#!/bin/bash

# Script de test du filtrage natif Vertex AI Search
# À exécuter plusieurs heures après la réindexation
# Usage: ./scripts/test-native-filtering.sh

set -e

echo "🧪 Test du filtrage natif Vertex AI Search"
echo "─────────────────────────────────────────────────────"
echo ""

TOKEN=$(gcloud auth print-access-token)

# Test 1: Filtre par RFP ID
echo "Test 1: Filtre par rfp_id..."
RESULT=$(curl -s -X POST \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Goog-User-Project: rfp-analyzer-477920" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "planning",
    "pageSize": 5,
    "filter": "rfp_id: ANY(\"1f8d89fd-547c-4db5-96c2-c9447226952e\")",
    "contentSearchSpec": {
      "summarySpec": {
        "summaryResultCount": 5,
        "includeCitations": true
      }
    }
  }')

COUNT=$(echo "$RESULT" | jq -r '.results | length')
TOTAL=$(echo "$RESULT" | jq -r '.totalSize // "null"')

if [ "$COUNT" -gt 0 ]; then
  echo "✅ Filtre par rfp_id FONCTIONNE ! ($COUNT résultats, total: $TOTAL)"
  echo ""
  echo "Résumé généré:"
  echo "$RESULT" | jq -r '.summary.summaryText // "Pas de résumé"'
else
  echo "❌ Filtre par rfp_id ne fonctionne pas encore"
fi

echo ""
echo "─────────────────────────────────────────────────────"

# Test 2: Filtre par Supplier ID
echo "Test 2: Filtre par supplier_id..."
RESULT=$(curl -s -X POST \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Goog-User-Project: rfp-analyzer-477920" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "planning",
    "pageSize": 5,
    "filter": "supplier_id: ANY(\"9ad3365a-d563-4831-87fa-e7b0c9f33c09\")",
    "contentSearchSpec": {
      "summarySpec": {
        "summaryResultCount": 5,
        "includeCitations": true
      }
    }
  }')

COUNT=$(echo "$RESULT" | jq -r '.results | length')

if [ "$COUNT" -gt 0 ]; then
  echo "✅ Filtre par supplier_id FONCTIONNE ! ($COUNT résultats)"
else
  echo "❌ Filtre par supplier_id ne fonctionne pas encore"
fi

echo ""
echo "─────────────────────────────────────────────────────"

# Test 3: Filtre combiné RFP + Supplier
echo "Test 3: Filtre combiné (rfp_id AND supplier_id)..."
RESULT=$(curl -s -X POST \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Goog-User-Project: rfp-analyzer-477920" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "planning",
    "pageSize": 5,
    "filter": "rfp_id: ANY(\"1f8d89fd-547c-4db5-96c2-c9447226952e\") AND supplier_id: ANY(\"9ad3365a-d563-4831-87fa-e7b0c9f33c09\")",
    "contentSearchSpec": {
      "summarySpec": {
        "summaryResultCount": 5,
        "includeCitations": true
      }
    }
  }')

COUNT=$(echo "$RESULT" | jq -r '.results | length')

if [ "$COUNT" -gt 0 ]; then
  echo "✅ Filtre combiné FONCTIONNE ! ($COUNT résultats)"
else
  echo "❌ Filtre combiné ne fonctionne pas encore"
fi

echo ""
echo "─────────────────────────────────────────────────────"
echo ""

# Conclusion
if [ "$(curl -s -X POST \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Goog-User-Project: rfp-analyzer-477920" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "planning",
    "pageSize": 5,
    "filter": "rfp_id: ANY(\"1f8d89fd-547c-4db5-96c2-c9447226952e\")"
  }' | jq -r '.results | length')" -gt 0 ]; then
  echo "🎉 SUCCESS! Le filtrage natif fonctionne maintenant."
  echo ""
  echo "📝 Prochaines étapes:"
  echo "   1. Modifier app/api/rfps/[rfpId]/vertex-search/route.ts"
  echo "   2. Remplacer le post-filtrage par le filtrage natif"
  echo "   3. Supprimer le multiplicateur pageSize * 5"
  echo "   4. Utiliser directement le paramètre 'filter'"
else
  echo "⏳ Le filtrage natif ne fonctionne pas encore."
  echo ""
  echo "💡 Actions possibles:"
  echo "   - Attendre 6-12h supplémentaires pour l'indexation"
  echo "   - Vérifier les logs dans la console GCP"
  echo "   - Considérer la création d'un nouvel engine"
  echo "   - Garder le post-filtrage actuel (fonctionnel)"
fi
