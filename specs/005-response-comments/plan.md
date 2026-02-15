# Plan : Fils de commentaires par réponse fournisseur

**Feature Branch** : `005-response-comments`
**Date** : 2026-02-15
**Statut** : Proposition

---

## Contexte

Le peer review actuel (004) fonctionne sur un modèle de validation binaire (approved/rejected) avec un unique champ `rejection_comment`. Il manque un espace de **discussion structurée** par réponse fournisseur permettant aux évaluateurs et owners de :

- Ouvrir des points de discussion ciblés sur une réponse spécifique
- Suivre et clôturer chaque point
- Filtrer les discussions ouvertes pour prioriser le travail restant

Le système de commentaires financiers (`financial_comments`) existe mais est **flat** (pas de threads, pas de résolution, pas de fil de discussion).

---

## 1. Modèle conceptuel

```
RFP
 └── Requirement (exigence)
      └── Response (réponse d'un fournisseur)
           └── Thread (point de discussion)
                ├── status: open | resolved
                ├── priority: normal | important | blocking
                └── Comments (messages du fil)
                     ├── Comment 1 (auteur, contenu, date)
                     ├── Comment 2 (réponse)
                     └── ...
```

**Granularité** : un thread est rattaché à une **réponse** (= intersection exigence × fournisseur), pas à l'exigence seule. Cela permet des discussions ciblées par fournisseur sur la même exigence.

---

## 2. Design UX

### 2.1 Point d'entrée : indicateur dans ComparisonView

Dans la vue de comparaison (`ComparisonView`), chaque carte de réponse fournisseur (`SupplierResponseCard`) affiche un indicateur de commentaires :

```
┌─────────────────────────────────────────────┐
│  Fournisseur A          Score: 4/5          │
│  ─────────────────────────────────────────  │
│  Réponse du fournisseur...                  │
│                                             │
│  [Score IA] [Score Manuel] [Statut]         │
│                                             │
│  💬 3 points · 1 bloquant · 1 résolu    [+] │
│     ↑ cliquable → ouvre le panneau          │
└─────────────────────────────────────────────┘
```

- **Badge compteur** : nombre de threads ouverts, avec indicateur de priorité si un thread est `blocking`
- **Bouton [+]** : créer un nouveau thread directement
- Clic sur le badge → ouvre le **panneau latéral de discussion**

### 2.2 Panneau latéral de discussion (Sheet/Drawer)

Un panneau glissant depuis la droite (réutilisation du pattern `Sheet` existant) affiche tous les threads d'une réponse :

```
┌────────────────────────────────────────┐
│  Discussion — Fournisseur A            │
│  Exigence: REQ-042                     │
│  ──────────────────────────────────── │
│                                        │
│  [Filtres]  Tous | Ouverts | Résolus   │
│  [Tri]  Récents | Priorité             │
│                                        │
│  ┌────────────────────────────────┐    │
│  │ 🔴 BLOQUANT                    │    │
│  │ "Conformité RGPD non démontrée"│    │
│  │                                │    │
│  │  👤 Marie L. · il y a 2h       │    │
│  │  La réponse ne mentionne pas   │    │
│  │  le DPO ni les mesures...      │    │
│  │                                │    │
│  │  👤 Jean D. · il y a 1h        │    │
│  │  J'ai vérifié l'annexe 3,     │    │
│  │  le DPO est mentionné p.12    │    │
│  │                                │    │
│  │  [Répondre...]                 │    │
│  │  [✓ Marquer comme résolu]      │    │
│  └────────────────────────────────┘    │
│                                        │
│  ┌────────────────────────────────┐    │
│  │ ✅ RÉSOLU                       │    │
│  │ "Score IA trop généreux"        │    │
│  │  2 messages · résolu par Jean  │    │
│  │  ▶ Déplier                     │    │
│  └────────────────────────────────┘    │
│                                        │
│  ──────────────────────────────────── │
│  [+ Nouveau point de discussion]       │
└────────────────────────────────────────┘
```

**Comportements clés** :

| Action | Comportement |
|--------|-------------|
| Créer un thread | Formulaire inline : titre (optionnel) + premier message + priorité |
| Répondre | Textarea sous le dernier message du thread |
| Résoudre | Bouton sur le thread → statut passe à `resolved`, thread se replie |
| Rouvrir | Bouton sur un thread résolu → repasse à `open` |
| Supprimer | Uniquement ses propres messages, pas le thread entier (sauf si vide) |
| Éditer | Uniquement ses propres messages, indicateur "modifié" visible |

