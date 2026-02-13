# Tasks: Système de Peer Review

**Input**: Design documents from `/specs/004-peer-review/`
**Branch**: `004-peer-review`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅, quickstart.md ✅

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no shared dependencies)
- **[Story]**: User story this task belongs to (US1–US4)

---

## Phase 1: Setup (Infrastructure partagée)

**Purpose**: Nouveaux types TypeScript et migration DB — bloquants pour tout le reste.

- [x] T001 Créer le fichier de types `types/peer-review.ts` avec `PeerReviewStatus`, `RequirementReviewStatus`, `UpdateReviewStatusRequest`
- [x] T002 Créer la migration Supabase `supabase/migrations/20260213_add_peer_review.sql` : colonne `rfps.peer_review_enabled BOOLEAN DEFAULT false` + table `requirement_review_status` + index + trigger `updated_at` + RLS policies (SELECT membres org, INSERT/UPDATE membres assignés)
- [x] T003 Mettre à jour `lib/supabase/types.ts` : ajouter `peer_review_enabled` sur le type `rfps`, ajouter les types `requirement_review_status` (insert, update, row)

---

## Phase 2: Fondation (Prérequis bloquants)

**Purpose**: Backend API complet — nécessaire avant toute intégration frontend.

**⚠️ CRITIQUE** : Les phases US1–US4 ne peuvent pas démarrer tant que cette phase n'est pas terminée.

- [x] T004 Étendre le handler PATCH `app/api/rfps/[rfpId]/route.ts` : ajouter `peer_review_enabled` à la whitelist des champs patchables, restreindre cette modification aux `access_level IN ('owner', 'admin')` via `checkRFPAccess`
- [x] T005 Créer le handler GET `app/api/rfps/[rfpId]/review-statuses/route.ts` : récupérer tous les `requirement_review_status` d'un RFP pour un `versionId` donné (query param requis), retourner `{ statuses: RequirementReviewStatus[] }`, contrôle d'accès `viewer+`
- [x] T006 Créer le handler PATCH `app/api/rfps/[rfpId]/requirements/[requirementId]/review-status/route.ts` : implémenter la matrice de transitions (`draft→submitted` pour evaluator/owner, `submitted→approved` pour owner/admin, `submitted→rejected→draft` pour owner/admin), valider que `peer_review_enabled` est actif sur le RFP, upsert dans `requirement_review_status`, retourner `{ review_status }` ou `400` si transition invalide
- [x] T007 [P] Créer le hook React Query `hooks/use-peer-review.ts` : `usePeerReviewStatuses(rfpId, versionId)` → fetch `GET /review-statuses`, retourner un `Map<requirementId, RequirementReviewStatus>` + `isLoading` + `error` ; `usePeerReviewMutation(rfpId)` → PATCH `/review-status`, invalidation du cache tanstack-query sur succès

**Checkpoint** : API + hook prêts — les stories US1–US4 peuvent démarrer en parallèle.

---

## Phase 3: US1 — Activation du peer review (Priority: P1) 🎯 MVP

**Goal**: L'owner peut activer/désactiver le peer review sur un RFP depuis les paramètres. Les badges apparaissent dans `/evaluate` quand activé.

**Independent Test**: Activer le toggle sur un RFP → ouvrir `/evaluate` → vérifier que les badges `draft` apparaissent sur les exigences.

- [ ] T008 [US1] Créer le composant `components/PeerReviewBadge.tsx` : badge coloré selon statut (`draft`=gris, `submitted`=bleu, `approved`=vert, `rejected`=rouge), props `{ status: PeerReviewStatus, className? }`, label FR par statut ("En cours" / "En attente" / "Validé" / "Rejeté")
- [ ] T009 [US1] Ajouter le toggle "Peer Review" dans la page ou composant de paramètres RFP existant (vérifier `app/dashboard/rfp/[rfpId]/` pour trouver le composant de settings) : switch activable par owner/admin uniquement, appel `PATCH /api/rfps/{rfpId}` avec `{ peer_review_enabled }`, feedback visuel (toast succès/erreur)
- [ ] T010 [US1] Modifier `app/dashboard/rfp/[rfpId]/evaluate/page.tsx` : récupérer `rfp.peer_review_enabled` et la version active, conditionner le rendu des badges peer review, passer `peerReviewEnabled`, `reviewStatuses` et `userAccessLevel` aux composants enfants
- [ ] T011 [US1] Modifier `components/ComparisonView.tsx` : dans le header de l'exigence sélectionnée, afficher `<PeerReviewBadge>` conditionné à `peerReviewEnabled`, positionné à côté du titre de l'exigence

