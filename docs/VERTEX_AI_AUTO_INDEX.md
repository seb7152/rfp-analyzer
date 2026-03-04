# Mise à Jour Automatique de l'Index Vertex AI Search

## Vue d'Ensemble

Le système de mise à jour automatique de l'index Vertex AI Search garantit que tous les nouveaux documents uploadés sont immédiatement indexés pour la recherche RAG, sans intervention manuelle.

## Architecture

### Workflow d'Upload de Document

```
1. Frontend obtient signed URL
   ↓
2. Frontend upload PDF → GCS bucket
   ↓
3. Frontend appelle /api/rfps/[rfpId]/documents/commit
   ↓
4. Backend vérifie que le fichier existe dans GCS
   ↓
5. Backend insère les métadonnées dans Supabase
   ↓
6. Backend crée l'association document-supplier
   ↓
7. ✨ Backend déclenche updateVertexAIIndex() (NOUVEAU)
   ↓
8. Fonction génère une entrée JSONL
   ↓
9. Upload JSONL vers GCS (temp location)
   ↓
10. Appelle Vertex AI import API (INCREMENTAL mode)
   ↓
11. Vertex AI indexe le document (asynchrone)
   ↓
12. Cleanup du fichier JSONL temp (après 5 min)
```

### Workflow de Suppression de Document

```
1. User clique "Supprimer" sur un document
   ↓
2. Frontend appelle DELETE /api/rfps/[rfpId]/documents
   ↓
3. Backend récupère les supplier IDs associés
   ↓
4. Backend soft-delete dans Supabase (deleted_at)
   ↓
5. Backend supprime le fichier de GCS
   ↓
6. ✨ Backend déclenche removeFromVertexAIIndex() (NOUVEAU)
   ↓
7. Fonction appelle DELETE pour chaque document-supplier ID
   ↓
8. Vertex AI retire le document de l'index
```

## Implémentation

### Fichier Principal : `lib/vertex-ai-index.ts`

Deux fonctions principales :

#### 1. `updateVertexAIIndex(params)`

**Paramètres** :
```typescript
{
  documentId: string;        // UUID du document
  supplierId: string;        // UUID du fournisseur
  rfpId: string;             // UUID du RFP
  organizationId: string;    // UUID de l'organisation
  documentType: string;      // "supplier_response", etc.
  filename: string;          // Nom du fichier
  gcsObjectName: string;     // Path complet dans GCS
}
```

**Processus** :
1. Génère une entrée JSONL avec le format :
   ```json
   {
     "id": "{documentId}-{supplierId}",
     "structData": {
       "supplier_id": "{supplierId}",
       "rfp_id": "{rfpId}",
       "organization_id": "{organizationId}",
       "document_type": "{documentType}",
       "filename": "{filename}"
     },
     "content": {
       "mimeType": "application/pdf",
       "uri": "gs://rfps-documents/rfps/{orgId}/{rfpId}/documents/{docId}-{filename}.pdf"
     }
   }
   ```

2. Upload le JSONL vers `gs://rfps-documents/vertex-metadata/incremental/{documentId}-{supplierId}-{timestamp}.jsonl`

3. Appelle l'API Vertex AI Discovery Engine :
   ```
   POST https://discoveryengine.googleapis.com/v1/projects/{projectNumber}/locations/global/collections/default_collection/dataStores/{dataStoreId}/branches/0/documents:import
   ```

   Avec le body :
   ```json
   {
     "reconciliationMode": "INCREMENTAL",
     "gcsSource": {
       "inputUris": ["gs://.../{tempFile}.jsonl"],
       "dataSchema": "document"
     }
   }
   ```

4. Attend 5 minutes puis supprime le fichier JSONL temporaire

**Gestion d'Erreurs** :
- Si l'import échoue, l'erreur est loggée mais ne bloque PAS l'upload du document
- Le document reste uploadé et utilisable même si l'indexation échoue
- Un batch re-index peut être lancé manuellement plus tard si nécessaire

#### 2. `removeFromVertexAIIndex(documentId, supplierIds)`

**Paramètres** :
- `documentId` : UUID du document supprimé
- `supplierIds` : Array de supplier UUIDs associés

**Processus** :
1. Pour chaque `supplierId`, calcule l'ID Vertex AI : `{documentId}-{supplierId}`
2. Appelle l'API DELETE :
   ```
   DELETE https://discoveryengine.googleapis.com/v1/projects/{projectNumber}/locations/global/collections/default_collection/dataStores/{dataStoreId}/branches/0/documents/{documentId}-{supplierId}
   ```