### 2.3 Vue globale des discussions (page-level)

Un onglet ou bouton dans la barre d'outils de `/evaluate` ouvre une **vue consolidée** de tous les threads du RFP :

```
┌──────────────────────────────────────────────────────┐
│  Points de discussion — RFP "Infra Cloud 2026"       │
│  ────────────────────────────────────────────────── │
│                                                      │
│  Filtres : [Statut ▼] [Priorité ▼] [Fournisseur ▼]  │
│            [Catégorie ▼] [Auteur ▼]                  │
│                                                      │
│  12 ouverts · 3 bloquants · 24 résolus               │
│                                                      │
│  ┌ REQ-012 — Disponibilité 99.9%                     │
│  │  Fournisseur B · 🔴 Bloquant                      │
│  │  "SLA insuffisant — demander clarification"       │
│  │  3 messages · ouvert · Marie L.                    │
│  │  Dernier message: il y a 30min                     │
│  └──────────────────────────── [Voir →]              │
│                                                      │
│  ┌ REQ-045 — Chiffrement au repos                    │
│  │  Fournisseur A · 🟡 Important                     │
│  │  "AES-256 confirmé mais pas certifié"             │
│  │  5 messages · ouvert · Jean D.                     │
│  │  Dernier message: il y a 2h                        │
│  └──────────────────────────── [Voir →]              │
└──────────────────────────────────────────────────────┘
```

**Filtres disponibles** :

| Filtre | Options |
|--------|---------|
| Statut | Tous / Ouverts / Résolus |
| Priorité | Tous / Bloquant / Important / Normal |
| Fournisseur | Multi-select parmi les fournisseurs du RFP |
| Catégorie | Arbre des catégories d'exigences |
| Auteur | Multi-select parmi les membres de l'équipe |
| Mes discussions | Toggle pour ne voir que les threads où je participe |

### 2.4 Indicateurs dans le Sidebar

Le sidebar tree existant peut afficher un petit indicateur à côté de chaque exigence ayant des threads ouverts :

```
├── Infrastructure
│   ├── REQ-012 Disponibilité  💬2 🔴
│   ├── REQ-013 Backup
│   └── REQ-014 Monitoring    💬1
```

- Nombre de threads ouverts
- Point rouge si un thread est `blocking`

### 2.5 Lien avec le peer review

Les threads sont **indépendants** du workflow de peer review mais **complémentaires** :

- Un owner peut rejeter une exigence et ouvrir un thread `blocking` expliquant pourquoi
- Les threads restent visibles même après approbation (traçabilité)
- La vue globale permet de vérifier que tous les points bloquants sont résolus avant validation

---

## 3. Design technique

### 3.1 Modèle de données

#### Table `response_threads`

```sql
CREATE TABLE public.response_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
    title TEXT,  -- titre optionnel du point de discussion
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'blocking')),
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour le fetch par response (cas d'usage principal)
CREATE INDEX idx_response_threads_response ON response_threads(response_id);
-- Index pour la vue globale (tous les threads d'un RFP)
CREATE INDEX idx_response_threads_status ON response_threads(status);
-- Index composé pour les filtres
CREATE INDEX idx_response_threads_response_status ON response_threads(response_id, status);
```

#### Table `thread_comments`

```sql
CREATE TABLE public.thread_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id UUID NOT NULL REFERENCES public.response_threads(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    edited_at TIMESTAMPTZ,  -- NULL = jamais édité
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_thread_comments_thread ON thread_comments(thread_id);
CREATE INDEX idx_thread_comments_author ON thread_comments(author_id);
```

#### Politiques RLS

