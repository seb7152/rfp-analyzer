# État du Filtrage Vertex AI Search

## 📊 État Actuel (4 Mars 2026)

### ✅ Ce qui fonctionne

1. **Recherche de base** : Fonctionne parfaitement sans filtres
   - Query "planning" retourne 35 résultats
   - Résumés générés avec citations
   - Sources avec extraits de contenu

2. **Métadonnées importées** : 32/50 documents avec succès
   - Format JSONL correct avec `structData`
   - Métadonnées présentes : `rfp_id`, `supplier_id`, `organization_id`, `document_type`, `filename`
   - Vérifiable via GET document API

3. **Schéma configuré** : Tous les champs déclarés
   ```json
   {
     "rfp_id": {
       "type": "string",
       "retrievable": true,
       "indexable": true,
       "searchable": true,
       "dynamicFacetable": true
     }
   }
   ```

4. **Post-filtrage** : Implémenté et fonctionnel dans l'API route
   - Demande `pageSize * 5` résultats
   - Filtre côté serveur par `allowedGcsUris`
   - Retourne seulement les documents des fournisseurs actifs

### ❌ Ce qui ne fonctionne pas

**Filtrage natif Vertex AI** : Aucune syntaxe de filtre ne retourne de résultats

Syntaxes testées (toutes échouées) :
```javascript
// Tentative 1 : ANY()
filter: "rfp_id: ANY(\"uuid\")"

// Tentative 2 : Égalité simple
filter: "rfp_id: \"uuid\""

// Tentative 3 : Avec préfixe structData
filter: "structData.rfp_id: ANY(\"uuid\")"

// Tentative 4 : Supplier ID
filter: "supplier_id: ANY(\"uuid\")"
```

**Résultat** : Toutes retournent `totalSize: null, results: []`

## 🔍 Diagnostic

### Hypothèses principales

1. **L'index n'a pas été recréé** après l'ajout des métadonnées
   - Les documents existaient déjà dans l'index AVANT l'import des métadonnées
   - L'import INCREMENTAL a ajouté les métadonnées mais n'a pas déclenché de réindexation complète
   - Les champs `structData` ne sont pas indexés pour le filtrage

2. **Type de data store incompatible**
   - Notre data store est de type "unstructured" (PDFs via GCS)
   - Le filtrage par métadonnées custom fonctionne peut-être mieux avec des data stores "structured" (BigQuery, JSON)

3. **Propagation non terminée**
   - Bien que le schéma soit configuré, l'indexation peut prendre plusieurs heures
   - Les tests ont été faits ~1h après l'import

## 🛠️ Solutions Possibles

### Option 1 : Attendre la réindexation (Recommandé pour test)

**Action** : Attendre 24-48 heures et retester le filtrage natif

**Commande de test** :
```bash
TOKEN=$(gcloud auth print-access-token)

curl -X POST \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Goog-User-Project: rfp-analyzer-477920" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "planning",
    "pageSize": 5,
    "filter": "rfp_id: ANY(\"1f8d89fd-547c-4db5-96c2-c9447226952e\")"
  }' | jq '{totalSize, resultsCount: (.results | length)}'
```

**Si ça marche** : Modifier l'API route pour utiliser le filtrage natif au lieu du post-filtrage.

**Si ça ne marche pas** : Passer à l'option 2 ou 3.

### Option 2 : Créer un nouvel Engine avec métadonnées (Recommandé pour production)

**Étapes** :

1. **Créer un nouveau data store** avec les documents ET métadonnées dès le départ
   ```bash
   # Via console GCP ou API
   # Type: Unstructured data
   # Source: Cloud Storage JSONL
   ```

2. **Importer via JSONL complet** dès la création
   - Tous les documents avec leurs métadonnées
   - Vertex AI indexe tout ensemble

3. **Créer un nouvel Engine** lié à ce data store

4. **Migrer l'API route** pour utiliser le nouvel engine ID

**Avantages** :
- Garantit que les métadonnées sont indexées dès le départ
- Pas de problème de migration incrémentale
- Filtrage natif devrait fonctionner

