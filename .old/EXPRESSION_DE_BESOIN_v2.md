# Expression de Besoin - Plateforme d'Analyse de Réponses à Appels d'Offres (RFP)

**Version:** 2.0 (Mise à jour UI/UX)  
**Date:** 2025-11-06  
**Statut:** En cours de développement

---

## 1. Vue d'ensemble

### Objectif général

Créer une application web permettant d'analyser et de comparer les réponses des fournisseurs à un cahier des charges structuré. L'application centralise les exigences, leurs pondérations, les réponses des fournisseurs, les scores comparatifs et facilite le dépouillement via une interface intuitive et comparative.

### Scope priorité

- **MVP 1** : Fondations multi-RFP, multi-utilisateur, gestion des exigences, scoring et analyse comparative
- **V2** : Authentification/gestion d'accès, modification des pondérations, workflows avancés
- **Hors-scope initial** : Gestion automatique de plusieurs formats PDF, intégration direct du parsing dans l'app

---

## 2. Contexte et contraintes

### Contexte métier

- **Fréquence** : 4-5 RFP par an
- **Acteurs** : 2-3 utilisateurs (équipe d'évaluation)
- **Fournisseurs** : 4-10 répondants par RFP
- **Durée cycle** : De quelques semaines à quelques mois par RFP

### Principes de conception

1. **Séparation des responsabilités** : Le parsing et l'analyse IA se font **via N8N en amont**, pas dans l'app
2. **Traçabilité** : Historique des modifications manuelles (notes, commentaires, questions)
3. **Flexibilité** : Format d'exigences spécifique par RFP (géré par un workflow N8N dédié)
4. **Performance** : Interface réactive malgré le volume de données (structure arborescente, lazy-loading si nécessaire)

### Stack technique

- **Frontend** : Next.js 14 (React) + Vercel
- **Styling** : Tailwind CSS + shadcn/ui components
- **Backend** : Next.js API Routes + Supabase (PostgreSQL)
- **Stockage fichiers** : GCP (PDF, fichiers générés)
- **Workflows externes** : N8N (parsing, extraction IA, notation)
- **Auth future** : Supabase Auth (non-prioritaire pour MVP)

---

## 3. Fonctionnalités principales

### 3.1 Interface principale - Dashboard d'analyse

#### 3.1.1 Layout global

```
┌───────────────────────────────────────────────────────┐
│ Navbar (minimaliste) : Onglets | Theme Toggle | Avatar│
├──────────────────┬────────────────────────────────────┤
│                  │                                    │
│   SIDEBAR        │    CONTENU PRINCIPAL               │
│   (noir/blanc)   │    (Vue Comparative)               │
│                  │                                    │
│  Tree exig.      │                                    │
│  Search          │                                    │
│                  │                                    │
└──────────────────┴────────────────────────────────────┘
```

#### 3.1.2 Navbar

**Éléments** :

- **Titre RFP centré**
- **Onglets** : Configuration | Comparaison | Réponses
- **Theme Toggle** : Bouton Moon/Sun pour mode clair/sombre
- **Avatar** : Profil utilisateur (coin supérieur droit)

**Styling** :

- Design minimaliste, height réduite (h-12)
- Onglets avec underline active
- Dark mode supporté

#### 3.1.3 Sidebar

**Caractéristiques** :

- **Couleur** : Noir (bg-slate-900) avec texte blanc
- **Contenu** : Arborescence hiérarchique des exigences (4 niveaux)
- **Interaction** :
  - Expand/Collapse tous les niveaux (boutons en haut)
  - Recherche en temps réel (filtre titre + ID)
  - Clic sur une exigence → affiche les détails

**Indicateurs** :

- Badge de complétude à côté du code d'exigence (REQ-001)
  - ✓ Vert (Check) : Tous les fournisseurs évalués
  - ⏱ Gris pointillé : En attente

#### 3.1.4 Vue Comparative par Exigence

**Header** :

```
┌────────────────────────────────────────────────────────┐
│ Breadcrumb : DOM-001 / CAT-001 / REQ-001 [Badge]      │
├────────────────────────────────────────────────────────┤
│ Titre Exigence                                  << >> X/Y
│ Description (whitespace-pre-wrap pour bullet points)  │
├────────────────────────────────────────────────────────┤
│ [Contexte du cahier des charges] ▼ (collapsible)      │
│ Contenu du contexte (3-4 paragraphes)                 │
│ [Ouvrir dans le PDF]                                   │
└────────────────────────────────────────────────────────┘
```

**Pagination** :

- Chevrons << >> en haut à droite
- Affichage "X/Y" (ex: 3/8)
- Navigation entre les exigences

**Contexte** :

- Section collapsible (bouton toggle avec chevron)
- Texte avec scroll area si long
- Contenu multiline supporté

**Réponses des fournisseurs** :

```
┌─────────┬────────────┬────────────┬──────────────┐
│ ☐ Nom   │ Réponse... │ ★★★★☆ 4/5 │ [Conforme]   │
├─────────┴────────────┴────────────┴──────────────┤
│ Réponse complète                 │ Statut & IA  │
│ [textarea h-96, resizable]       │ [ToggleGroup]│
│                                  │ [ScrollArea] │
│                                  │ Commentaire  │
│                                  │              │
│                                  │ [Copier]     │
├──────────────────────────────────┴──────────────┤
│ Votre commentaire    │ Questions / Doutes       │
│ [textarea h-24]      │ [textarea h-24]          │
└──────────────────────┴──────────────────────────┘
```

**Ligne fournisseur** :

- **Checkbox** : Rond pointillé gris (vide) → vert plein (coché)
  - Auto-check quand statut défini
  - Permet de suivre qui a été évalué
- **Nom fournisseur** : Texte simple, width fixe
- **Réponse** : Aperçu texte (line-clamp-2)
- **Étoiles** : 5 étoiles jaunes (w-5 h-5)
  - Interactives : Clic = sélectionne
  - Double-clic sur l'étoile actuelle = passe à 0
  - Affiche "X/5" à côté
- **Badge statut** : 4 options
  - ⏱ Attente (gris)
  - ✓ Conforme (vert)
  - ⚡ Partiel (bleu)
  - ✕ Non conforme (rouge)
  - Tous de même taille
- **Largeurs fixes** :
  - Checkbox : w-4 h-4
  - Nom : w-44
  - Étoiles + score : w-48 (flex container)
  - Badge : w-40 (flex justify-end)
  - Gaps : gap-4 entre les éléments

**Section expandable** :

- Clic sur chevron → affiche détails ci-dessous
- **Gauche (2/3)** :
  - Label "Réponse complète"
  - Textarea h-96, resizable, non-éditable
  - Flex-1 pour prendre l'espace
- **Droite (1/3)** :
  - **ToggleGroup** (outline variant) :
    - Options : [⏱ Attente] [✓ Conforme] [⚡ Partiel] [✕ Non conforme]
    - Single selection
    - Spacing : gap-2 entre les items
    - Padding : px-3 py-1.5
    - Icons de chaque statut
  - **ScrollArea** (h-96) :
    - Label "Commentaire IA"
    - Bouton Copy (w-3 h-3) à côté du label
    - Texte scrollable si long
    - Border subtle
- **Alignement bas** : Les deux zones (textarea + scrollarea) alignées en bas avec min-h-64

**Bas** (full width) :

- **2 colonnes** :
  - "Votre commentaire" : Textarea h-24
  - "Questions / Doutes" : Textarea h-24

**Comportements** :

- Clic sur ToggleGroup → auto-check la checkbox correspondante
- Statut "Attente" ne check pas automatiquement
- Copier commentaire IA → clipboard
- Toutes les textareas sont resizable (classe `resize`)

---

### 3.2 Architecture des données

#### 3.2.1 Hiérarchie des exigences

```
RFP (1)
  └─ Niveau 1 (Domaine) [1..N]
      └─ Niveau 2 (Catégorie) [1..N]
          └─ Niveau 3 (Sous-catégorie) [1..N]
              └─ Niveau 4 (Exigence) [1..N]
```

#### 3.2.2 Exigences

- **Identifiant** : ID hérité de N8N (ex: `REQ-001`) + UUID interne
- **Attributs** :
  - `id` (UUID)
  - `rfp_id` (FK)
  - `requirement_id_external` (STRING)
  - `title` (TEXT)
  - `description` (TEXT, multi-line avec bullet points)
  - `context` (TEXT, 3-4 paragraphes)
  - `parent_id` (UUID, FK, pour la hiérarchie)
  - `level` (INT, 1-4)
  - `position_in_pdf` (JSON)
  - `weight` (DECIMAL, 0-1)
  - `created_at`, `updated_at`, `created_by`

#### 3.2.3 Fournisseurs

- **Identifiant** : ID hérité de N8N + UUID
- **Attributs** :
  - `id` (UUID)
  - `rfp_id` (FK)
  - `supplier_id_external` (STRING)
  - `name` (TEXT)
  - `contact` (TEXT, optionnel)
  - `created_at`

#### 3.2.4 Réponses

- **1 réponse = 1 fournisseur + 1 exigence**
- **Attributs** :
  - `id` (UUID)
  - `rfp_id`, `requirement_id` (FKs)
  - `supplier_id` (FK)
  - `response_text` (TEXT)
  - `ai_score` (INT, 0-5)
  - `manual_score` (INT, 0-5, peut être 0 pour "non évalué")
  - `final_score` (INT, dérivé : manual_score si défini, sinon ai_score)
  - `status` (ENUM: 'pending' | 'pass' | 'partial' | 'fail')
  - `is_checked` (BOOLEAN, pour le suivi d'évaluation)
  - `ai_comment` (TEXT)
  - `manual_comment` (TEXT)
  - `question` (TEXT)
  - `last_modified_by` (VARCHAR)
  - `created_at`, `updated_at`

#### 3.2.5 Historique des modifications

- **Table** : `response_audit`
- Enregistre : field_name, old_value, new_value, modified_by, modified_at

---

### 3.3 État et Interactions

#### 3.3.1 États des réponses

- **Statut** (4 niveaux) :
  - `pending` : Attente (gris, ⏱)
  - `pass` : Conforme (vert, ✓)
  - `partial` : Partiel (bleu, ⚡)
  - `fail` : Non conforme (rouge, ✕)

#### 3.3.2 Scoring

- **Étoiles** (0-5) :
  - Représentent le score manuel de l'évaluateur
  - Clic = sélectionne jusqu'à cette étoile
  - Clic double sur l'étoile actuelle = 0
  - Affichage "X/5"
  - Convertis en /20 pour calculs finaux

#### 3.3.3 Suivi de complétude

- **Checkbox** par fournisseur :
  - Vide (pointillé gris) → coché (vert plein)
  - Auto-check quand statut défini (sauf Attente)
  - Manuel check possible
- **Badge d'exigence** :
  - Vert ✓ : Tous les fournisseurs cochés
  - Gris ⏱ : Certains non cochés
  - Positionné à côté du titre de l'exigence

---

### 3.4 Composants Techniques

#### 3.4.1 Composants shadcn/ui utilisés

- Badge (pour les statuts et badge de complétude)
- Button (expand, pagination, actions)
- Textarea (réponses, commentaires, questions)
- Breadcrumb (navigation hiérarchique)
- ScrollArea (commentaire IA long)
- ToggleGroup + ToggleGroupItem (statuts)

#### 3.4.2 Composants personnalisés

- **RoundCheckbox** : Checkbox rond avec border pointillé
  - States : empty (gris pointillé) | checked (vert plein)
  - Size : w-4 h-4
  - Check icon : w-2 h-2
- **StatusSwitch** : ToggleGroup wrapper
  - 4 options : Attente | Conforme | Partiel | Non conforme
  - Icons intégrés
  - Même taille pour tous les items
  - Padding : px-3 py-1.5

#### 3.4.3 Styling général

- **Theme** : Dark mode supporté (Tailwind dark: prefix)
- **Couleurs** : Slate pour textes, vert/bleu/rouge pour statuts
- **Spacings** : Gap standard gap-4 entre éléments du header
- **Heights** :
  - Textareas : h-96 (détail), h-24 (bas)
  - ScrollArea : h-96
  - Container min : min-h-64
- **Responsivité** : Testée sur desktop, mobile TBD

---

## 4. Flux utilisateur

1. **Accès** : Sélectionner/créer un RFP
2. **Navigation** : Sidebar pour explorer les exigences
3. **Évaluation** :
   - Cliquer sur une exigence
   - Voir les réponses de tous les fournisseurs
   - Voter les étoiles (0-5)
   - Sélectionner le statut (4 niveaux)
   - Cocher pour marquer comme évalué
   - Ajouter des commentaires/questions
4. **Synthèse** : Dashboard des scores finaux (V2)

---

## 5. Améliorations à venir (V2+)

- Modification des pondérations
- Export Excel
- Graphiques comparatifs
- Historique des modifications
- Authentification utilisateur
- Partage des RFP
- Workflows avancés
