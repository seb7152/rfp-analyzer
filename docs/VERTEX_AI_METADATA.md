# Vertex AI Search - Métadonnées JSONL

Ce document explique comment gérer les métadonnées custom dans Vertex AI Search pour permettre le filtrage natif par fournisseur, RFP et organisation.

## 📋 Contexte

### Problème actuel (Post-filtrage)

Actuellement, l'API `/api/rfps/[rfpId]/vertex-search` utilise un **post-filtrage** :
1. On demande `pageSize * 5` résultats à Vertex AI
2. On filtre les résultats côté serveur par `allowedGcsUris`
3. On retourne seulement les résultats correspondants

**Inconvénient** : Le résumé généré par Vertex AI cite des sources qui ne sont pas dans nos résultats filtrés (ex: cite [1-5] mais on a seulement [1]).

### Solution : Métadonnées JSONL

Avec les métadonnées JSONL, on peut :
- Ajouter des champs custom à chaque document (`supplier_id`, `rfp_id`, `organization_id`)
- Utiliser le paramètre `filter` natif de Vertex AI Search
- Obtenir un résumé généré uniquement à partir des documents filtrés

## 🏗️ Architecture

### Format JSONL

Chaque ligne du fichier `vertex-metadata.jsonl` représente un document avec ses métadonnées :

```jsonl
{"id":"doc-uuid-supplier-uuid","structData":{"supplier_id":"uuid","rfp_id":"uuid","organization_id":"uuid","document_type":"supplier_response","filename":"document.pdf"},"content":{"mimeType":"application/pdf","uri":"gs://rfps-documents/path/to/file.pdf"}}
```

### Structure des métadonnées

```typescript
{
  id: string;                    // ID unique (doc-uuid ou doc-uuid-supplier-uuid)
  structData: {
    supplier_id?: string;        // UUID du fournisseur (optionnel pour docs sans fournisseur)
    rfp_id: string;              // UUID du RFP
    organization_id: string;     // UUID de l'organisation
    document_type: string;       // Type : supplier_response, cahier_charges, etc.
    filename: string;            // Nom du fichier original
  };
  content: {
    mimeType: "application/pdf";
    uri: string;                 // gs://rfps-documents/path/to/file.pdf
  };
}
```

### Stratégie de duplication

**Important** : Un document associé à plusieurs fournisseurs génère **plusieurs entrées** dans le JSONL :
- `doc-123-supplier-A` avec `supplier_id: "A"`
- `doc-123-supplier-B` avec `supplier_id: "B"`

Cela permet de filtrer correctement par `supplier_id` dans Vertex AI.

## 🛠️ Génération et Upload

### 1. Générer le fichier JSONL

```bash
npx tsx scripts/generate-vertex-metadata.ts
```

Ce script :
- Récupère tous les documents de Supabase (`rfp_documents`)
- Récupère les associations `document_suppliers`
- Génère le fichier `vertex-metadata.jsonl` à la racine du projet

**Sortie** :
```
✅ 245 entrées JSONL générées
   - 198 documents avec fournisseur(s)
   - 47 documents sans fournisseur
```

### 2. Uploader vers GCS

```bash
./scripts/upload-vertex-metadata.sh
```

Ce script upload le fichier vers `gs://rfps-documents/metadata/vertex-metadata.jsonl`.

### 3. Importer dans Vertex AI Search

**Via Console GCP** :
1. Ouvrir https://console.cloud.google.com/gen-app-builder/engines
2. Sélectionner l'engine `rfp-rag-1772536484`
3. Aller dans **Data** → **Import**
4. Type : **Cloud Storage JSONL**
5. URI : `gs://rfps-documents/metadata/vertex-metadata.jsonl`
6. **Reconciliation Mode** : `INCREMENTAL` (mise à jour des métadonnées sans réindexer les PDFs)
7. Lancer l'import

**Via gcloud CLI** :
```bash
gcloud alpha discovery-engine documents import \
  --data-store=rfps_1772495157302_gcs_store \
  --location=global \
  --project=895472224132 \
  --gcs-uri=gs://rfps-documents/metadata/vertex-metadata.jsonl \
  --reconciliation-mode=INCREMENTAL
```

⏱️ **Durée** : L'import prend généralement 5-15 minutes selon le nombre de documents.

## 🔧 Modification de l'API Route

Une fois les métadonnées importées, modifier `/app/api/rfps/[rfpId]/vertex-search/route.ts` :

### Avant (Post-filtrage)

```typescript
const requestBody = {
  query,
  pageSize: Number(pageSize) * 5,  // Demander 5x plus pour compenser le filtrage
  // Pas de filter natif
};

// Filtrage client-side après réception
let filteredResults = response.results.filter((result) => {
  const gcsUri = result.document?.derivedStructData?.link;
  return allowedGcsUris.has(gcsUri);
});
```

### Après (Filtrage natif)

```typescript
// Construire le filtre natif Vertex AI
let filter = `rfp_id: "${params.rfpId}"`;

if (supplierIds && supplierIds.length > 0) {
  const supplierFilter = supplierIds.map(id => `"${id}"`).join(", ");
  filter += ` AND supplier_id: ANY(${supplierFilter})`;
}

const requestBody = {
  query,
  pageSize: Number(pageSize),  // Pas besoin de multiplier, filtrage natif
  filter,  // ✨ Filtrage natif Vertex AI
};

// Plus besoin de post-filtrage !
const rawSources = response.results?.map(...) || [];
```