```sql
-- response_threads : lecture pour tous les membres de l'organisation
CREATE POLICY "org_members_select_threads" ON response_threads FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM responses r
        JOIN rfps rfp ON r.rfp_id = rfp.id
        JOIN user_organizations uo ON uo.organization_id = rfp.organization_id
        WHERE r.id = response_threads.response_id
        AND uo.user_id = auth.uid()
    )
);

-- response_threads : création pour evaluator+
CREATE POLICY "assigned_users_insert_threads" ON response_threads FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM responses r
        JOIN rfp_user_assignments rua ON rua.rfp_id = r.rfp_id
        WHERE r.id = response_threads.response_id
        AND rua.user_id = auth.uid()
        AND rua.access_level IN ('evaluator', 'owner', 'admin')
    )
);

-- response_threads : modification du statut (résolution) pour evaluator+
CREATE POLICY "assigned_users_update_threads" ON response_threads FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM responses r
        JOIN rfp_user_assignments rua ON rua.rfp_id = r.rfp_id
        WHERE r.id = response_threads.response_id
        AND rua.user_id = auth.uid()
        AND rua.access_level IN ('evaluator', 'owner', 'admin')
    )
);

-- thread_comments : même pattern pour lecture
-- thread_comments : création limitée aux evaluator+
-- thread_comments : modification/suppression limitée à l'auteur
```

### 3.2 API Routes

#### `GET /api/rfps/[rfpId]/response-threads`

Récupère tous les threads du RFP avec compteurs, pour la vue globale et les indicateurs sidebar.

```typescript
// Query params
interface ThreadsQueryParams {
    response_id?: string;       // Filtrer par réponse spécifique
    status?: 'open' | 'resolved';
    priority?: 'normal' | 'important' | 'blocking';
    supplier_id?: string;       // Filtrer par fournisseur
    created_by?: string;        // Filtrer par auteur
    include_comments?: boolean; // Inclure les commentaires (défaut: false)
    include_counts?: boolean;   // Inclure les compteurs (défaut: true)
}

// Response
interface ThreadsResponse {
    threads: ResponseThread[];
    counts: {
        total: number;
        open: number;
        resolved: number;
        blocking: number;
    };
}

interface ResponseThread {
    id: string;
    response_id: string;
    title: string | null;
    status: 'open' | 'resolved';
    priority: 'normal' | 'important' | 'blocking';
    created_by: string;
    creator: { email: string; display_name: string | null };
    resolved_by: string | null;
    resolver: { email: string; display_name: string | null } | null;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
    comment_count: number;
    last_comment_at: string | null;
    // Dénormalisé pour la vue globale
    requirement_title?: string;
    requirement_id_external?: string;
    supplier_name?: string;
    // Commentaires inclus si include_comments=true
    comments?: ThreadComment[];
}
```

**Requête SQL optimisée** (pas de N+1) :

```sql
SELECT
    rt.*,
    COUNT(tc.id) AS comment_count,
    MAX(tc.created_at) AS last_comment_at,
    -- Dénormalisation
    req.title AS requirement_title,
    req.requirement_id_external,
    s.name AS supplier_name,
    -- Creator info
    creator.raw_user_meta_data->>'display_name' AS creator_display_name,
    creator.email AS creator_email
FROM response_threads rt
JOIN responses r ON rt.response_id = r.id
JOIN requirements req ON r.requirement_id = req.id
JOIN suppliers s ON r.supplier_id = s.id
LEFT JOIN thread_comments tc ON tc.thread_id = rt.id
LEFT JOIN auth.users creator ON rt.created_by = creator.id
WHERE r.rfp_id = $1
GROUP BY rt.id, req.title, req.requirement_id_external, s.name,
         creator.raw_user_meta_data, creator.email
ORDER BY
    CASE rt.priority WHEN 'blocking' THEN 0 WHEN 'important' THEN 1 ELSE 2 END,
    rt.created_at DESC;
```

#### `POST /api/rfps/[rfpId]/response-threads`

Crée un nouveau thread avec son premier commentaire.

```typescript
interface CreateThreadRequest {
    response_id: string;
    title?: string;
    priority?: 'normal' | 'important' | 'blocking';
    content: string; // Premier commentaire
}
```

#### `PATCH /api/rfps/[rfpId]/response-threads/[threadId]`

Met à jour le statut ou la priorité d'un thread.

```typescript
interface UpdateThreadRequest {
    status?: 'open' | 'resolved';
    priority?: 'normal' | 'important' | 'blocking';
    title?: string;
}
```

#### `GET /api/rfps/[rfpId]/response-threads/[threadId]/comments`

Récupère les commentaires d'un thread spécifique.

#### `POST /api/rfps/[rfpId]/response-threads/[threadId]/comments`

Ajoute un commentaire à un thread.

```typescript
interface CreateCommentRequest {
    content: string;
}
```

