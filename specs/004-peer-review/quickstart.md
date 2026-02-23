# Quickstart: Peer Review System

**Feature**: 004-peer-review
**Date**: 2026-02-13

---

## Vue d'ensemble rapide

Le peer review est un circuit de validation optionnel par RFP. Quand activé, chaque exigence passe par les états `draft → submitted → approved` (ou `rejected → draft`). Seul l'owner du RFP peut valider.

---

## Fichiers à créer

| Fichier                                                                    | Rôle                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------ |
| `supabase/migrations/20260213_add_peer_review.sql`                         | Migration DB (table + colonne)                   |
| `types/peer-review.ts`                                                     | Types TypeScript partagés                        |
| `app/api/rfps/[rfpId]/review-statuses/route.ts`                            | GET tous les statuts                             |
| `app/api/rfps/[rfpId]/requirements/[requirementId]/review-status/route.ts` | PATCH statut d'une exigence                      |
| `hooks/use-peer-review.ts`                                                 | Hook React Query pour les statuts                |
| `components/PeerReviewBadge.tsx`                                           | Badge status (draft/submitted/approved/rejected) |
| `components/PeerReviewActionButton.tsx`                                    | Bouton contextuel selon rôle+statut              |
| `components/PeerReviewConfirmDialog.tsx`                                   | Modale confirmation (avec champ commentaire)     |

---

## Fichiers à modifier

| Fichier                                           | Modification                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `app/api/rfps/[rfpId]/route.ts`                   | Ajouter `peer_review_enabled` aux champs patchables (owner only)                    |
| `lib/supabase/types.ts`                           | Ajouter types `requirement_review_status` et champ `peer_review_enabled` sur `rfps` |
| `components/ComparisonView.tsx`                   | Intégrer `PeerReviewBadge` + `PeerReviewActionButton` dans le header exigence       |
| `components/Sidebar.tsx`                          | Ajouter indicateur visuel peer review sur les nœuds exigence                        |
| `components/RFPSummary/CategoryAnalysisTable.tsx` | Ajouter colonne/indicateur agrégé peer review                                       |
| `app/dashboard/rfp/[rfpId]/evaluate/page.tsx`     | Passer `peerReviewEnabled` et statuts aux composants enfants                        |

---

## Ordre d'implémentation recommandé

```
1. Migration DB
   └── supabase/migrations/20260213_add_peer_review.sql

2. Types
   └── types/peer-review.ts
   └── lib/supabase/types.ts (ajout)

3. Backend
   ├── PATCH /api/rfps/[rfpId] → peer_review_enabled
   ├── GET /api/rfps/[rfpId]/review-statuses
   └── PATCH /api/rfps/[rfpId]/requirements/[requirementId]/review-status

4. Hook frontend
   └── hooks/use-peer-review.ts

5. Composants UI
   ├── PeerReviewBadge.tsx
   ├── PeerReviewActionButton.tsx
   └── PeerReviewConfirmDialog.tsx

6. Intégration dans /evaluate
   └── ComparisonView.tsx (badge + bouton)

7. Visibilité lecture seule
   ├── Sidebar.tsx (badge par nœud)
   └── CategoryAnalysisTable.tsx (compteur agrégé)
```

---

## Variables d'environnement

Aucune nouvelle variable d'environnement nécessaire. Les variables Supabase existantes sont suffisantes.

---

## Test rapide (manuel)

1. Ouvrir un RFP → Paramètres → activer "Peer Review"
2. Ouvrir `/evaluate` → vérifier que les badges `draft` apparaissent sur les exigences
3. En tant qu'évaluateur → cliquer "Soumettre pour validation" sur une exigence → badge passe à `submitted`
4. Se connecter en tant qu'owner → badge `submitted` visible → cliquer "Valider" → badge `approved`
5. Tester le rejet : owner clique "Rejeter" avec commentaire → badge repasse à `draft` avec commentaire visible
6. Vérifier dans Sidebar : badges visibles en lecture seule
7. Vérifier dans CategoryAnalysisTable : "X/Y approuvés" par catégorie
