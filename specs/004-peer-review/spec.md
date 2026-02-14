# Feature Specification: Système de Peer Review

**Feature Branch**: `004-peer-review`
**Created**: 2026-02-13
**Status**: Draft

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Activation du peer review sur un RFP (Priority: P1)

En tant qu'owner d'un RFP, je peux activer le mode peer review sur ce RFP depuis ses paramètres. Une fois activé, chaque exigence dans `/evaluate` affiche un indicateur de statut de validation.

**Why this priority**: Fonctionnalité de base sans laquelle les autres stories n'ont aucun sens. Nécessaire pour délimiter les RFP concernés par le circuit de validation.

**Independent Test**: Peut être testé seul en activant le toggle sur un RFP et en vérifiant que les indicateurs apparaissent dans `/evaluate`.

**Acceptance Scenarios**:

1. **Given** je suis owner d'un RFP, **When** j'ouvre les paramètres du RFP, **Then** un toggle "Peer Review" est visible et désactivé par défaut
2. **Given** le toggle est désactivé, **When** je l'active et confirme, **Then** les indicateurs de statut peer review apparaissent sur toutes les exigences dans `/evaluate`
3. **Given** le peer review est activé, **When** un évaluateur ouvre `/evaluate`, **Then** il voit les badges de statut sur chaque exigence (en lecture seule pour les évaluateurs sans action de validation)

---

### User Story 2 — Soumission d'une exigence pour validation (Priority: P1)

En tant qu'évaluateur, après avoir complété mes évaluations sur une exigence, je peux soumettre cette exigence pour validation par l'owner. Le statut passe de `draft` à `submitted`.

**Why this priority**: C'est l'action principale de l'évaluateur dans le circuit de peer review. Sans elle, il n'y a pas de circuit.

**Independent Test**: Peut être testé seul sur un RFP avec peer review activé, en soumettant une exigence et en vérifiant le changement de statut dans la vue et en base de données.

**Acceptance Scenarios**:

1. **Given** peer review actif, statut `draft`, je suis évaluateur, **When** je clique "Soumettre pour validation" dans le header de l'exigence, **Then** une modale de confirmation s'affiche
2. **Given** la modale de confirmation est ouverte, **When** je confirme, **Then** le badge passe à `submitted` et le bouton d'action disparaît pour moi
3. **Given** un statut `rejected`, **When** j'ai corrigé mes évaluations et clique "Soumettre à nouveau", **Then** le statut repasse à `submitted` (non pas `draft`) après confirmation

---

### User Story 3 — Validation ou rejet d'une exigence par l'owner (Priority: P1)

En tant qu'owner du RFP, je peux valider ou rejeter les exigences soumises. Un rejet nécessite un commentaire optionnel, et repasse l'exigence en `draft` pour correction.

**Why this priority**: C'est l'action principale de l'owner. Sans validation, le circuit n'a pas d'état final.

**Independent Test**: Peut être testé seul sur un RFP avec une exigence en statut `submitted`, en validant ou rejetant et en vérifiant le changement de statut.

**Acceptance Scenarios**:

1. **Given** je suis owner, une exigence est en `submitted`, **When** j'ouvre cette exigence dans `/evaluate`, **Then** je vois deux boutons : "Valider" et "Rejeter"
2. **Given** je clique "Valider", **When** je confirme dans la modale, **Then** le badge passe à `approved`
3. **Given** je clique "Rejeter", **When** j'ouvre la modale (avec champ commentaire optionnel) et confirme, **Then** le badge repasse à `draft` et le commentaire de rejet est visible
4. **Given** statut `approved` ou `draft`, **When** je suis owner, **Then** les boutons valider/rejeter ne sont pas affichés (actions non pertinentes sur ces statuts)

---

### User Story 4 — Visibilité du statut peer review dans le Sidebar et la CategoryAnalysisTable (Priority: P2)

En tant qu'utilisateur du RFP (owner ou évaluateur), je peux voir en un coup d'œil le statut peer review de chaque exigence dans le Sidebar tree et un indicateur agrégé par catégorie dans la CategoryAnalysisTable.

**Why this priority**: Vue en lecture seule qui améliore la navigation sans bloquer le circuit de validation.

**Independent Test**: Peut être testé seul en vérifiant l'affichage des badges dans le Sidebar et les compteurs dans la table.

**Acceptance Scenarios**:

1. **Given** peer review actif, **When** j'affiche le Sidebar tree, **Then** chaque nœud exigence affiche un petit badge coloré indiquant son statut (`draft`, `submitted`, `approved`, `rejected`)
2. **Given** peer review actif, **When** j'ouvre la CategoryAnalysisTable, **Then** une colonne ou indicateur affiche le résumé par catégorie (ex : "3/5 approuvés")
3. **Given** peer review non activé sur le RFP, **When** j'affiche le Sidebar ou la CategoryAnalysisTable, **Then** aucun indicateur peer review n'est visible

---

### Edge Cases

- Que se passe-t-il si l'owner désactive le peer review alors que des exigences sont en `submitted` ou `approved` ? Les statuts sont conservés en base mais les indicateurs n'apparaissent plus dans l'UI.
- Que se passe-t-il si un évaluateur est promu owner ? Il peut alors valider les exigences `submitted`, y compris celles qu'il a lui-même soumises.
- Que se passe-t-il si une nouvelle version d'évaluation est créée ? Les statuts peer review ne sont pas copiés vers la nouvelle version — chaque version repart de `draft`.
- Un owner peut-il soumettre une exigence lui-même ? Oui, l'owner dispose également du droit de soumettre (il a toutes les permissions de l'évaluateur).
- Que se passe-t-il si aucune réponse n'a encore été évaluée sur une exigence soumise ? Le système permet quand même la soumission — c'est à l'owner de juger lors de la validation.