#### `PATCH /api/rfps/[rfpId]/response-threads/[threadId]/comments/[commentId]`

Modifie un commentaire (auteur seulement).

#### `DELETE /api/rfps/[rfpId]/response-threads/[threadId]/comments/[commentId]`

Supprime un commentaire (auteur seulement).

### 3.3 Hooks React (TanStack Query v5)

```typescript
// hooks/use-response-threads.ts

// Clés de cache
const threadKeys = {
    all: (rfpId: string) => ['response-threads', rfpId],
    byResponse: (rfpId: string, responseId: string) =>
        ['response-threads', rfpId, { responseId }],
    detail: (rfpId: string, threadId: string) =>
        ['response-threads', rfpId, threadId],
    comments: (rfpId: string, threadId: string) =>
        ['response-threads', rfpId, threadId, 'comments'],
    counts: (rfpId: string) => ['response-threads', rfpId, 'counts'],
};

// Hooks
useResponseThreads(rfpId, filters?)
    → { threads, counts, isLoading }
    // staleTime: 15s (discussions actives)

useResponseThreadsByResponse(rfpId, responseId)
    → { threads, isLoading }
    // Sous-ensemble filtré

useThreadComments(rfpId, threadId)
    → { comments, isLoading }

useCreateThread(rfpId)
    → { mutate({ response_id, title?, priority?, content }) }
    // onSuccess: invalidate threads + counts

useUpdateThread(rfpId)
    → { mutate({ threadId, status?, priority?, title? }) }
    // onSuccess: invalidate threads + counts

useCreateComment(rfpId, threadId)
    → { mutate({ content }) }
    // onSuccess: invalidate comments + thread (pour last_comment_at)

useUpdateComment(rfpId, threadId)
    → { mutate({ commentId, content }) }

useDeleteComment(rfpId, threadId)
    → { mutate(commentId) }
```

### 3.4 Composants React

```
components/
├── response-threads/
│   ├── ThreadIndicator.tsx        # Badge compteur sur SupplierResponseCard
│   ├── ThreadSheet.tsx            # Panneau latéral (Sheet) par réponse
│   ├── ThreadList.tsx             # Liste de threads avec filtres
│   ├── ThreadCard.tsx             # Un thread avec ses messages
│   ├── ThreadCreateForm.tsx       # Formulaire de création de thread
│   ├── CommentItem.tsx            # Un message dans un thread
│   ├── CommentInput.tsx           # Textarea de réponse
│   ├── ThreadFilters.tsx          # Barre de filtres
│   ├── ThreadGlobalView.tsx       # Vue consolidée RFP-level
│   └── ThreadPriorityBadge.tsx    # Badge priorité (normal/important/blocking)
```

**Hiérarchie des composants** :

```
ComparisonView
 └── SupplierResponseCard
      └── ThreadIndicator          ← badge "💬 3 · 🔴"
           └── ThreadSheet         ← panneau latéral
                ├── ThreadFilters  ← open/resolved, priorité
                ├── ThreadList
                │   └── ThreadCard (×N)
                │        ├── ThreadPriorityBadge
                │        ├── CommentItem (×N)
                │        └── CommentInput
                └── ThreadCreateForm

EvaluatePage (toolbar)
 └── ThreadGlobalView             ← vue consolidée
      ├── ThreadFilters
      └── ThreadList (même composant, données différentes)
```

### 3.5 Supabase Realtime (optionnel, Phase 2)

Pour la collaboration en temps réel :

```typescript
// Souscription aux changements sur les threads d'un RFP
const channel = supabase
    .channel(`rfp-${rfpId}-threads`)
    .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'response_threads',
        filter: `response_id=in.(${responseIds.join(',')})`,
    }, (payload) => {
        queryClient.invalidateQueries({ queryKey: threadKeys.all(rfpId) });
    })
    .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'thread_comments',
    }, (payload) => {
        // Invalidate le thread spécifique
        queryClient.invalidateQueries({
            queryKey: threadKeys.comments(rfpId, payload.new.thread_id)
        });
    })
    .subscribe();
```

Phase 1 : polling via TanStack Query (staleTime: 15s), cohérent avec le reste de l'app.

---

## 4. Plan d'implémentation

### Phase 1 — Fondations (DB + API + Types)

