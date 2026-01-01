# Optimisations Architecture MCP Server

**Date**: 2026-01-01
**Objectif**: Capitaliser sur l'existant du projet principal et éliminer les duplications

---

## 🔍 Analyse de Duplication

### 1. Clients Supabase

#### État Actuel ❌

```
/lib/supabase/
├── client.ts        # Browser client (@supabase/ssr)
├── server.ts        # Server client (cookies Next.js)
└── service.ts       # Service role client (admin bypass RLS)

/mcp-server/lib/supabase/
└── client.ts        # DUPLICATION de service.ts
```

**Problème** : `/mcp-server/lib/supabase/client.ts` fait la même chose que `/lib/supabase/service.ts`

#### Recommandation ✅

**Supprimer** `/mcp-server/lib/supabase/client.ts` et **réutiliser** :

```typescript
// Dans mcp-server/lib/mcp/auth/middleware.ts
import { createServiceClient } from "@/lib/supabase/service";

export const getMCPSupabaseClient = (accessToken?: string) => {
  const client = createServiceClient();

  if (accessToken) {
    // Override auth header si PAT fourni
    client.auth.setSession({ access_token: accessToken });
  }

  return client;
};
```

**Avantages** :
- ✅ Une seule source de vérité
- ✅ Maintenance simplifiée
- ✅ Réutilise la configuration du projet principal
- ✅ Évite divergence de comportement

---

### 2. Migrations Supabase

#### État Actuel ❌

```
/supabase/migrations/
├── 001_initial_schema.sql
├── 002_create_categories_table.sql
├── ...
└── 010_add_weight_to_categories.sql

/mcp-server/supabase/migrations/
└── 001_create_pat_tokens.sql       # DUPLICATION
```

**Problème** : Deux dossiers de migrations = risque de désynchronisation

#### Recommandation ✅

**Déplacer** `/mcp-server/supabase/migrations/001_create_pat_tokens.sql` vers `/supabase/migrations/011_create_pat_tokens.sql`

**Supprimer** `/mcp-server/supabase/` entièrement

**Structure cible** :

```
/supabase/migrations/
├── 001_initial_schema.sql
├── ...
├── 010_add_weight_to_categories.sql
├── 011_create_pat_tokens.sql           # ⬅️ MCP PAT
├── 012_create_mcp_audit_logs.sql      # ⬅️ MCP Audit (à créer)
└── 013_add_embeddings_to_requirements.sql  # ⬅️ RAG Phase 3 (futur)
```

**Avantages** :
- ✅ Historique de migration cohérent
- ✅ Une seule commande `supabase db push` pour tout
- ✅ Pas de risque de double application
- ✅ Facilite le déploiement

---

### 3. Types Supabase

#### État Actuel

```
/types/
└── (types généraux du projet)

/mcp-server/types/
├── mcp.ts          # Spécifique MCP
├── database.ts     # POTENTIELLE DUPLICATION
└── api.ts          # Spécifique MCP
```

#### Recommandation ✅

**Option A** (Recommandée) : Générer types depuis schema Supabase

```bash
# À la racine du projet
npx supabase gen types typescript --local > types/supabase-schema.ts
```

Puis dans MCP :

```typescript
// mcp-server/types/database.ts
export type { Database } from "@/types/supabase-schema";

// Extensions MCP spécifiques
export interface MCPAuditLog {
  id: string;
  user_id: string;
  action: string;
  // ...
}
```

**Option B** : Symlink (si besoin de séparation)

```bash
cd mcp-server/types
ln -s ../../types/supabase-schema.ts database.ts
```

---

### 4. Utilitaires Partagés

#### Réutilisation Possible

```typescript
// Depuis /lib/ principal, réutilisables dans MCP :

/lib/supabase/queries.ts       # ✅ Queries RFP/Requirements/Suppliers
/lib/supabase/validators.ts    # ✅ Validation Zod schemas

// Dans mcp-server :
import {
  getRFPById,
  getRequirementsByDomain,
  getSuppliersForRFP
} from "@/lib/supabase/queries";
```

**Avantages** :
- ✅ Pas besoin de réécrire les queries
- ✅ Cohérence avec le frontend
- ✅ Bug fixes appliqués partout

---

## 📋 Mise à Jour IMPLEMENTATION_PLAN.md

### Changements Récents à Intégrer

#### 1. Pagination (Priorité 1) 🆕

**Où** : Phase 1 - Tous les resources/tools liste

**Ajout** :