## Requirements _(mandatory)_

### Functional Requirements

**Base de données**

- **FR-001**: Le système DOIT ajouter une colonne `peer_review_enabled BOOLEAN DEFAULT false` à la table `rfps`
- **FR-002**: Le système DOIT créer une table `requirement_review_status` avec les colonnes : `id`, `requirement_id` (FK → `requirements.id`), `version_id` (FK → `evaluation_versions.id`), `status` (enum : `draft`, `submitted`, `approved`, `rejected`), `submitted_by` (FK → `users.id`, nullable), `submitted_at` (nullable), `reviewed_by` (FK → `users.id`, nullable), `reviewed_at` (nullable), `rejection_comment` (nullable), `created_at`, `updated_at` — avec contrainte UNIQUE sur (`requirement_id`, `version_id`)
- **FR-003**: Le système DOIT appliquer des politiques RLS sur `requirement_review_status` cohérentes avec l'isolation multi-tenant existante (lecture pour tous les membres, écriture selon le rôle)

**Activation du peer review**

- **FR-004**: Seuls les utilisateurs avec `access_level IN ('owner', 'admin')` dans `rfp_user_assignments` DOIVENT pouvoir modifier `rfps.peer_review_enabled`
- **FR-005**: Le toggle peer review DOIT être accessible depuis les paramètres du RFP

**Gestion des statuts**

- **FR-006**: Quand peer review est activé et qu'une exigence n'a pas encore de ligne dans `requirement_review_status` pour la version active, son statut implicite est `draft`
- **FR-007**: Les transitions de statut autorisées sont :
  - `draft` → `submitted` : évaluateur ou owner/admin
  - `submitted` → `approved` : owner ou admin uniquement
  - `submitted` → `rejected` → `draft` : owner ou admin uniquement
  - Toute autre transition DOIT être rejetée avec un message d'erreur
- **FR-008**: Tout changement de statut DOIT être enregistré avec l'identifiant de l'utilisateur ayant effectué l'action et l'horodatage

**UI dans /evaluate**

- **FR-009**: Quand peer review est activé, le header de l'exigence sélectionnée dans ComparisonView DOIT afficher un badge indiquant le statut peer review courant avec code couleur distinctif par statut
- **FR-010**: Le bouton d'action contextuel DOIT s'adapter au rôle et au statut courant :
  - Évaluateur + `draft` → bouton "Soumettre pour validation"
  - Évaluateur + `submitted` → aucun bouton (en attente)
  - Évaluateur + `approved` → aucun bouton
  - Évaluateur + `rejected` → bouton "Soumettre à nouveau"
  - Owner/Admin + `submitted` → boutons "Valider" et "Rejeter"
  - Owner/Admin + `draft` ou `approved` → aucun bouton d'action de validation
- **FR-011**: Toute action de changement de statut DOIT déclencher une modale de confirmation, avec un champ commentaire optionnel pour le rejet

**Visibilité dans Sidebar et CategoryAnalysisTable**

- **FR-012**: Le Sidebar tree DOIT afficher un indicateur visuel du statut peer review sur chaque nœud exigence (lecture seule), uniquement si peer review est activé sur le RFP
- **FR-013**: La CategoryAnalysisTable DOIT afficher un indicateur agrégé par catégorie (ex: "3/5 approuvés") si peer review est activé

### Key Entities

- **`rfps.peer_review_enabled`**: Booléen activant le circuit de peer review sur un RFP donné. Modifiable uniquement par owner/admin.
- **`requirement_review_status`**: Enregistre le statut de validation peer review d'une exigence pour une version d'évaluation donnée. Clé composite (requirement_id, version_id). Contient l'historique minimal (who/when) pour submitted et reviewed.
- **`PeerReviewStatus` (type UI)**: Enum `draft | submitted | approved | rejected` utilisé dans les composants frontend.

### Assumptions

- Le statut peer review est au niveau de l'**exigence** (et non par réponse fournisseur), car la validation porte sur l'ensemble des évaluations d'une exigence.
- Le statut peer review est **par version** d'évaluation (aligné avec `evaluation_versions`), chaque nouvelle version repart de zéro.
- Un seul état peer review par exigence par version (pas de granularité par évaluateur assigné).
- Le commentaire de rejet est stocké dans `requirement_review_status.rejection_comment` et remplacé à chaque rejet.
- Peer review n'est pas disponible pour les RFP dont le statut est `archived`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un owner peut activer le peer review sur un RFP et voir immédiatement les indicateurs de statut dans `/evaluate` sans rechargement de page
- **SC-002**: Un évaluateur peut soumettre une exigence pour validation en moins de 3 clics (badge → bouton → confirmation)
- **SC-003**: Un owner peut valider ou rejeter une exigence soumise en moins de 3 clics
- **SC-004**: 100% des changements de statut respectent la matrice de transitions autorisées — aucune transition invalide n'est possible via l'interface ou l'API
- **SC-005**: Les indicateurs peer review dans le Sidebar et la CategoryAnalysisTable sont cohérents avec les statuts affichés dans `/evaluate` (pas de désynchronisation visible)
- **SC-006**: Sur un RFP sans peer review activé, aucun indicateur ou bouton peer review n'est visible dans l'application