**Gestion d'Erreurs** :
- Si le document n'existe pas dans l'index (404), c'est normal (peut-être pas encore indexé)
- Les erreurs sont loggées mais ne bloquent PAS la suppression du document
- Le soft-delete dans Supabase et la suppression GCS se font toujours

### Intégration dans les Routes API

#### Upload : `app/api/rfps/[rfpId]/documents/commit/route.ts`

Ligne 200+ (après création de l'association document-supplier) :

```typescript
// ✨ Update Vertex AI Search index with the new document
updateVertexAIIndex({
  documentId,
  supplierId,
  rfpId,
  organizationId: rfp.organization_id,
  documentType,
  filename,
  gcsObjectName: objectName,
}).catch((error) => {
  console.error(
    "[Vertex AI] Failed to update index (non-critical):",
    error
  );
});
```

**Caractéristiques** :
- Appel **asynchrone** (non-bloquant)
- Ne retarde PAS la réponse API
- Les erreurs sont catchées et loggées
- L'upload réussit même si l'indexation échoue

#### Suppression : `app/api/rfps/[rfpId]/documents/route.ts`

Ligne 240+ (après soft-delete et suppression GCS) :

```typescript
// ✨ Remove document from Vertex AI Search index
if (supplierIds.length > 0) {
  removeFromVertexAIIndex(documentId, supplierIds).catch((error) => {
    console.error(
      "[Vertex AI] Failed to remove from index (non-critical):",
      error
    );
  });
}
```

**Caractéristiques** :
- Appel **asynchrone** (non-bloquant)
- Ne retarde PAS la réponse API
- Supprime toutes les entrées document-supplier

## Variables d'Environnement Requises

Définies dans `.env.example` :

```env
# Vertex AI Search Configuration
GCP_VERTEX_AI_PROJECT_NUMBER=895472224132
GCP_VERTEX_AI_LOCATION=global
GCP_VERTEX_AI_ENGINE_ID=rfp-rag-1772536484
GCP_VERTEX_AI_DATA_STORE_ID=rfps_1772495157302_gcs_store

# GCP General (déjà existant)
GCP_PROJECT_ID=rfp-analyzer-477920
GCP_BUCKET_NAME=rfps-documents
GCP_KEY_JSON={"type":"service_account",...}
```

## Monitoring et Debugging

### Logs à Surveiller

**Upload Success** :
```
[Vertex AI] JSONL uploaded to gs://rfps-documents/vertex-metadata/incremental/...
[Vertex AI] Import triggered successfully: projects/.../operations/import-documents-...
[Vertex AI] Cleaned up temp JSONL: vertex-metadata/incremental/...
```

**Upload Failure** :
```
[Vertex AI] Index update failed: Error: ...
[Vertex AI] Failed to update index (non-critical): ...
```

**Delete Success** :
```
[Vertex AI] Deleted document from index: {documentId}-{supplierId}
```

**Delete Not Found** (Normal) :
```
[Vertex AI] Document not found in index (may not have been indexed yet): {documentId}-{supplierId}
```

### Vérifier l'État de l'Index

**Via script de test** :
```bash
./scripts/test-native-filtering.sh
```

Ce script teste que les filtres natifs fonctionnent correctement après indexation.

**Via GCP Console** :
1. Aller dans Vertex AI Search → Data Stores
2. Sélectionner `rfps_1772495157302_gcs_store`
3. Onglet "Documents" pour voir la liste
4. Onglet "Operations" pour voir les imports en cours

**Via API REST** :
```bash
TOKEN=$(gcloud auth print-access-token)

# Lister les documents indexés
curl -X GET \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/dataStores/rfps_1772495157302_gcs_store/branches/0/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Goog-User-Project: rfp-analyzer-477920"
```

## Re-indexation Batch (Fallback)

Si le système automatique échoue ou si vous avez des documents existants non-indexés :

### Script : `scripts/generate-vertex-metadata.ts`

Génère un JSONL pour TOUS les documents existants :

```bash
npm run tsx scripts/generate-vertex-metadata.ts
```

Produit : `vertex-metadata.jsonl`

### Upload et Import :

```bash
./scripts/upload-vertex-metadata.sh
```

### Monitoring de l'Import :

```bash
./scripts/check-import-status.sh <operation-id>
```

## Latence d'Indexation

- **Upload JSONL** : < 1 seconde
- **Déclenchement API Import** : ~2-3 secondes
- **Indexation Vertex AI** : **6-12 heures** (première fois pour un document)
- **Disponibilité recherche** : Après indexation complète
- **Cleanup temp file** : 5 minutes après upload

**Important** : Le document n'est PAS immédiatement cherchable après upload. L'indexation Vertex AI prend plusieurs heures.

## Gestion des Cas Limites

### 1. Document Upload Réussit, Indexation Échoue

**Scénario** : Le fichier est dans GCS et dans Supabase, mais pas dans Vertex AI.

**Impact** : Le document est visible dans l'app mais ne remonte pas dans les recherches RAG.

**Solution** :
1. Vérifier les logs backend : `[Vertex AI] Failed to update index`
2. Lancer une re-indexation batch manuelle
3. Ou simplement attendre : la prochaine batch re-index l'ajoutera

### 2. Document Supprimé, Retrait de l'Index Échoue

**Scénario** : Le document est soft-deleted dans Supabase et supprimé de GCS, mais reste dans Vertex AI.

**Impact** : Le document peut remonter dans les recherches RAG (mais les liens seront cassés).

**Solution** :
1. Le filtre par RFP et supplier dans la route `/vertex-search` élimine déjà les documents supprimés (via `deleted_at IS NULL`)
2. Pas d'action immédiate nécessaire
3. Une batch cleanup peut être lancée périodiquement pour nettoyer l'index

### 3. Import JSONL Bloqué/En Cours

**Scénario** : L'opération d'import reste en état "running" pendant > 24h.

**Impact** : Les nouveaux documents ne sont pas indexés.

**Solution** :
1. Vérifier l'état de l'opération :
   ```bash
   ./scripts/check-import-status.sh <operation-id>
   ```
2. Si bloqué, contacter Google Cloud Support
3. En attendant, les uploads continuent de fonctionner (juste pas indexés)

### 4. Fichier JSONL Temp Non Nettoyé

**Scénario** : Le cleanup après 5 minutes échoue (ex: crash serveur).

**Impact** : Accumulation de fichiers JSONL dans `vertex-metadata/incremental/`.

**Solution** :
1. Créer un cron job pour nettoyer les fichiers JSONL > 1 jour :
   ```bash
   gsutil -m rm -r "gs://rfps-documents/vertex-metadata/incremental/*$(date -d '1 day ago' +%Y%m%d)*"
   ```
2. Ou configurer une lifecycle policy GCS pour auto-delete après 7 jours

## Performance et Coûts

### Coûts d'Indexation

**Par document** :
- Upload JSONL (< 1 KB) : ~$0.000001
- Import API call : ~$0.01
- Indexation Vertex AI : ~$0.05 (inclus dans quota mensuel)

**Total** : ~$0.05 par document

**Pour 100 documents** : ~$5

### Optimisations Possibles

1. **Batch les imports** : Au lieu d'importer 1 document à la fois, accumuler pendant 5 minutes et importer en batch
   - Avantage : Réduit les appels API
   - Inconvénient : Complexité accrue, latence plus longue

2. **Désactiver l'auto-index** : Si trop coûteux, lancer uniquement des batch re-index hebdomadaires
   - Avantage : Réduction des coûts
   - Inconvénient : Documents pas cherchables pendant plusieurs jours

3. **Filtrer par document type** : N'indexer que les `supplier_response`, pas les `cahier_charges`
   - Avantage : Réduction du volume indexé
   - Inconvénient : Perte de fonctionnalité

## Roadmap

### V1 (Actuel)
- ✅ Indexation automatique à l'upload
- ✅ Retrait automatique à la suppression
- ✅ Gestion d'erreurs non-bloquante
- ✅ Logs détaillés

### V2 (Future)
- [ ] Dashboard monitoring : nombre de documents indexés, latence d'indexation
- [ ] Webhook callback de Vertex AI pour savoir quand l'indexation est terminée
- [ ] Retry automatique en cas d'échec d'indexation (avec backoff)
- [ ] Batch import toutes les 5 minutes (au lieu de 1 par 1)

### V3 (Future)
- [ ] Support des mises à jour de documents (ré-upload)
- [ ] Support des documents multi-suppliers (1 document → plusieurs suppliers)
- [ ] Indexation incrémentale des annotations utilisateurs
- [ ] Index séparé par organization (pour isolation complète)

## Références

- [Vertex AI Search - Import Documents](https://cloud.google.com/generative-ai-app-builder/docs/import-data)
- [Discovery Engine API Reference](https://cloud.google.com/generative-ai-app-builder/docs/reference/rest/v1/projects.locations.collections.dataStores.branches.documents/import)
- [Documentation VERTEX_AI_SEARCH_IMPLEMENTATION.md](./VERTEX_AI_SEARCH_IMPLEMENTATION.md)