```markdown
#### 1.X Pagination Système

**Fichier**: `lib/mcp/utils/pagination.ts`

**Spécifications** :
- Limite par défaut : 50 items
- Maximum : 100 items
- Offset-based pagination
- Métadonnées dans réponse :
  ```json
  {
    "pagination": {
      "limit": 50,
      "offset": 0,
      "total": 235,
      "has_more": true
    }
  }
  ```

**Estimation** : 1 jour

**Impacté** :
- `requirements://{rfp_id}/domain/{domain}`
- `get_requirements_scores`
- `get_scores_matrix`
- `responses://{rfp_id}/by-domain`
```

#### 2. Champ `questions` (Priorité 1) 🆕

**Où** : Phase 1 - Schema responses

**Ajout** :

```markdown
#### 1.X Champ Questions/Clarifications

**Fichier**: `supabase/migrations/012_add_questions_to_responses.sql`

**Schema** :
```sql
ALTER TABLE supplier_responses
ADD COLUMN questions TEXT NULL;

COMMENT ON COLUMN supplier_responses.questions IS
'Questions ou clarifications soulevées par le fournisseur';
```

**Usage** : Capturer points nécessitant éclaircissements

**Estimation** : 0.5 jour
```

#### 3. RAG Hybride (Phase 3) 🆕

**Où** : Nouvelle Phase 3 ou Phase 5 selon priorité

**Ajout section complète** :

```markdown
### Phase 5: Recherche Sémantique RAG Hybride (Futur) 🧠

**Objectif** : Recherche intelligente par embeddings vectoriels

#### 5.1 Infrastructure pgvector

**Fichier**: `supabase/migrations/013_add_embeddings_to_requirements.sql`

**Schema** :
```sql
-- Ajouter colonne embedding
ALTER TABLE requirements
ADD COLUMN embedding vector(1536);

-- Index ivfflat pour similarity search
CREATE INDEX requirements_embedding_idx
ON requirements
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Fonction full-text search existante
CREATE INDEX requirements_fts_idx
ON requirements
USING gin(to_tsvector('french', title || ' ' || description));
```

**Estimation** : 1 jour

#### 5.2 Service d'Embedding

**Fichier**: `lib/mcp/services/embedding.ts`

**Responsabilités** :
- Générer embeddings via OpenAI text-embedding-3-small
- Cache des embeddings queries (Redis/Upstash)
- Batch processing lors import N8N

**Estimation** : 2-3 jours

#### 5.3 Tool semantic_search_requirements

**Fichier**: `lib/mcp/tools/search/semantic-search.ts`

**Interface** :
```typescript
{
  query: string,
  rfp_id: string,
  search_mode: "semantic" | "keyword" | "hybrid",  // défaut: hybrid
  top_k: 10,
  filters?: {
    domain_names?: string[],
    min_similarity?: 0.7
  }
}
```

**Algorithme Hybride** :
```typescript
combined_score = 0.7 * similarity_score + 0.3 * keyword_score
```

**Estimation** : 3-4 jours

#### 5.4 Intégration N8N Workflow

**Modification** : Workflow d'import PDF

**Ajout** :
1. Après parsing requirement → Générer embedding
2. Stocker embedding dans colonne
3. Invalider cache si requirement modifié

**Estimation** : 1-2 jours

**Total Phase 5** : 7-10 jours
**Coût opérationnel** : ~$0.0005 par RFP (négligeable)
```

#### 4. HTTP Transport Clarification (Documentation) 🆕

**Où** : Section "Transport Configuration"

**Mise à jour** :

```markdown
### Transport HTTP (Standard MCP 2025-03-26)

**Important** : SSE (Server-Sent Events) est **déprécié** depuis MCP 2025-03-26.

Le serveur utilise **Streamable HTTP** :
- Simple HTTP POST/GET
- Pas de connexion persistente
- Serverless-friendly (Vercel, Cloudflare Workers)
- Compatible Claude Code, Claude Desktop, Claude Web

