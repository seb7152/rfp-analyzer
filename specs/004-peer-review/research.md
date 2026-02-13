# Research: Peer Review System

**Feature**: 004-peer-review
**Date**: 2026-02-13

---

## Decision 1 — Stockage du statut peer review

**Decision**: Table dédiée `requirement_review_status` avec clé composite (`requirement_id`, `version_id`)

**Rationale**: La table dédiée permet un historique complet (who/when), une contrainte UNIQUE propre, et des requêtes optimisées par index. L'alternative d'ajouter des colonnes directement à `requirements` ne supporte pas la granularité par version.

**Alternatives considérées**:
- Colonnes dans `requirements` : trop simple, ne supporte pas le versioning
- JSONB dans `rfps` : aucune intégrité référentielle, difficile à requêter
- Colonnes dans `evaluation_versions` : mauvais niveau de granularité

---

## Decision 2 — Activation du peer review

**Decision**: Colonne booléenne `peer_review_enabled BOOLEAN DEFAULT false` dans la table `rfps`

**Rationale**: Simple, requêtable, et cohérent avec le pattern `analysis_settings` déjà présent. Le toggle est par RFP, ce qui correspond à un champ de premier niveau.

**Alternatives considérées**:
- Dans `analysis_settings JSONB` : possible mais moins typé, pas de contrainte NOT NULL facile

---

## Decision 3 — Endpoint API pour les statuts

**Decision**: Nouveau endpoint `PATCH /api/rfps/[rfpId]/requirements/[requirementId]/review-status`

**Rationale**: Aligné avec le pattern existant des routes imbriquées sous `rfps/[rfpId]/`. La mutation ne concerne qu'un seul requirement à la fois. Le PATCH est approprié pour des mises à jour partielles.

**Alternatives considérées**:
- Endpoint bulk pour plusieurs requirements à la fois : hors scope (pas de propagation de catégorie)
- Extension du endpoint responses : sémantique incorrecte (review_status ≠ response status)

---

## Decision 4 — Activation du toggle (PATCH rfp)

**Decision**: Réutiliser le handler `PATCH /api/rfps/[rfpId]/route.ts` existant en ajoutant `peer_review_enabled` aux champs patchables

**Rationale**: Ce handler existe déjà (`ligne 153`) et suit le pattern de contrôle d'accès `checkRFPAccess`. Il suffit d'ajouter le champ à la whitelist de mise à jour + vérification `owner/admin`.

---

## Decision 5 — Récupération des statuts côté frontend

**Decision**: Hook `usePeerReviewStatuses(rfpId, versionId)` utilisant `GET /api/rfps/[rfpId]/review-statuses?versionId=...`

**Rationale**: Permet de charger tous les statuts d'un RFP en une requête (pour le Sidebar et la CategoryAnalysisTable) plutôt qu'un appel par exigence. Cohérent avec le pattern `useAllResponses`.

**Alternatives considérées**:
- Fetch individuel par requirement : trop de requêtes N+1
- Inclure dans la payload requirements : complexifie le endpoint tree

---

## Decision 6 — RLS policies

**Decision**: Suivre le pattern de `evaluation_versions` migration 023 :
- SELECT pour tous les membres de l'organisation
- INSERT/UPDATE pour owner + evaluator (submit)
- UPDATE vers `approved`/`rejected` restreint côté API (pas uniquement RLS) pour la logique de transition

**Rationale**: Le RLS au niveau DB est trop limité pour exprimer "seulement owner peut approuver". La logique de transition est dans l'API handler qui vérifie `access_level` via `checkRFPAccess`.

---

## Decision 7 — Emplacement UI du badge dans /evaluate

**Decision**: Dans le header de `ComparisonView.tsx`, à côté du titre de l'exigence sélectionnée

**Rationale**: C'est là que le titre de l'exigence est affiché (`h2` ou section header). Le badge + bouton d'action dans ce composant permet une interaction cohérente sans modifier `SupplierResponseCard`.

---

## Patterns de référence dans le codebase

| Pattern | Fichier référence |
|---------|-------------------|
| Hook de fetch | `hooks/use-responses.ts` (tanstack-query) |
| API handler avec auth | `app/api/rfps/[rfpId]/versions/route.ts` |
| Contrôle d'accès | `lib/permissions/rfp-access.ts` |
| Migration + RLS | `supabase/migrations/023_add_evaluation_versions.sql` |
| Badge status UI | `components/ui/status-switch.tsx` |
| Modale confirmation | Pattern `SupplierStatusDialog.tsx` |