| # | Tâche | Fichiers |
|---|-------|----------|
| T01 | Migration SQL : tables + index + RLS | `supabase/migrations/20260215_response_threads.sql` |
| T02 | Types TypeScript | `types/response-thread.ts` |
| T03 | API GET threads (avec compteurs + filtres) | `app/api/rfps/[rfpId]/response-threads/route.ts` |
| T04 | API POST thread (création + 1er commentaire) | idem |
| T05 | API PATCH thread (statut/priorité) | `app/api/rfps/[rfpId]/response-threads/[threadId]/route.ts` |
| T06 | API CRUD commentaires | `app/api/rfps/[rfpId]/response-threads/[threadId]/comments/route.ts` |

### Phase 2 — Hooks + Composants de base

| # | Tâche | Fichiers |
|---|-------|----------|
| T07 | Hooks TanStack Query | `hooks/use-response-threads.ts` |
| T08 | `ThreadPriorityBadge` | `components/response-threads/ThreadPriorityBadge.tsx` |
| T09 | `CommentItem` + `CommentInput` | `components/response-threads/CommentItem.tsx`, `CommentInput.tsx` |
| T10 | `ThreadCard` (thread + messages + réponse) | `components/response-threads/ThreadCard.tsx` |
| T11 | `ThreadCreateForm` | `components/response-threads/ThreadCreateForm.tsx` |

### Phase 3 — Intégration dans ComparisonView

| # | Tâche | Fichiers |
|---|-------|----------|
| T12 | `ThreadIndicator` sur SupplierResponseCard | `components/response-threads/ThreadIndicator.tsx` |
| T13 | `ThreadSheet` (panneau latéral) | `components/response-threads/ThreadSheet.tsx` |
| T14 | `ThreadFilters` | `components/response-threads/ThreadFilters.tsx` |
| T15 | `ThreadList` (assemblage filtres + cards) | `components/response-threads/ThreadList.tsx` |
| T16 | Intégration dans `SupplierResponseCard` | `components/SupplierResponseCard.tsx` (modification) |

### Phase 4 — Vue globale + Sidebar

| # | Tâche | Fichiers |
|---|-------|----------|
| T17 | `ThreadGlobalView` (page-level) | `components/response-threads/ThreadGlobalView.tsx` |
| T18 | Bouton d'accès dans la toolbar evaluate | `app/dashboard/rfp/[rfpId]/evaluate/page.tsx` (modification) |
| T19 | Indicateur threads dans le Sidebar tree | `components/Sidebar.tsx` (modification) |
| T20 | Hook compteurs agrégés par exigence | `hooks/use-response-threads.ts` (extension) |

### Phase 5 — Realtime + Polish

| # | Tâche | Fichiers |
|---|-------|----------|
| T21 | Supabase Realtime subscription | `hooks/use-response-threads.ts` (extension) |
| T22 | Optimistic updates sur création de commentaire | idem |
| T23 | Accessibilité (keyboard nav, aria labels) | tous les composants |
| T24 | Tests unitaires hooks + API | `tests/` |

---

## 5. Considérations

### Performance

- **Fetch bulk** : un seul appel pour tous les threads d'un RFP (avec compteurs agrégés), pas de N+1
- **Lazy loading des commentaires** : les commentaires d'un thread ne sont chargés qu'à l'ouverture du thread (sauf si `include_comments=true`)
- **Index composites** sur `(response_id, status)` pour les requêtes filtrées

### Sécurité

- RLS sur les deux tables, cohérent avec le modèle multi-tenant existant
- Suppression/édition limitée à l'auteur du commentaire
- Vérification `checkRFPAccess()` dans chaque route API (pattern existant)

### Cohérence avec l'existant

- Pattern identique à `financial_comments` pour les hooks TanStack Query
- Réutilisation des composants UI existants (`Sheet`, `Badge`, `Button`, `Popover`)
- Même convention de nommage SQL et TypeScript
- Stale time aligné avec le peer review (15-30s)
- Interface en français, cohérent avec le reste de l'application

### Limites volontaires (V1)

- Pas de @mentions ni de notifications (V2)
- Pas de pièces jointes dans les commentaires (V2)
- Pas de réactions/emoji (V2)
- Pas de markdown riche dans les commentaires — texte brut (V2 : markdown)
- Pas de link automatique avec le peer review (les deux systèmes coexistent)