### Syntaxe des filtres Vertex AI

```typescript
// Filtrer par RFP uniquement
filter: 'rfp_id: "uuid-123"'

// Filtrer par RFP et un fournisseur
filter: 'rfp_id: "uuid-123" AND supplier_id: "supplier-uuid-456"'

// Filtrer par RFP et plusieurs fournisseurs
filter: 'rfp_id: "uuid-123" AND supplier_id: ANY("supplier-1", "supplier-2", "supplier-3")'

// Filtrer par organisation (tous RFPs)
filter: 'organization_id: "org-uuid"'

// Combiner plusieurs conditions
filter: 'organization_id: "org-uuid" AND document_type: "supplier_response"'
```

Documentation officielle : https://cloud.google.com/generative-ai-app-builder/docs/filter-search-metadata

## 🔄 Mise à jour des métadonnées

### Quand regénérer le JSONL ?

Les métadonnées doivent être regénérées et réimportées quand :
- ✅ Un nouveau document est uploadé
- ✅ Un document est associé à un nouveau fournisseur
- ✅ Un document est supprimé (soft delete)
- ✅ Les métadonnées d'un document changent (type, RFP, etc.)

### Stratégies de mise à jour

#### Option 1 : Batch hebdomadaire (recommandé pour MVP)

Regénérer et réimporter toutes les métadonnées une fois par semaine via un cron job :

```bash
# Cron : tous les dimanches à 2h du matin
0 2 * * 0 cd /path/to/project && npx tsx scripts/generate-vertex-metadata.ts && ./scripts/upload-vertex-metadata.sh
```

#### Option 2 : Incrémental en temps réel (futur)

Créer une edge function Supabase qui met à jour les métadonnées immédiatement :

1. Trigger sur `rfp_documents` (INSERT, UPDATE, DELETE)
2. Trigger sur `document_suppliers` (INSERT, DELETE)
3. Génère une entrée JSONL pour le document modifié
4. Upload vers GCS
5. Appelle l'API Discovery Engine pour import incrémental

```typescript
// supabase/functions/sync-vertex-metadata/index.ts
export async function handler(req: Request) {
  const { record, old_record, type } = await req.json();

  // Générer entrée JSONL pour le document
  const jsonlEntry = generateJsonlEntry(record);

  // Upload vers GCS (append ou overwrite)
  await uploadToGcs(jsonlEntry);

  // Import incrémental dans Vertex AI
  await importToVertexAI();
}
```

#### Option 3 : Hybrid (recommandé pour production)

- **Batch quotidien** : Full sync pour garantir cohérence
- **Incrémental temps réel** : Pour les uploads de nouveaux documents uniquement

## 🧪 Test du filtrage natif

Une fois les métadonnées importées, tester via curl :

```bash
# Récupérer le token
TOKEN=$(gcloud auth print-access-token)

# Test avec filtrage par RFP
curl -X POST \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/engines/rfp-rag-1772536484/servingConfigs/default_search:search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "planning",
    "pageSize": 5,
    "filter": "rfp_id: \"4fef2cbb-30df-45af-a1ce-f9fa11ec2d54\"",
    "contentSearchSpec": {
      "summarySpec": {
        "summaryResultCount": 5,
        "includeCitations": true
      }
    }
  }'
```

**Vérifier** :
- Les résultats appartiennent bien au RFP filtré
- Le résumé cite uniquement les sources retournées (pas de [2], [3] manquants)

## 📊 Monitoring

### Vérifier l'état de l'import

Console GCP → Vertex AI Search → Engine → **Operations** pour voir :
- État de l'import (en cours / terminé / échoué)
- Nombre de documents importés
- Erreurs éventuelles

### Vérifier les métadonnées d'un document

```bash
# Récupérer un document spécifique
curl -X GET \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/dataStores/rfps_1772495157302_gcs_store/documents/doc-uuid-supplier-uuid" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)"
```

## ⚠️ Limitations et considérations

### Quotas Vertex AI

- **Import operations** : 100 par jour
- **Document updates** : 1000 par minute
- **Search requests** : 60 par minute par projet

Source : https://cloud.google.com/generative-ai-app-builder/quotas

### Duplication de documents

Un document associé à 5 fournisseurs génère 5 entrées dans l'index. Cela compte pour 5 documents aux fins de quota et facturation.

**Alternative** : Utiliser un champ array `supplier_ids` au lieu de dupliquer. Cependant, Vertex AI ne supporte pas bien les filtres sur arrays pour le moment.

### Délai de propagation

Les métadonnées mises à jour peuvent prendre **5-15 minutes** pour être disponibles dans les résultats de recherche.

## 🔗 Ressources

- [Vertex AI Search - Filter search results](https://cloud.google.com/generative-ai-app-builder/docs/filter-search-metadata)
- [Discovery Engine API - Import documents](https://cloud.google.com/generative-ai-app-builder/docs/import-data)
- [JSONL format specification](https://cloud.google.com/generative-ai-app-builder/docs/prepare-data#json-lines)
- [Quotas and limits](https://cloud.google.com/generative-ai-app-builder/quotas)
