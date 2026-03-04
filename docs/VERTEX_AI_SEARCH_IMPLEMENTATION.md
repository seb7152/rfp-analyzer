# Vertex AI Search RAG Implementation

Documentation complète de l'implémentation du système de recherche RAG avec Vertex AI Search pour RFP Analyzer.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Composants](#composants)
- [Filtrage natif](#filtrage-natif)
- [Métadonnées](#métadonnées)
- [Utilisation](#utilisation)
- [Maintenance](#maintenance)

---

## Vue d'ensemble

### Objectif

Permettre aux utilisateurs de rechercher dans les documents fournisseurs via langage naturel et obtenir des résumés structurés avec citations, filtrés par RFP et fournisseurs actifs.

### Fonctionnalités

- 🔍 **Recherche en langage naturel** dans tous les documents PDF fournisseurs
- 📝 **Résumés générés par IA** avec citations inline [1], [2], etc.
- 🏷️ **Filtrage automatique** par RFP et version d'évaluation active
- 👥 **Sélection de fournisseurs** via badges multi-select
- 📄 **Navigation directe** vers les pages PDF sources
- 🎨 **UI responsive** avec formatage Markdown complet

### Technologies

- **Vertex AI Search** (Google Cloud Discovery Engine) : Moteur de recherche avec génération de résumés
- **Next.js 14 API Routes** : Backend pour authentification et filtrage
- **React Query v5** : Gestion état asynchrone et cache
- **ReactMarkdown** : Rendu des résumés avec syntaxe complète
- **Supabase** : Base de données pour métadonnées et permissions

---

## Architecture

### Flux de données

```
User Query
    ↓
VertexRAGSearch Component (Frontend)
    ↓
POST /api/rfps/[rfpId]/vertex-search
    ↓
1. Auth & Access Control (Supabase)
2. Récupération version active + fournisseurs actifs
3. Construction filtre natif Vertex AI
4. Appel Vertex AI Search API (REST)
5. Enrichissement sources avec noms fournisseurs
    ↓
Response: { summary, sources[], totalResults }
    ↓
ReactMarkdown rendering + Citations + Sources list
```

### Diagramme d'architecture

```
┌─────────────────────────────────────────────────┐
│              User Interface                     │
│  ┌──────────────────────────────────────────┐  │
│  │   VertexRAGSearch Component              │  │
│  │   - Search input                         │  │
│  │   - Supplier badges (multi-select)       │  │
│  │   - Summary display (Markdown)           │  │
│  │   - Sources list with links              │  │
│  └──────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────┘
                 │ React Query (cache 5min)
                 ↓
┌─────────────────────────────────────────────────┐
│          Next.js API Route                      │
│  /api/rfps/[rfpId]/vertex-search               │
│                                                 │
│  1. ✓ Auth check (Supabase)                    │
│  2. ✓ RFP access verification                  │
│  3. ✓ Get active evaluation version            │
│  4. ✓ Filter active suppliers                  │
│  5. ✓ Build native Vertex AI filter            │
│     filter: "rfp_id: ANY(...) AND              │
│              supplier_id: ANY(...)"             │
│  6. ✓ Call Vertex AI Search API                │
│  7. ✓ Enrich sources with supplier names       │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│        Vertex AI Search Engine                  │
│  projects/895472224132/.../rfp-rag-1772536484  │
│                                                 │
│  - 32 documents indexed with metadata           │
│  - Native filtering by rfp_id, supplier_id     │
│  - LLM-generated summaries with citations      │
│  - Extractive answers with page numbers        │
└────────────┬────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────┐
│           Google Cloud Storage                  │
│  gs://rfps-documents/                           │
│  rfps/{org_id}/{rfp_id}/documents/              │
│  {doc_id}-{filename}.pdf                        │
└─────────────────────────────────────────────────┘
```

---

## Composants

### 1. Backend API Route

**Fichier** : `app/api/rfps/[rfpId]/vertex-search/route.ts`

#### Responsabilités

- ✅ Authentification utilisateur via Supabase
- ✅ Vérification accès RFP via `user_organizations`
- ✅ Récupération version d'évaluation active (`evaluation_versions`)
- ✅ Filtrage fournisseurs actifs (`version_supplier_status`)
- ✅ Construction filtre natif Vertex AI
- ✅ Appel API Vertex AI Search (REST)
- ✅ Enrichissement sources avec noms fournisseurs

#### Paramètres d'entrée

```typescript
POST /api/rfps/[rfpId]/vertex-search
Body: {
  query: string;              // Question en langage naturel
  supplierIds?: string[];     // IDs fournisseurs (optionnel)
  pageSize?: number;          // Nombre de résultats (défaut: 5)
  summaryResultCount?: number; // Nombre de sources pour résumé (défaut: 5)
}
```

#### Réponse

```typescript
{
  summary: string;              // Résumé Markdown avec citations [1], [2]
  sources: Array<{
    id: string;                 // ID unique du document
    title: string;              // Nom du fichier
    gcsUri: string;             // URI GCS complet
    pageNumber: number;         // Numéro de page dans le PDF
    excerpt: string;            // Extrait de contenu
    documentId: string;         // UUID du document (rfp_documents)
    supplierName: string | null; // Nom du fournisseur
  }>;
  totalResults: number;         // Nombre total de résultats
}
```

#### Variables d'environnement requises

```env
# Vertex AI Search Configuration
GCP_VERTEX_AI_PROJECT_NUMBER=895472224132
GCP_VERTEX_AI_LOCATION=global
GCP_VERTEX_AI_ENGINE_ID=rfp-rag-1772536484
GCP_VERTEX_AI_DATA_STORE_ID=rfps_1772495157302_gcs_store

# GCP Authentication
GCP_PROJECT_ID=rfp-analyzer-477920
GCP_KEY_JSON={"type":"service_account",...}
```

---

### 2. Frontend Component

**Fichier** : `components/VertexRAGSearch.tsx`

#### Props

```typescript
interface VertexRAGSearchProps {
  rfpId: string;                    // RFP context (required)
  supplierId?: string;              // Single supplier mode (optional)
  suppliers?: Array<{               // Liste fournisseurs pour sélecteur
    id: string;
    name: string;
  }>;
  defaultOpen?: boolean;            // État initial du composant
}
```

#### États UI

```typescript
// Query management
const [query, setQuery] = useState("");
const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);

// React Query for API call
const { data, isFetching, error, refetch } = useQuery({
  queryKey: ["vertex-search", rfpId, query, selectedSupplierIds],
  queryFn: async () => { /* fetch logic */ },
  enabled: false,      // Manual trigger via refetch()
  staleTime: 5 * 60 * 1000, // Cache 5 minutes
  retry: 1
});
```

#### Structure visuelle

```
┌─────────────────────────────────────────────────┐
│  Recherche dans les documents                   │
├─────────────────────────────────────────────────┤
│  [Input: "Posez une question..."]  [🔍 Button] │
│                                                 │
│  Filtrer par fournisseur (optionnel):          │
│  [Badge: Supplier 1] [Badge: Supplier 2] ...   │
├─────────────────────────────────────────────────┤
│  Résumé                      [Badge: 3 sources]│
│  ─────────────────────────────────────────────  │
│  Le planning de Cardiweb implique [1]:         │
│  - Phase 1: Contractualisation [2]             │
│  - Phase 2: Développement [1, 3]               │
│                                                 │
│  Note: Le résumé cite 5 sources mais seules    │
│  3 correspondent aux fournisseurs sélectionnés. │
├─────────────────────────────────────────────────┤
│  Sources (3)                                    │
│  ─────────────────────────────────────────────  │
│  ┌─────────────────────────────────────────┐   │
│  │ ①  Document.pdf  [Badge: Supplier]     │   │
│  │    Page 12                         [Voir]│   │
│  │    "Extrait de contenu..."              │   │
│  └─────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────┐   │
│  │ ②  Autre.pdf  [Badge: Supplier]        │   │
│  │    Page 5                          [Voir]│   │
│  │    "Autre extrait..."                   │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### Styling

- **Citations inline** : `bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs`
- **Numéros sources** : Cercles bleus `w-6 h-6 rounded-full bg-blue-100`
- **Formatage compact** : `text-sm` pour tout le contenu
- **Dark mode** : Support complet avec `dark:` variants

---

### 3. Intégrations

#### Page Summary (`/dashboard/rfp/[rfpId]/summary`)

**Placement** : Nouvel onglet "Recherche" dans le système de tabs

```tsx
<button onClick={() => setActiveTab("search")}>
  <Search className="h-4 w-4" />
  <span className="hidden sm:inline">Recherche</span>
</button>

<TabsContent value="search" className="space-y-6">
  <VertexRAGSearch
    rfpId={rfpId}
    suppliers={suppliersForExport.map(s => ({ id: s.id, name: s.name }))}
  />
</TabsContent>
```

#### Page Evaluate (`/dashboard/rfp/[rfpId]/evaluate`)

**Placement** : Drawer (Sheet) avec bouton dans le header

```tsx
// State
const [searchOpen, setSearchOpen] = useState(false);

// Button in header
<Button onClick={() => setSearchOpen(true)}>
  <Search className="h-4 w-4" />
  <span className="hidden sm:inline">Recherche</span>
</Button>

// Drawer
<Sheet open={searchOpen} onOpenChange={setSearchOpen}>
  <SheetContent side="right" className="w-full sm:max-w-3xl">
    <VertexRAGSearch
      rfpId={params.rfpId}
      supplierId={supplierId || undefined}
      suppliers={suppliers}
    />
  </SheetContent>
</Sheet>
```

---

## Filtrage natif

### 🎯 Syntaxe correcte (CRITICAL)

**❌ NE FONCTIONNE PAS** (documentation Google trompeuse) :
```javascript
filter: "structData.rfp_id: ANY(\"uuid\")"
```

**✅ SYNTAXE CORRECTE** pour unstructured data stores :
```javascript
filter: "rfp_id: ANY(\"uuid\")"
```

### Exemples de filtres

```javascript
// Filtre par RFP uniquement
filter: "rfp_id: ANY(\"4fef2cbb-30df-45af-a1ce-f9fa11ec2d54\")"

// Filtre par un fournisseur
filter: "supplier_id: ANY(\"9ad3365a-d563-4831-87fa-e7b0c9f33c09\")"

// Filtre par plusieurs fournisseurs
filter: "supplier_id: ANY(\"uuid1\", \"uuid2\", \"uuid3\")"

// Filtre combiné RFP + Suppliers
filter: "rfp_id: ANY(\"rfp-uuid\") AND supplier_id: ANY(\"sup1\", \"sup2\")"

// Filtre par type de document
filter: "document_type: ANY(\"supplier_response\")"

// Filtre par organisation (tous RFPs)
filter: "organization_id: ANY(\"org-uuid\")"
```

### Construction du filtre dans l'API

```typescript
// 1. Toujours filtrer par RFP courant
let filter = `rfp_id: ANY("${params.rfpId}")`;

// 2. Ajouter filtre fournisseurs si sélectionnés
if (activeSupplierIds.length > 0) {
  const supplierFilter = activeSupplierIds
    .map((id) => `"${id}"`)
    .join(", ");
  filter += ` AND supplier_id: ANY(${supplierFilter})`;
}

// 3. Passer le filtre à Vertex AI
const requestBody = {
  query,
  pageSize: Number(pageSize),
  filter, // ✨ Filtrage natif
  contentSearchSpec: {
    summarySpec: {
      summaryResultCount: Number(summaryResultCount),
      includeCitations: true
    }
  }
};
```

### Avantages du filtrage natif

- ✅ **Performance** : Pas de sur-fetch (plus de `pageSize * 5`)
- ✅ **Précision** : Résumés générés uniquement à partir des documents filtrés
- ✅ **Citations complètes** : Toutes les citations [1-5] ont des sources correspondantes
- ✅ **Code simple** : Suppression de 119 lignes de post-filtrage client-side

---

## Métadonnées

### Structure des métadonnées

Chaque document indexé dans Vertex AI contient :

```json
{
  "id": "doc-uuid-supplier-uuid",
  "structData": {
    "rfp_id": "uuid",
    "supplier_id": "uuid",
    "organization_id": "uuid",
    "document_type": "supplier_response",
    "filename": "document.pdf"
  },
  "content": {
    "mimeType": "application/pdf",
    "uri": "gs://rfps-documents/path/to/file.pdf"
  }
}
```

### Génération des métadonnées

**Script** : `scripts/generate-vertex-metadata.ts`

```bash
# Générer le fichier JSONL depuis Supabase
npx tsx scripts/generate-vertex-metadata.ts

# Résultat : vertex-metadata.jsonl (50 entrées)
```

**Format JSONL** :

```jsonl
{"id":"doc1","structData":{"rfp_id":"...","supplier_id":"..."},"content":{"mimeType":"application/pdf","uri":"gs://..."}}
{"id":"doc2","structData":{"rfp_id":"...","supplier_id":"..."},"content":{"mimeType":"application/pdf","uri":"gs://..."}}
```

### Upload et import

**Script** : `scripts/upload-vertex-metadata.sh`

```bash
# Upload vers GCS
./scripts/upload-vertex-metadata.sh

# Import dans Vertex AI (automatique dans le script)
# Mode: FULL (écrase et réindexe)
# Durée: ~2-5 minutes
```

**Import via API REST** :

```bash
TOKEN=$(gcloud auth print-access-token)

curl -X POST \
  "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/dataStores/rfps_1772495157302_gcs_store/branches/default_branch/documents:import" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Goog-User-Project: rfp-analyzer-477920" \
  -H "Content-Type: application/json" \
  -d '{
    "gcsSource": {
      "inputUris": ["gs://rfps-documents/metadata/vertex-metadata.jsonl"],
      "dataSchema": "document"
    },
    "reconciliationMode": "FULL"
  }'
```

### État actuel

- ✅ **32 documents** importés avec succès
- ❌ **18 échecs** : PDFs corrompus/supprimés (`FILE_READ_ERROR`)
- ✅ **Schéma automatique** : Tous les champs `indexable: true`
- ✅ **Indexation complète** : Terminée (`indexTime: 2026-03-03T23:39:23Z`)

---

## Utilisation

### Cas d'usage typiques

#### 1. Recherche multi-fournisseurs (Page Summary)

```
User Action: Ouvre l'onglet "Recherche"
User Action: Sélectionne 3 fournisseurs via badges
User Input: "Quel est le planning proposé ?"
User Action: Clique "Rechercher"

Result:
- Résumé comparatif des 3 plannings
- Citations [1] à [5] avec toutes les sources
- Navigation directe vers chaque page PDF
```

#### 2. Recherche single-fournisseur (Page Evaluate)

```
User Context: Sur page évaluation d'un fournisseur spécifique
User Action: Clique bouton "Recherche" (ouvre drawer)
User Input: "Quelles sont les références client ?"
User Action: Clique "Rechercher"

Result:
- Résumé des références du fournisseur courant
- Filtrage automatique sur ce fournisseur
- Sources uniquement de ce fournisseur
```

#### 3. Recherche sans filtre fournisseur

```
User Action: Onglet "Recherche" sans sélectionner de fournisseur
User Input: "Analyse comparative des prix"

Result:
- Recherche dans TOUS les fournisseurs actifs
- Résumé comparatif global
- Sources de tous les fournisseurs
```

### Cas limites gérés

#### Aucun fournisseur actif

```json
{
  "summary": "Aucun fournisseur actif trouvé dans la version d'évaluation actuelle.",
  "sources": [],
  "totalResults": 0
}
```

#### Query vide

- Bouton "Rechercher" désactivé
- Pas d'appel API

#### Erreur réseau

```
UI: Message d'erreur avec bouton "Réessayer"
Retry logic: 1 tentative automatique (React Query)
```

#### Citations sans sources

Si le résumé cite [1-5] mais seulement 3 sources disponibles :
- Badge : "3 sources disponibles"
- Note explicative : "Le résumé cite 5 sources mais seules 3 correspondent..."

**Note** : Avec le filtrage natif, ce cas ne devrait plus arriver !

---

## Maintenance

### Mise à jour des métadonnées

**Quand régénérer ?**

- ✅ Nouveau document uploadé
- ✅ Document supprimé (soft delete)
- ✅ Association document-fournisseur modifiée
- ✅ Changement de type de document

**Fréquence recommandée** :

- **MVP** : Batch hebdomadaire (cron job dimanche 2h)
- **Production** : Incrémental en temps réel (edge function)

**Commandes** :

```bash
# Génération + Upload + Import complet
npx tsx scripts/generate-vertex-metadata.ts && \
./scripts/upload-vertex-metadata.sh

# Monitoring de l'import
./scripts/check-import-status.sh import-documents-XXXXXXX
```

### Test du filtrage natif

**Script** : `scripts/test-native-filtering.sh`

```bash
# Tester tous les types de filtres
./scripts/test-native-filtering.sh

# Résultat attendu:
# ✅ Filtre par rfp_id: 6 résultats
# ✅ Filtre par supplier_id: 2 résultats
# ✅ Filtre combiné: N résultats
```

### Monitoring et logs

**Vertex AI Console** :
- Operations : https://console.cloud.google.com/gen-app-builder/engines
- Engine ID : `rfp-rag-1772536484`
- Data Store : `rfps_1772495157302_gcs_store`

**Logs API Route** (dans Next.js console) :

```
[Vertex Search] Query: planning
[Vertex Search] Native filter: rfp_id: ANY("...") AND supplier_id: ANY("...")
[Vertex Search] Active suppliers count: 3
[Vertex Search] Requesting pageSize: 5, summaryResultCount: 5
[Vertex Search] Response total results: 6
[Vertex Search] Response results count: 5
```

### Troubleshooting

#### Filtre ne retourne aucun résultat

1. **Vérifier syntaxe** : Pas de préfixe `structData.` !
   ```javascript
   // ❌ Incorrect
   filter: "structData.rfp_id: ANY(...)"

   // ✅ Correct
   filter: "rfp_id: ANY(...)"
   ```

2. **Vérifier métadonnées** du document :
   ```bash
   TOKEN=$(gcloud auth print-access-token)
   curl -s -X GET \
     "https://discoveryengine.googleapis.com/v1/projects/895472224132/locations/global/collections/default_collection/dataStores/rfps_1772495157302_gcs_store/branches/0/documents/DOC_ID" \
     -H "Authorization: Bearer $TOKEN" \
     -H "X-Goog-User-Project: rfp-analyzer-477920" | jq '.structData'
   ```

3. **Vérifier indexation** :
   ```bash
   # Chercher sans filtre d'abord
   curl -s -X POST ".../search" \
     -d '{"query": "planning", "pageSize": 3}' | jq '.totalSize'
   ```

#### Résumé cite plus de sources que retourné

**Cause** : Filtrage natif non appliqué ou syntaxe incorrecte

**Solution** : Vérifier que le paramètre `filter` est bien passé dans `requestBody`

#### Performance lente

**Diagnostic** :
- Cache React Query : 5 minutes (vérifier `staleTime`)
- Vertex AI latence : ~2-4 secondes normalement
- Supabase queries : Vérifier indexes sur `version_supplier_status`

**Optimisations** :
- Réduire `summaryResultCount` si résumés trop longs
- Augmenter `staleTime` du cache React Query
- Ajouter index sur `(version_id, supplier_id, is_active)`

---

## Ressources

### Documentation officielle

- [Vertex AI Search - Filter search metadata](https://cloud.google.com/generative-ai-app-builder/docs/filter-search-metadata)
- [Prepare data for ingesting](https://cloud.google.com/generative-ai-app-builder/docs/prepare-data)
- [Import documents API](https://cloud.google.com/generative-ai-app-builder/docs/import-data)
- [Discovery Engine API Reference](https://cloud.google.com/generative-ai-app-builder/docs/reference/rest)

### Fichiers clés

```
app/
├── api/rfps/[rfpId]/vertex-search/route.ts  # API backend
components/
├── VertexRAGSearch.tsx                       # Composant frontend
scripts/
├── generate-vertex-metadata.ts               # Génération JSONL
├── upload-vertex-metadata.sh                 # Upload GCS + Import
├── check-import-status.sh                    # Monitoring import
└── test-native-filtering.sh                  # Tests filtrage
docs/
├── VERTEX_AI_SEARCH_IMPLEMENTATION.md        # Ce document
├── VERTEX_AI_METADATA.md                     # Doc métadonnées (ancienne)
└── VERTEX_AI_FILTERING_STATUS.md             # État filtrage (historique)
```

### Quotas et limites

- **Import operations** : 100/jour
- **Document updates** : 1000/minute
- **Search requests** : 60/minute/projet
- **Documents total** : 100K (tier gratuit)

Source : https://cloud.google.com/generative-ai-app-builder/quotas

---

## Changelog

### 2026-03-04 : Filtrage natif fonctionnel 🎉

- ✅ Découverte syntaxe correcte (sans `structData.`)
- ✅ Suppression post-filtrage client-side (119 lignes)
- ✅ Toutes citations présentes dans résumé
- ✅ Performance améliorée (plus de multiplier)

### 2026-03-03 : Import métadonnées

- ✅ 32/50 documents importés avec succès
- ✅ Schéma automatiquement configuré
- ✅ Indexation complète terminée
- ❌ Filtrage natif échouait (syntaxe incorrecte)

### 2026-03-03 : Création composant RAG

- ✅ Composant `VertexRAGSearch` créé
- ✅ API route avec post-filtrage
- ✅ Intégration pages Summary et Evaluate
- ✅ UI avec formatage Markdown compact
