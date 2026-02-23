# Implementation Plan: Système de Peer Review

**Branch**: `004-peer-review` | **Date**: 2026-02-13 | **Spec**: [spec.md](./spec.md)

## Summary

Ajout d'un circuit de validation peer review optionnel par RFP. Quand activé, chaque exigence expose un statut (`draft → submitted → approved / rejected`) dans `/evaluate`. Les évaluateurs soumettent, l'owner valide. Lecture seule du statut dans le Sidebar tree et la CategoryAnalysisTable.

Approche technique : nouvelle table `requirement_review_status` + colonne `rfps.peer_review_enabled` + 2 nouveaux endpoints API + hook React Query + 3 composants UI.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 14, React 18, Supabase (PostgreSQL + Auth), Tanstack Query v5, Tailwind CSS
**Storage**: PostgreSQL via Supabase — table `requirement_review_status` + colonne `rfps.peer_review_enabled`
**Testing**: `npm test && npm run lint`
**Target Platform**: Web (Next.js App Router)
**Project Type**: Web application (monorepo Next.js — pas de séparation backend/frontend)
**Performance Goals**: Chargement des statuts en une seule requête (pas de N+1) — cohérent avec `useAllResponses` existant
**Constraints**: RLS Supabase obligatoire sur toutes les nouvelles tables, isolation multi-tenant via `organization_id`
**Scale/Scope**: 50–200 exigences par RFP, 10–50 utilisateurs par organisation

## Constitution Check

_La constitution est un template vide — pas de principes formels définis. Application des principes de facto du projet observés dans le code existant :_

| Principe observé                         | Statut             |
| ---------------------------------------- | ------------------ |
| RLS sur toutes les nouvelles tables      | ✅ Prévu           |
| Pattern tanstack-query pour les hooks    | ✅ Prévu           |
| Contrôle d'accès via `checkRFPAccess`    | ✅ Prévu           |
| Isolation multi-tenant (organization_id) | ✅ Inclus dans RLS |
| Migration SQL versionnée avec timestamp  | ✅ Prévu           |
| Types TypeScript pour toutes les entités | ✅ Prévu           |

## Project Structure

### Documentation (cette feature)

```text
specs/004-peer-review/
├── plan.md              # Ce fichier
├── spec.md              # Spécification fonctionnelle
├── research.md          # Décisions techniques
├── data-model.md        # Schéma DB + types
├── quickstart.md        # Guide d'implémentation
├── contracts/
│   └── api.md           # Contrats API
└── tasks.md             # Généré par /speckit.tasks
```

### Source Code (repository root)

```text
# Nouveaux fichiers
supabase/migrations/
└── 20260213_add_peer_review.sql     ← Migration DB

types/
└── peer-review.ts                   ← Types TypeScript

app/api/rfps/[rfpId]/
├── review-statuses/
│   └── route.ts                     ← GET tous les statuts
└── requirements/[requirementId]/
    └── review-status/
        └── route.ts                 ← PATCH statut

hooks/
└── use-peer-review.ts               ← Hook React Query

components/
├── PeerReviewBadge.tsx              ← Badge statut
├── PeerReviewActionButton.tsx       ← Bouton contextuel
└── PeerReviewConfirmDialog.tsx      ← Modale confirmation

# Fichiers modifiés
app/api/rfps/[rfpId]/route.ts                    ← +peer_review_enabled PATCH
lib/supabase/types.ts                             ← +types peer review
components/ComparisonView.tsx                     ← +badge + bouton
components/Sidebar.tsx                            ← +badge lecture seule
components/RFPSummary/CategoryAnalysisTable.tsx  ← +compteur agrégé
app/dashboard/rfp/[rfpId]/evaluate/page.tsx      ← +passage des props
```

## Phase 0: Research — Résumé

Voir [research.md](./research.md) pour le détail complet.

**Décisions clés** :

1. Table dédiée `requirement_review_status` (vs colonnes dans `requirements`) → supporte le versioning
2. Colonne `rfps.peer_review_enabled BOOLEAN` (vs JSONB) → simple et requêtable
3. Endpoint PATCH dédié par exigence (pas de bulk) → scope initial
4. Transitions validées côté API (pas seulement RLS) → logique conditionnelle par rôle
5. Fetch bulk des statuts via `GET /review-statuses` → évite N+1 dans Sidebar et CategoryAnalysisTable

## Phase 1: Design

### 1.1 Modèle de données

Voir [data-model.md](./data-model.md) pour le SQL complet.

**Résumé** :

```
rfps
  + peer_review_enabled BOOLEAN DEFAULT false

requirement_review_status (nouvelle table)
  id, requirement_id→requirements, version_id→evaluation_versions
  status: 'draft'|'submitted'|'approved'|'rejected'
  submitted_by, submitted_at, reviewed_by, reviewed_at
  rejection_comment, created_at, updated_at
  UNIQUE(requirement_id, version_id)
```

### 1.2 Contrats API

Voir [contracts/api.md](./contracts/api.md) pour le détail complet.

**Nouveaux endpoints** :
| Méthode | URL | Permissions | Rôle |
|---------|-----|-------------|------|
| `PATCH` | `/api/rfps/{rfpId}` | owner/admin | Activer/désactiver peer review |
| `GET` | `/api/rfps/{rfpId}/review-statuses?versionId=...` | tous assignés | Récupérer tous les statuts |
| `PATCH` | `/api/rfps/{rfpId}/requirements/{reqId}/review-status` | selon transition | Changer statut |

### 1.3 Composants UI

**`PeerReviewBadge`** — Indicateur visuel coloré :
| Statut | Couleur | Label |
|--------|---------|-------|
| `draft` | Gris | En cours |
| `submitted` | Bleu | En attente de validation |
| `approved` | Vert | Validé |
| `rejected` | Rouge | Rejeté |

**`PeerReviewActionButton`** — Bouton contextuel selon rôle + statut :

- Évaluateur + `draft` → "Soumettre pour validation"
- Évaluateur + `rejected` → "Soumettre à nouveau"
- Owner + `submitted` → "Valider" / "Rejeter"
- Autres combinaisons → null (aucun bouton)

**`PeerReviewConfirmDialog`** — Modale avec :

- Texte de confirmation contextuel
- Champ commentaire (obligatoire pour rejet, optionnel sinon)
- Boutons Confirmer / Annuler

### 1.4 Hook `usePeerReview`

```typescript
// hooks/use-peer-review.ts
usePeerReviewStatuses(rfpId, versionId)
  → { statuses: Map<requirementId, RequirementReviewStatus>, isLoading, error }

usePeerReviewMutation(rfpId)
  → { mutate(requirementId, request), isLoading }
```

## Complexity Tracking

Aucune violation des principes observés — pas de justification requise.