**Inconvénients** :
- Nécessite de recréer l'index complet (~30-60 min)
- Nouveau engine = nouveau endpoint API
- Coût de réindexation

### Option 3 : Forcer une réindexation complète (Complexe)

**Via API REST** : Supprimer tous les documents et les réimporter
```bash
# 1. Lister tous les documents
GET /documents

# 2. Supprimer chaque document
DELETE /documents/{docId}

# 3. Réimporter avec métadonnées
POST /documents:import
```

**Inconvénient** : Perte temporaire de service pendant la réindexation.

### Option 4 : Garder le post-filtrage (MVP actuel - DÉJÀ IMPLÉMENTÉ)

**État actuel** : Déjà en place et fonctionnel

**Avantages** :
- Fonctionne immédiatement
- Pas de dépendance sur Vertex AI
- Contrôle total du filtrage

**Inconvénients** :
- Résumés citent des sources non-filtrées (workaround: afficher un warning)
- Performance légèrement moins bonne (demande 5x plus de résultats)
- Code plus complexe

## 📋 Recommandation

**Pour le MVP actuel** : **Garder le post-filtrage** (Option 4)
- C'est déjà implémenté et fonctionne
- Le warning UX explique le problème des citations manquantes
- Performance acceptable pour le volume actuel

**Pour la production** : **Créer un nouvel engine** (Option 2)
- Planifier la migration quand le temps le permet
- Garantit le meilleur fonctionnement du filtrage natif
- Évite les workarounds UX

**Action immédiate** : **Tester à J+2** (Option 1)
- Lancer le test de filtrage natif dans 48h
- Si ça fonctionne : migration rapide vers filtrage natif
- Si ça échoue : confirmer que Option 2 est nécessaire

## 🧪 Script de Test

Créer un cron job ou reminder pour tester le filtrage natif dans 48h :

```bash
#!/bin/bash
# test-native-filtering.sh

echo "🧪 Test du filtrage natif Vertex AI Search"
echo "─────────────────────────────────────────"

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
    "filter": "rfp_id: ANY(\"1f8d89fd-547c-4db5-96c2-c9447226952e\")"
  }')

TOTAL=$(echo "$RESULT" | jq -r '.totalSize // "null"')
COUNT=$(echo "$RESULT" | jq -r '.results | length')

if [ "$COUNT" -gt 0 ]; then
  echo "✅ Filtre par rfp_id FONCTIONNE ! ($COUNT résultats)"
else
  echo "❌ Filtre par rfp_id ne fonctionne pas encore"
fi

# Test 2: Filtre par Supplier ID
echo ""
echo "Test 2: Filtre par supplier_id..."
RESULT=$(curl -s -X POST \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Goog-User-Project: rfp-analyzer-477920" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "planning",
    "pageSize": 5,
    "filter": "supplier_id: ANY(\"9ad3365a-d563-4831-87fa-e7b0c9f33c09\")"
  }')

COUNT=$(echo "$RESULT" | jq -r '.results | length')

if [ "$COUNT" -gt 0 ]; then
  echo "✅ Filtre par supplier_id FONCTIONNE ! ($COUNT résultats)"
else
  echo "❌ Filtre par supplier_id ne fonctionne pas encore"
fi

echo ""
echo "─────────────────────────────────────────"
echo "Si tous les tests échouent, passer à l'Option 2 (nouvel engine)"
```

## 📚 Ressources

- [Vertex AI Search - Filter search metadata](https://cloud.google.com/generative-ai-app-builder/docs/filter-search-metadata)
- [Prepare data for ingesting](https://cloud.google.com/generative-ai-app-builder/docs/prepare-data)
- [Import documents API](https://cloud.google.com/generative-ai-app-builder/docs/import-data)
- [Discovery Engine API Reference](https://cloud.google.com/generative-ai-app-builder/docs/reference/rest)

## 📝 Historique

- **2026-03-03 23:38** : Import de 32/50 documents avec métadonnées réussi
- **2026-03-03 23:41** : Import terminé, schéma automatiquement mis à jour
- **2026-03-04 00:00** : Tests de filtrage natif - tous échouent
- **2026-03-04 00:15** : Décision de garder le post-filtrage pour le MVP