---

## Phase 4: US2 — Soumission par l'évaluateur (Priority: P1) 🎯 MVP

**Goal**: L'évaluateur peut soumettre une exigence pour validation (draft → submitted) avec confirmation. Badge mis à jour immédiatement.

**Independent Test**: Sur RFP avec peer review actif, cliquer "Soumettre" sur une exigence en `draft` → confirmer → badge passe à `submitted` → bouton disparaît.

**Dépend de**: US1 (badge), Phase 2 (endpoint PATCH review-status, hook mutation)

- [ ] T012 [US2] Créer le composant `components/PeerReviewConfirmDialog.tsx` : modale de confirmation générique pour toute action peer review, props `{ open, onConfirm, onCancel, title, description, showCommentField?, commentLabel?, isLoading }`, champ commentaire textarea affiché conditionnellement (pour rejet)
- [ ] T013 [US2] Créer le composant `components/PeerReviewActionButton.tsx` : bouton contextuel selon `{ status, userAccessLevel }` → rendu null si aucune action disponible ; cas evaluator+`draft` → bouton "Soumettre pour validation" ; cas evaluator+`rejected` → bouton "Soumettre à nouveau" ; cas owner+`submitted` → boutons "Valider" + "Rejeter" ; ouvre `PeerReviewConfirmDialog` avec contenu adapté, appelle `usePeerReviewMutation` à la confirmation
- [ ] T014 [US2] Modifier `components/ComparisonView.tsx` : intégrer `<PeerReviewActionButton>` dans le header de l'exigence, à côté du `PeerReviewBadge`, passer `status`, `userAccessLevel`, `requirementId`, `versionId`

---

## Phase 5: US3 — Validation/Rejet par l'owner (Priority: P1) 🎯 MVP

**Goal**: L'owner voit les boutons "Valider" / "Rejeter" sur les exigences `submitted`, peut valider (→ approved) ou rejeter (→ draft) avec commentaire optionnel.

**Independent Test**: Connecté en owner, exigence en `submitted` → cliquer "Valider" → badge `approved` ; cliquer "Rejeter" avec commentaire → badge repasse à `draft`.

**Dépend de**: US1 (badge), US2 (PeerReviewActionButton + PeerReviewConfirmDialog déjà créés)

- [ ] T015 [US3] Vérifier et compléter `components/PeerReviewActionButton.tsx` : s'assurer que le cas owner/admin + `submitted` déclenche bien les deux boutons "Valider" et "Rejeter", que la modale rejet affiche le champ commentaire, que le commentaire est passé dans le body du PATCH
- [ ] T016 [US3] Vérifier le handler `app/api/rfps/[rfpId]/requirements/[requirementId]/review-status/route.ts` : tester manuellement la transition `submitted → rejected` avec `rejection_comment`, s'assurer que le statut repasse bien à `draft` (pas `rejected` comme statut final) selon la spécification — corriger si nécessaire

---

## Phase 6: US4 — Visibilité Sidebar + CategoryAnalysisTable (Priority: P2)

**Goal**: Badges peer review en lecture seule dans le Sidebar tree. Compteur agrégé "X/Y approuvés" par catégorie dans CategoryAnalysisTable. Visibilité conditionnelle à `peer_review_enabled`.

**Independent Test**: Avec plusieurs exigences à différents statuts → Sidebar affiche les badges corrects ; CategoryAnalysisTable affiche le bon décompte par catégorie.

**Dépend de**: Phase 2 (hook `usePeerReviewStatuses`)

- [ ] T017 [P] [US4] Modifier `components/Sidebar.tsx` : accepter props `peerReviewEnabled` et `reviewStatuses: Map<requirementId, RequirementReviewStatus>`, afficher `<PeerReviewBadge>` (taille réduite, `sm`) sur chaque nœud feuille d'exigence (level 4) conditionné à `peerReviewEnabled`, statut implicite `draft` si absence dans la map
- [ ] T018 [P] [US4] Modifier `components/RFPSummary/CategoryAnalysisTable.tsx` : accepter props `peerReviewEnabled` et `reviewStatuses`, ajouter une colonne "Validation" affichant le compteur "X/Y" (approved / total leaf requirements) par catégorie si `peerReviewEnabled`, calculer les totaux côté composant depuis la map
- [ ] T019 [US4] Mettre à jour `app/dashboard/rfp/[rfpId]/evaluate/page.tsx` : passer `peerReviewEnabled` et `reviewStatuses` au composant `Sidebar`
- [ ] T020 [US4] Vérifier que `reviewStatuses` est déjà accessible depuis la page summary/CategoryAnalysisTable — si elle utilise son propre contexte de données, passer les props ou adapter le hook `usePeerReviewStatuses` depuis la page parente