**Configuration Claude Code** :
```bash
claude mcp add --transport http rfp-analyzer \
  https://votre-app.vercel.app/api/mcp \
  --header "x-pat-token: TOKEN" \
  --header "x-organization-id: ORG_ID" \
  --scope user
```
```

---

## 📁 Structure Cible Optimisée

```
rfp-analyzer/                           # Projet principal
├── lib/
│   └── supabase/
│       ├── client.ts                   # Browser client
│       ├── server.ts                   # Server client (cookies)
│       ├── service.ts                  # ⭐ Service role (réutilisé par MCP)
│       ├── queries.ts                  # ⭐ Queries (réutilisées par MCP)
│       ├── validators.ts               # ⭐ Validation (réutilisée par MCP)
│       └── types.ts
│
├── supabase/
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── ...
│   │   ├── 010_add_weight_to_categories.sql
│   │   ├── 011_create_pat_tokens.sql        # ⭐ MCP PAT
│   │   ├── 012_add_questions_to_responses.sql # ⭐ MCP Questions
│   │   └── 013_add_embeddings.sql            # ⭐ MCP RAG (Phase 3)
│   └── functions/
│
├── types/
│   └── supabase-schema.ts              # ⭐ Généré, réutilisé par MCP
│
└── mcp-server/
    ├── lib/
    │   └── mcp/
    │       ├── auth/
    │       │   └── middleware.ts       # Importe createServiceClient
    │       ├── resources/
    │       ├── tools/
    │       └── utils/
    │           ├── pagination.ts       # 🆕 Système pagination
    │           └── score-calculator.ts
    │
    ├── types/
    │   ├── mcp.ts                      # Types spécifiques MCP
    │   └── api.ts                      # Types réponses API
    │
    ├── SPECS.md
    ├── IMPLEMENTATION_PLAN.md          # ⬅️ À mettre à jour
    └── README.md
```

**Changements** :
- ❌ **Supprimé** : `mcp-server/lib/supabase/` (réutilise `/lib/supabase/`)
- ❌ **Supprimé** : `mcp-server/supabase/` (migrations dans `/supabase/`)
- ❌ **Supprimé** : `mcp-server/types/database.ts` (réutilise `/types/supabase-schema.ts`)
- ✅ **Ajouté** : `lib/mcp/utils/pagination.ts`
- ✅ **Ajouté** : Migrations dans `/supabase/migrations/`

---

## ✅ Actions Recommandées

### Immédiat (Phase 1)

1. **Déplacer migration PAT** :
   ```bash
   mv mcp-server/supabase/migrations/001_create_pat_tokens.sql \
      supabase/migrations/011_create_pat_tokens.sql
   ```

2. **Supprimer dossier supabase MCP** :
   ```bash
   rm -rf mcp-server/supabase/
   ```

3. **Mettre à jour imports** :
   ```typescript
   // Avant
   import { getSupabaseClient } from "./lib/supabase/client";

   // Après
   import { createServiceClient } from "@/lib/supabase/service";
   ```

4. **Créer migration questions** :
   ```sql
   -- supabase/migrations/012_add_questions_to_responses.sql
   ALTER TABLE supplier_responses ADD COLUMN questions TEXT NULL;
   ```

5. **Implémenter pagination** :
   ```typescript
   // lib/mcp/utils/pagination.ts
   export interface PaginationParams {
     limit?: number;  // default: 50, max: 100
     offset?: number; // default: 0
   }

   export interface PaginationMeta {
     limit: number;
     offset: number;
     total: number;
     has_more: boolean;
   }
   ```

### Court Terme (Phase 2-3)

6. **Mettre à jour IMPLEMENTATION_PLAN.md** avec :
   - Section pagination détaillée
   - Section champ questions
   - HTTP transport clarifications
   - RAG hybride en Phase 5

7. **Documenter réutilisation** dans README.md :
   ```markdown
   ## Architecture Partagée

   Le serveur MCP capitalise sur l'infrastructure existante :
   - **Supabase clients** : Réutilise `/lib/supabase/service.ts`
   - **Migrations** : Centralisées dans `/supabase/migrations/`
   - **Queries** : Importe `/lib/supabase/queries.ts`
   - **Types** : Génère depuis schema Supabase
   ```

### Long Terme (Phase 5)

8. **Implémenter RAG** selon spec Priority 6 dans SPECS.md

---

## 📊 Impact Estimé

### Réduction Complexité

- **Fichiers supprimés** : ~5 fichiers dupliqués
- **Lignes de code économisées** : ~200-300 LOC
- **Points de maintenance** : -4 (migrations, clients, types, queries)

### Amélioration Qualité

- ✅ Source de vérité unique pour clients Supabase
- ✅ Historique migrations cohérent
- ✅ Types synchronisés avec schema DB
- ✅ Bug fixes propagent automatiquement

### Temps Développement

- **Économie Phase 1** : 1-2 jours (pas besoin réécrire queries/clients)
- **Économie Long Terme** : 20-30% maintenance réduite

---

## 🚀 Prochaines Étapes

1. Valider ces recommandations avec l'équipe
2. Créer PR avec les changements de structure
3. Mettre à jour IMPLEMENTATION_PLAN.md
4. Documenter dans README.md
5. Tester migration centralisée
6. Déployer et monitorer