---

## Phase Finale: Polish & Cas transversaux

- [ ] T021 [P] Gérer l'état loading dans `PeerReviewBadge` et `PeerReviewActionButton` : spinner ou état désactivé pendant la mutation en cours (éviter double-submit)
- [ ] T022 [P] Ajouter toast de feedback après chaque action peer review (soumission, validation, rejet) en réutilisant le hook `use-toast` existant (`hooks/use-toast.ts`)
- [ ] T023 [P] Masquer tous les composants peer review quand `peer_review_enabled = false` — audit des 5 composants modifiés pour vérifier la condition est bien appliquée partout (`ComparisonView`, `Sidebar`, `CategoryAnalysisTable`, page evaluate)
- [ ] T024 Vérifier le cas edge "nouvelle version créée" : les statuts peer review ne doivent pas apparaître pour une version sur laquelle aucun statut n'a été enregistré (comportement implicite `draft` — vérifier que le hook gère correctement un `Map` vide)
- [ ] T025 Exécuter `npm test && npm run lint` et corriger les erreurs TypeScript ou lint introduites par la feature

---

## Dépendances entre stories

```
Phase 1 (Setup)
  └── Phase 2 (Fondation: API + Hook)
        ├── Phase 3 (US1: Toggle + Badge) ──────────────┐
        │     └── Phase 4 (US2: Soumission évaluateur)  │
        │           └── Phase 5 (US3: Validation owner) │
        └── Phase 6 (US4: Sidebar + Table) ─────────────┘ (parallélisable avec US1-3)
```

### Dépendances inter-stories

- **US1** (P1) : Nécessite Phase 2 — sans autre dépendance
- **US2** (P1) : Nécessite US1 (`PeerReviewBadge` et infrastructure evaluate)
- **US3** (P1) : Nécessite US2 (`PeerReviewActionButton` + `PeerReviewConfirmDialog` déjà créés)
- **US4** (P2) : Nécessite Phase 2 uniquement — peut démarrer en parallèle de US1–US3

---

## Opportunités de parallélisation

### Phase 2 — tâches parallélisables entre développeurs
```
T004 (PATCH rfp toggle)
T005 (GET review-statuses)     ← tous les 3 en parallèle si 3 devs
T006 (PATCH review-status)
T007 (hook usePeerReview)      ← peut aussi démarrer en parallèle
```

### Phase 6 — US4 en parallèle avec US1–US3
```
T017 (Sidebar badges)          ← parallèle avec US2/US3
T018 (CategoryAnalysisTable)   ← parallèle avec US2/US3
```

### Phase Finale
```
T021 + T022 + T023             ← tous en parallèle (fichiers différents)
```

---

## Stratégie d'implémentation

### MVP (US1 + US2 + US3 uniquement — 14 tâches)

1. Compléter **Phase 1** (T001–T003) — types + migration
2. Compléter **Phase 2** (T004–T007) — API + hook
3. Compléter **Phase 3** (T008–T011) — toggle + badge dans evaluate
4. Compléter **Phase 4** (T012–T014) — bouton soumission évaluateur
5. Compléter **Phase 5** (T015–T016) — validation/rejet owner
6. **STOP & VALIDER** : tester le circuit complet (draft → submitted → approved/rejected → draft)

### Livraison incrémentale

1. Setup + Fondation → backend prêt
2. **+ US1** → badges visibles dans evaluate (valeur visible, feedback rapide)
3. **+ US2 + US3** → circuit de validation fonctionnel (MVP complet)
4. **+ US4** → vue panoramique dans Sidebar et CategoryAnalysisTable
5. **+ Polish** → robustesse UX

---

## Notes

- [P] = fichiers différents, pas de dépendances en conflit
- Statut implicite `draft` : ne pas créer d'enregistrement en base à l'ouverture d'une exigence, gérer côté frontend via `Map.get(requirementId) ?? 'draft'`
- La migration `20260213_add_peer_review.sql` doit être appliquée avant tout test backend
- `PeerReviewConfirmDialog` (T012) et `PeerReviewActionButton` (T013) couvrent les deux cas US2 ET US3 — les créer une fois, ils servent les deux stories
