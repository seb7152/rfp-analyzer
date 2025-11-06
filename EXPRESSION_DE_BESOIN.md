# Expression de Besoin - Plateforme d'Analyse de Réponses à Appels d'Offres (RFP)

**Version:** 1.0  
**Date:** 2025-11-05  
**Statut:** En cours de définition

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
- **Frontend** : Next.js (React) + Vercel
- **Backend** : Next.js API Routes + Supabase (PostgreSQL)
- **Stockage fichiers** : GCP (PDF, fichiers générés)
- **Workflows externes** : N8N (parsing, extraction IA, notation)
- **Auth future** : Supabase Auth (non-prioritaire pour MVP)

---

## 3. Fonctionnalités principales

### 3.1 Gestion des RFP

#### 3.1.1 Sélection/Création d'un RFP
- **Écran d'accueil** : Liste des RFP existants avec dernier accès mémorisé
- **Actions** :
  - Sélectionner un RFP (redirige vers le dashboard d'analyse)
  - Créer un nouveau RFP via formulaire (nom, description, date, etc.)
- **Mémorisation** : Le dernier RFP consulté est sauvegardé en session/local storage

#### 3.1.2 Initialisation d'un RFP
- Formulaire de création :
  - Nom du RFP
  - Description (optionnel)
  - Upload du cahier des charges (Word .docx)
  - Sélection du template de parsing (correspondant au workflow N8N dédié)
  - Configuration initiale (nb niveaux hiérarchiques, etc.)
- **Conversion et stockage** :
  - Fichier Word stocké en GCP (source de vérité)
  - N8N convertit le Word en PDF (via librairie ou service externe) et le stocke également en GCP
  - L'app utilise le PDF pour affichage en viewer intégré
- **Trigger N8N** : Une fois créé, déclencher le workflow N8N via API (bearer token) pour parser et importer les données

#### 3.1.3 Suivi du parsing
- **Dashboard de suivi** :
  - État du workflow (en cours / complété / erreur)
  - Logs d'exécution du workflow N8N (extraction d'exigences, import des réponses Excel, etc.)
  - Nombre d'exigences extraites, nombre de fournisseurs détectés
  - Redirection automatique vers le dashboard d'analyse une fois complété

---

### 3.2 Architecture des données (modèle conceptuel)

#### 3.2.1 Hiérarchie des exigences
```
RFP (1)
  └─ Niveau 1 (Domaine) [1..N]
      └─ Niveau 2 (Catégorie) [1..N]
          └─ Niveau 3 (Sous-catégorie) [1..N]
              └─ Niveau 4 (Exigence) [1..N]
```
- **Paramétrable** : Nombre de niveaux configurable par RFP (par défaut 4, peuvent être 3, 4, 5...)
- **Tree structure** : Navigation hiérarchique dans le sidebar gauche

#### 3.2.2 Exigences
- **Identifiant** : ID hérité de N8N (ex: `REQ-001`) + UUID interne (Supabase)
  - UUID pour éviter collisions en multi-RFP
  - ID N8N pour traçabilité avec le workflow
- **Attributs** :
  - `id` (UUID)
  - `rfp_id` (FK)
  - `requirement_id_external` (STRING, hérité de N8N)
  - `title` (TEXT)
  - `description` (TEXT)
  - `context` (TEXT, extrait du cahier des charges)
  - `parent_id` (UUID, FK, pour la hiérarchie)
  - `level` (INT, 1-4)
  - `position_in_pdf` (JSON, voir détail ci-après)
  - `weight` (DECIMAL, 0-1, pondération absolue)
  - `category` (STRING, optionnel, pour regroupement au scoring)
  - `created_at`, `updated_at`, `created_by`

#### 3.2.3 Position dans le PDF
N8N extrait la position depuis la structure Word (headings) :
```json
{
  "page": 12,
  "section_number": "4.2.1",
  "section_title": "Sécurité des données",
  "heading_level": 3
}
```
- **Page** : Calculée lors de la conversion Word → PDF par N8N
- **Section** : Numérotation héritée du Word (ex: "4.2.1")
- **Heading level** : Utilisé pour valider la hiérarchie
- Permet un scroll automatique à la bonne section lors du clic "Ouvrir dans le PDF"

#### 3.2.4 Fournisseurs
- **Identifiant** : ID hérité de N8N + UUID
- **Attributs** :
  - `id` (UUID)
  - `rfp_id` (FK)
  - `supplier_id_external` (STRING, hérité de N8N)
  - `name` (TEXT)
  - `contact` (TEXT, optionnel)
  - `created_at`

#### 3.2.5 Réponses
- **1 réponse = 1 fournisseur + 1 exigence**
- **Attributs** :
  - `id` (UUID)
  - `rfp_id`, `requirement_id` (FKs)
  - `supplier_id` (FK)
  - `response_text` (TEXT, réponse du fournisseur)
  - `ai_score` (INT, 0-5, noté par N8N)
  - `manual_score` (INT, 0-5, modifiable par l'utilisateur) → NULL si pas modifié
  - `final_score` (INT, dérivé : manual_score si présent, sinon ai_score, ramené sur 20)
  - `ai_comment` (TEXT, commentaire généré par N8N)
  - `manual_comment` (TEXT, commentaire utilisateur)
  - `question` (TEXT, questions/doutes de l'évaluateur)
  - `last_modified_by` (VARCHAR, user ID ou "system")
  - `created_at`, `updated_at`

#### 3.2.6 Historique des modifications
- **Table** : `response_audit`
- **Attributs** :
  - `id` (UUID)
  - `response_id` (FK)
  - `field_name` (TEXT, ex: "manual_score", "manual_comment")
  - `old_value` (TEXT/JSON)
  - `new_value` (TEXT/JSON)
  - `modified_by` (VARCHAR)
  - `modified_at` (TIMESTAMP)

---

### 3.3 Interface principale - Dashboard d'analyse

#### 3.3.1 Layout global
```
┌─────────────────────────────────────────────┐
│ Header : Logo | RFP actuel (select) | Menu │
├──────────────┬──────────────────────────────┤
│              │                              │
│   SIDEBAR    │    CONTENU PRINCIPAL         │
│ (Tree exig.) │    (Onglets / Comparaison)   │
│              │                              │
│              │                              │
└──────────────┴──────────────────────────────┘
```

#### 3.3.2 Sidebar gauche - Arborescence des exigences
- **Affichage** : Tree hiérarchique (collapsible/expandable)
- **Contenu** :
  - Niveaux 1-3 : Dossiers (domaines, catégories)
  - Niveau 4 : Exigences (feuilles)
- **Interaction** :
  - Clic sur une exigence → affiche les détails + réponses comparatives dans le contenu principal
  - Indicateur visuel : État de progression/conformité (optionnel V2)
- **Filtre/Recherche** : Champ de recherche pour filtrer les exigences (regex sur titre/ID)

#### 3.3.3 Contenu principal - Onglets

##### Onglet 1 : "Vue Comparative par Exigence"
Affiche une vue **side-by-side** de l'exigence sélectionnée et les réponses comparatives des fournisseurs.

**Layout** :
```
┌─────────────────────────────────────────────────────────┐
│ Titre Exigence | ID | Pondération (%)                   │
├─────────────────────────────────────────────────────────┤
│ Contexte (extrait du cahier des charges)                │
├─────────────────────────────────────────────────────────┤
│ [Bouton] Ouvrir dans le PDF (avec scroll automatique)   │
├─────────────────────────────────────────────────────────┤
│                                                           │
│ Tableau comparatif (une ligne par fournisseur)          │
├────────────────┬──────────────┬─────────────┬──────────┤
│ Fournisseur    │ Réponse      │ Score IA/20 │ Score    │
│                │ (texte + ...) │ (grisé)     │ Manuel/20│
│                │              │              │          │
│ Fournisseur A  │ [texte long] │ 16/20       │ [champ]  │
│                │              │              │ [modif]  │
├────────────────┼──────────────┼─────────────┼──────────┤
│ Fournisseur B  │ [texte long] │ 14/20       │ [champ]  │
│                │              │              │ [modif]  │
├────────────────┴──────────────┴─────────────┴──────────┤
│ Commentaires IA / Manuels | Questions (par fournisseur) │
│                                                           │
│ [Fournisseur A]                                          │
│  Commentaire IA: ...                                     │
│  Commentaire manuel: [textarea]                          │
│  Questions: [textarea]                                   │
│                                                           │
│ [Fournisseur B]                                          │
│  ...                                                      │
└────────────────────────────────────────────────────────┘
```

**Fonctionnalités** :
- Affichage de la réponse texte du fournisseur (scrollable si long)
- Score IA/20 (grisé, non-modifiable)
- Champ de saisie pour score manuel/20 (optionnel, remplace le score final si complété)
- Commentaire IA (non-modifiable)
- Commentaire manuel (textarea, modifiable)
- Questions/doutes (textarea, modifiable)
- Indicateur visuel : Quand une valeur manuelle est modifiée, marquer comme "en cours" ou "à valider"
- **Tri/Filtres** : Possibilité de trier par score, fournisseur, etc.

##### Onglet 2 : "Fiche Fournisseur"
Affiche la synthèse d'**un fournisseur spécifique** sur tous les critères.

**Layout** :
```
┌───────────────────────────────────────────────┐
│ Nom Fournisseur | Score Global/20 | Synthèse │
├───────────────────────────────────────────────┤
│                                               │
│ Tableau synthétique :                         │
├──────────────────┬───────┬──────────┬────────┤
│ Exigence         │ Poids │ Score/20 │ Pondé  │
├──────────────────┼───────┼──────────┼────────┤
│ Req-001          │ 7%    │ 16/20    │ 1.12   │
│ Req-002          │ 5%    │ 18/20    │ 0.90   │
│ ...              │ ...   │ ...      │ ...    │
├──────────────────┼───────┼──────────┼────────┤
│ TOTAL            │ 100%  │          │ 18.5/20│
└──────────────────┴───────┴──────────┴────────┘
│                                               │
│ Graphique (optionnel) : Distribution par     │
│ domaine / Radar chart / Histogramme           │
│                                               │
└───────────────────────────────────────────────┘
```

**Navigation** :
- Sélecteur dropdown ou onglet interne pour changer de fournisseur
- Clic sur une exigence → retour à la "Vue Comparative par Exigence" pour cette exigence

#### 3.3.4 Viewer PDF intégré
- **Source** : PDF généré par N8N depuis le Word .docx original
- **Emplacement** : Panel flottant/modal ou intégré dans la page (à définir UX)
- **Fonctionnalité** :
  - Affiche le cahier des charges PDF
  - Navigation par page
  - Possibilité de scroll automatique vers la section correspondant à l'exigence sélectionnée
  - Utiliser `position_in_pdf` (page + section_number) pour localiser automatiquement
- **Libs proposées** : `react-pdf` ou `pdfjs-dist` (simple, performant)
- **Comportement** :
  - Au clic sur "Ouvrir dans le PDF", le viewer s'affiche et scroll à la bonne page/section
  - Fermer le viewer revient à la vue principale
- **Avantage Word** : Numérotation de sections stable (4.2.1) facilite le mapping page/section

---

### 3.4 Module d'analyse finale (Scoring comparatif)

#### 3.4.1 Dashboard de synthèse
Affiche un **tableau comparatif interactif** de tous les fournisseurs.

**Layout** :
```
┌──────────────────────────────────────────────────────────┐
│ Synthèse d'analyse | Filtres | [Export Excel]           │
├──────────────────────────────────────────────────────────┤
│                                                           │
│ Tableau :                                                │
├────────────────┬───────┬──────────┬──────────┬──────────┤
│ Fournisseur    │ Score │ Domaine  │ Domaine  │ Classement
│                │Global │ A        │ B        │           │
├────────────────┼───────┼──────────┼──────────┼──────────┤
│ Fournisseur A  │18.5/20│ 19/20    │ 17/20    │ 1er       │
│ Fournisseur B  │17.2/20│ 16/20    │ 18/20    │ 2e        │
│ Fournisseur C  │16.1/20│ 15/20    │ 16/20    │ 3e        │
│ ...            │ ...   │ ...      │ ...      │ ...       │
└────────────────┴───────┴──────────┴──────────┴──────────┘
```

**Fonctionnalités** :
- **Tri** : Par score global (DESC par défaut), par domaine, par fournisseur
- **Filtre** : Par domaine, plage de score
- **Détail** : Clic sur un fournisseur → onglet "Fiche Fournisseur"
- **Graphiques** (optionnel) :
  - Histogramme : Scores par fournisseur
  - Radar : Répartition par domaine (une courbe par fournisseur)
  - Box plot : Distribution des scores par domaine

#### 3.4.2 Calcul du score final
```
Score final d'une réponse = (Score final réponse) / 5 * 20

Où "Score final réponse" = score manuel si présent, sinon score IA

Score pondéré d'une exigence pour un fournisseur = Score final * Poids (absolu)

Score global d'un fournisseur = Σ(Score pondéré) / Σ(Poids)
  → Ramené sur 20
```

#### 3.4.3 Export Excel
- **Contenu** :
  - Feuille 1 : Synthèse (tableau du dashboard)
  - Feuille 2 : Détails par fournisseur (scores + commentaires par exigence)
  - Feuille 3 : Analyse par domaine (score moyen, écart-type, etc.)
- **Format** : `.xlsx` (via lib comme `exceljs` ou `xlsx`)
- **Déclenchement** : Bouton "Exporter" dans le dashboard

---

### 3.5 Gestion des pondérations

#### 3.5.1 Import initial
- Pondérations importées via N8N en base lors du parsing du RFP
- **Format** :
  - Pondération **absolue** par exigence (ex: 0.07 = 7%)
  - Optionnel : Structure par domaine/catégorie avec pondérations relatives que N8N convertit en absolue
- **Stockage** : Colonne `weight` dans la table `requirements`

#### 3.5.2 Visualisation et modification (V2)
- **Écran de gestion des pondérations** :
  - Vue hiérarchique (domaine → catégorie → exigence)
  - Affichage du poids absolu (%) pour chaque exigence
  - **Optionnel** : Graphique de visualisation des poids
- **Modification** :
  - Éditeur inline ou formulaire modal pour changer un poids
  - Validation : Somme des poids = 100% (optionnel, à confirmer si on veut cette contrainte)
  - Historique de modification

---

### 3.6 Gestion des utilisateurs et droits d'accès (V2)

#### 3.6.1 Modèle multi-tenant
- **Organisations** (table `organizations`) : Limite de scope (actuellement 1 seule)
- **Utilisateurs** (table `users`) : Membres d'une organisation
- **RFP** (table `rfps`) : Appartient à 1 organisation
- **Rôles** (table `user_roles`) :
  - `admin` : Gestion des utilisateurs, RFP, pondérations
  - `evaluator` : Consultation, modification des scores/commentaires
  - `viewer` : Lecture seule

#### 3.6.2 Authentification
- **Non-prioritaire pour MVP**
- **Futur** : Supabase Auth (magic link ou OAuth)
- **Tracking** : `created_by`, `updated_by` (VARCHAR) pour l'historique

---

## 4. Flux de données et intégrations

### 4.1 Intégration N8N

#### 4.1.1 Workflow de parsing (déclenché par l'app)
1. **Entrée** : Téléchargement du cahier des charges Word (.docx) par l'utilisateur dans l'app
2. **Trigger** : App appelle endpoint N8N `/api/workflow/parse-rfp` via bearer token
   - Paramètres : `rfp_id`, `docx_url` (GCP), `template_type`
3. **Processing** :
   - **Parsing du Word** :
     - Extraction de la hiérarchie des headings (Heading 1 → Heading 4)
     - Extraction des tableaux d'exigences (si présents)
     - Numérotation des sections (ex: 4.2.1 héritée du Word)
   - Génération des IDs externes (`REQ-001`, etc.)
   - Contexte associé (texte environnant chaque exigence)
   - Pondérations (extraites des tableaux ou annotations du Word)
   - **Conversion PDF** :
     - Word → PDF via librairie (ex: `python-docx` + `reportlab` ou `libreoffice`)
     - Calcul des numéros de page du PDF
   - Position dans le PDF (page calculée + section_number du Word)
4. **Sortie** : JSON structuré
   ```json
   {
     "rfp_id": "uuid",
     "pdf_path_gcp": "gs://bucket/rfp-123/cahier_des_charges.pdf",
     "requirements": [
       {
         "id_external": "REQ-001",
         "title": "Titre exigence",
         "description": "Description complète",
         "context": "Contexte du cahier",
         "position_pdf": { 
           "page": 12, 
           "section_number": "4.2.1",
           "section_title": "Sécurité des données",
           "heading_level": 3
         },
         "level": 4,
         "parent_external_id": "CAT-001",
         "weight": 0.07
       }
     ]
   }
   ```
5. **Callback** : N8N appelle endpoint de l'app `/api/rfp/{rfp_id}/import-requirements` pour importer en base

#### 4.1.2 Workflow d'analyse des réponses (déclenché par l'app)
1. **Entrée** : Une fois les fichiers Excel des fournisseurs importés en base
2. **Trigger** : App appelle endpoint N8N `/api/workflow/analyze-responses` via bearer token
   - Paramètres : `rfp_id`
3. **Processing** (par exigence) :
   - Récupère l'exigence + contexte + toutes les réponses des fournisseurs
   - Appelle un modèle LLM (GPT, Claude, etc.) pour :
     - Évaluer chaque réponse (score 0-5)
     - Générer un commentaire d'analyse
     - Comparaison impliciite (relative à la qualité observée)
   - Sauvegarde les scores et commentaires IA
4. **Sortie** : JSON structuré
   ```json
   {
     "rfp_id": "uuid",
     "analyses": [
       {
         "requirement_id_external": "REQ-001",
         "supplier_analyses": [
           {
             "supplier_id_external": "SUP-A",
             "ai_score": 4,
             "ai_comment": "Réponse complète et bien documentée..."
           }
         ]
       }
     ]
   }
   ```
5. **Callback** : N8N appelle endpoint de l'app `/api/rfp/{rfp_id}/import-analyses` pour importer les scores/commentaires

#### 4.1.3 Import des réponses Excel des fournisseurs (déclenché par l'app)
1. **Préalable** : Fournisseurs upladent leur fichier Excel (template fourni par l'app)
2. **Entrée** : Fichier Excel importé en GCP
3. **Trigger** : App appelle endpoint N8N `/api/workflow/import-supplier-responses`
   - Paramètres : `rfp_id`, `excel_url`, `supplier_id`
4. **Processing** :
   - Parse l'Excel (colonne REQ_ID, colonne Réponse)
   - Valide les références d'exigences
   - Stocke les réponses texte en base
5. **Callback** : N8N appelle endpoint de l'app `/api/rfp/{rfp_id}/import-responses` pour importer les réponses

### 4.2 Endpoints API de l'app (pour N8N)

#### 4.2.1 Import des exigences
```
POST /api/rfp/{rfp_id}/import-requirements
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "requirements": [
    {
      "id_external": "REQ-001",
      "title": "...",
      "description": "...",
      "context": "...",
      "position_pdf": { "page": 12, "section": "4.2.1" },
      "level": 4,
      "parent_external_id": "CAT-001",
      "weight": 0.07
    }
  ]
}

Response: 201 Created
{
  "success": true,
  "imported_count": 145,
  "rfp_id": "uuid"
}
```

#### 4.2.2 Import des analyses IA
```
POST /api/rfp/{rfp_id}/import-analyses
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "analyses": [
    {
      "requirement_id_external": "REQ-001",
      "supplier_analyses": [
        {
          "supplier_id_external": "SUP-A",
          "ai_score": 4,
          "ai_comment": "..."
        }
      ]
    }
  ]
}

Response: 201 Created
```

#### 4.2.3 Import des réponses
```
POST /api/rfp/{rfp_id}/import-responses
Content-Type: application/json
Authorization: Bearer {token}

Body:
{
  "supplier_id_external": "SUP-A",
  "responses": [
    {
      "requirement_id_external": "REQ-001",
      "response_text": "Réponse du fournisseur..."
    }
  ]
}

Response: 201 Created
```

#### 4.2.4 Endpoints front-end (CRUD local)
```
GET    /api/rfps                              # Liste des RFP
POST   /api/rfps                              # Créer un RFP
GET    /api/rfps/{rfp_id}                     # Détails d'un RFP
GET    /api/rfps/{rfp_id}/requirements        # Arborescence exigences
GET    /api/rfps/{rfp_id}/suppliers           # Liste des fournisseurs
GET    /api/rfps/{rfp_id}/responses          # Réponses (filtrées)
PATCH  /api/rfps/{rfp_id}/responses/{id}     # Mettre à jour réponse (score manuel, commentaire, question)
GET    /api/rfps/{rfp_id}/analytics          # Synthèse scoring
```

---

## 5. Critères d'acceptation (MVP)

### 5.1 Gestion des RFP
- [ ] L'utilisateur peut créer un nouveau RFP avec formulaire simple
- [ ] L'utilisateur peut sélectionner un RFP et lancer le parsing via N8N
- [ ] Le suivi du parsing affiche l'état du workflow en temps réel (ou quasi temps réel avec polling)
- [ ] Une fois complété, l'app redirige automatiquement vers le dashboard d'analyse

### 5.2 Affichage des exigences
- [ ] Sidebar affiche une arborescence (tree) des exigences sur 3-4 niveaux
- [ ] Clic sur une exigence met à jour le contenu principal (pas de rechargement page)
- [ ] Recherche/filtre sur les exigences fonctionne

### 5.3 Vue comparative par exigence
- [ ] Affichage du titre, ID, pondération, contexte de l'exigence
- [ ] Affichage d'un tableau avec une ligne par fournisseur
- [ ] Chaque ligne affiche : réponse texte, score IA/20 (grisé), score manuel (éditable)
- [ ] Affichage des commentaires IA et champs texte pour commentaire manuel + questions
- [ ] Modification du score manuel sauvegarde immédiatement (avec tracking de modif)
- [ ] Bouton "Ouvrir dans PDF" scroll le viewer à la bonne page/section

### 5.4 Viewer PDF
- [ ] PDF s'affiche dans un panel (intégré ou modal, à décider UX)
- [ ] Navigation par page fonctionne
- [ ] Scroll automatique à la page correspondante quand on clique "Ouvrir dans PDF"

### 5.5 Fiche fournisseur
- [ ] Onglet "Fiche Fournisseur" affiche synthèse du fournisseur sélectionné
- [ ] Tableau : exigence, poids, score/20, contribution pondérée
- [ ] Score global = Σ(score × poids) ramené sur 20
- [ ] Clic sur une exigence revient à la vue comparative pour cette exigence

### 5.6 Dashboard de synthèse
- [ ] Tableau comparatif de tous les fournisseurs (score global, score par domaine)
- [ ] Tri par score global (DESC par défaut)
- [ ] Export en Excel fonctionnel
- [ ] Classement automatique (1er, 2e, 3e, etc.)

### 5.7 Données et historique
- [ ] Les scores manuels et commentaires sont sauvegardés en base
- [ ] Un historique des modifications est tracké (user, date, champ modifié, ancienne/nouvelle valeur)
- [ ] Les calculs de score final et pondéré sont corrects mathématiquement

### 5.8 Intégration N8N
- [ ] L'app peut déclencher le workflow N8N de parsing via bearer token
- [ ] L'app reçoit les données structurées et les importe en base correctement
- [ ] L'app peut déclencher le workflow d'analyse IA et importer les résultats

### 5.9 Performance et UX
- [ ] Interface réactive (pas de lag perceptible à la navigation)
- [ ] Lazy-loading des données si nécessaire (gros RFP avec 200+ exigences)
- [ ] Messages d'erreur clairs en cas de problème d'import N8N

---

## 6. Modèle de données (Schéma SQL)

### 6.1 Tables principales

```sql
-- Organizations (future support multi-org)
CREATE TABLE organizations (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (future auth)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  email VARCHAR(255) UNIQUE,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- RFPs
CREATE TABLE rfps (
  id UUID PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  docx_path VARCHAR(512),  -- GCP path (source Word original)
  docx_url VARCHAR(512),   -- GCP public/signed URL (Word)
  pdf_path VARCHAR(512),   -- GCP path (PDF généré par N8N)
  pdf_url VARCHAR(512),    -- GCP public/signed URL (PDF pour viewer)
  status VARCHAR(50) DEFAULT 'draft',  -- draft, parsing, active, completed, archived
  parsing_status VARCHAR(50),  -- pending, in_progress, completed, failed
  parsing_logs TEXT,  -- JSON logs du workflow N8N
  num_levels INT DEFAULT 4,  -- Nombre de niveaux de hiérarchie
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Requirements (exigences/critères)
CREATE TABLE requirements (
  id UUID PRIMARY KEY,
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  requirement_id_external VARCHAR(100),  -- ID du workflow N8N (ex: REQ-001)
  parent_id UUID REFERENCES requirements(id),  -- Pour hiérarchie
  level INT NOT NULL,  -- 1 à 4
  title VARCHAR(512) NOT NULL,
  description TEXT,
  context TEXT,  -- Contexte extrait du cahier des charges
  position_in_pdf JSONB,  -- { "page": 12, "section": "4.2.1", ... }
  weight DECIMAL(5,4),  -- 0.0000 à 1.0000 (7% = 0.07)
  category VARCHAR(255),  -- Optionnel : pour regroupement
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(rfp_id, requirement_id_external)
);

-- Suppliers (fournisseurs)
CREATE TABLE suppliers (
  id UUID PRIMARY KEY,
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  supplier_id_external VARCHAR(100),  -- ID du workflow N8N (ex: SUP-A)
  name VARCHAR(255) NOT NULL,
  contact TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(rfp_id, supplier_id_external)
);

-- Responses (réponses fournisseurs à exigences)
CREATE TABLE responses (
  id UUID PRIMARY KEY,
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  ai_score INT,  -- 0-5, noté par N8N
  manual_score INT,  -- 0-5, modifiable par utilisateur, NULL si pas modifié
  ai_comment TEXT,  -- Commentaire généré par N8N
  manual_comment TEXT,  -- Commentaire utilisateur
  question TEXT,  -- Questions/doutes de l'évaluateur
  last_modified_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(rfp_id, requirement_id, supplier_id)
);

-- Response audit (historique modifications)
CREATE TABLE response_audit (
  id UUID PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES responses(id) ON DELETE CASCADE,
  field_name VARCHAR(100),
  old_value TEXT,
  new_value TEXT,
  modified_by UUID REFERENCES users(id),
  modified_at TIMESTAMP DEFAULT NOW()
);

-- Weights audit (historique pondérations - V2)
CREATE TABLE requirement_weight_audit (
  id UUID PRIMARY KEY,
  requirement_id UUID NOT NULL REFERENCES requirements(id),
  old_weight DECIMAL(5,4),
  new_weight DECIMAL(5,4),
  modified_by UUID REFERENCES users(id),
  modified_at TIMESTAMP DEFAULT NOW()
);
```

### 6.2 Computed fields / Views (optionnel, pour performance)

```sql
-- View: Score final par réponse (score manuel si présent, sinon score IA, ramené sur 20)
CREATE VIEW response_scores AS
SELECT
  r.id,
  r.supplier_id,
  r.requirement_id,
  COALESCE(r.manual_score, r.ai_score) as final_score_5,
  ROUND(COALESCE(r.manual_score, r.ai_score) * 4, 0) as final_score_20
FROM responses r;

-- View: Score pondéré par fournisseur et exigence
CREATE VIEW response_weighted_scores AS
SELECT
  rs.supplier_id,
  rs.requirement_id,
  rs.final_score_5,
  rs.final_score_20,
  req.weight,
  ROUND(rs.final_score_20 * req.weight, 4) as weighted_contribution
FROM response_scores rs
JOIN requirements req ON rs.requirement_id = req.id;

-- View: Score global par fournisseur
CREATE VIEW supplier_global_scores AS
SELECT
  supplier_id,
  ROUND(SUM(weighted_contribution) / SUM(weight) * 20, 2) as global_score_20
FROM response_weighted_scores
GROUP BY supplier_id;
```

---

## 7. Architecture et déploiement

### 7.1 Frontend (Next.js)
- Structure : `/app` (App Router)
- Pages principales :
  - `/` : Home (sélection RFP)
  - `/rfp/create` : Création RFP
  - `/rfp/[id]/parsing` : Suivi du parsing
  - `/rfp/[id]/analysis` : Dashboard d'analyse (layout avec sidebar + contenu)
- Composants :
  - Sidebar hiérarchique (tree)
  - Vue comparative (tableau)
  - Fiche fournisseur
  - Dashboard synthèse
  - Viewer PDF
- State management : React Context ou Zustand (simple pour MVP)

### 7.2 Backend (Next.js API Routes)
- Endpoints pour CRUD RFP, exigences, réponses
- Endpoints pour import N8N (avec bearer token validation)
- Calculs de scores (computed fields en SQL ou backend)
- Génération Excel (via exceljs)

### 7.3 Déploiement
- **Frontend** : Vercel (auto-deploy sur push)
- **Backend** : Next.js API Routes (colocalisé sur Vercel)
- **DB** : Supabase (PostgreSQL)
- **Stockage fichiers** : GCP Storage (signed URLs pour accès sécurisé)
- **Workflows** : N8N (auto-hosted ou cloud, avec bearer tokens pour sécurité)

### 7.4 Sécurité
- CORS / CSRF : Gestion via headers Next.js
- Bearer tokens : Pour authentifier les appels N8N ↔ App
- Signed URLs : Pour accès GCP sécurisé
- RLS Supabase (optionnel, future) : Contrôle d'accès granulaire par RFP/org

---

## 8. Roadmap (phases)

### Phase 1 : MVP (Fondations)
- Gestion des RFP (create, select, status)
- Parsing N8N (import exigences + réponses)
- Vue comparative par exigence
- Sidebar tree
- Fiche fournisseur
- Dashboard synthèse + export Excel
- Historique modifications
- **Timeline** : 4-6 semaines

### Phase 2 : Polish & Optimisation
- Authentification Supabase
- Gestion des droits d'accès (rôles)
- UI/UX refinement (géométrie, couleurs, accessibilité)
- Performance (lazy-loading, pagination)
- Tests (E2E, composants)
- **Timeline** : 2-3 semaines

### Phase 3 : Fonctionnalités avancées
- Modification des pondérations dans l'app
- Graphiques d'analyse (radar, histogramme)
- Commentaires collaboratifs (mentions)
- Versioning des analyses (snapshots)
- Import/export de configurations de RFP
- **Timeline** : 4-6 semaines (optionnel)

---

## 9. Questions en attente / À clarifier en implémentation

1. **UX du viewer PDF** : Intégré en panel right-side ou modal overlay?
2. **Détail du mapping PDF** : N8N sortira page + section, ou faut-il des coordonnées pixel?
3. **Arborescence dynamique** : Comment gérer les 3-4 niveaux si le nombre varie par RFP? (paramètre `num_levels` à importer?)
4. **Notifications temps réel** : Polling ou webhooks pour suivi du parsing N8N?
5. **Concurrence** : Plusieurs utilisateurs modifient les mêmes scores en simultané? (Optimistic locking / dernière modif gagne?)
6. **Formule de score final** : Confirmer : `(score_manuel ou score_IA) ramené sur 20` ?
7. **Pondération validation** : Somme des poids doit = 100% ou peut être flexible?

---

## 10. Glossaire

| Terme | Définition |
|-------|-----------|
| **RFP** | Request For Proposal (Appel d'Offres) |
| **Exigence** | Critère évalué du cahier des charges |
| **Fournisseur** | Entité soumissionnaire (répondant à l'RFP) |
| **Pondération** | Coefficient d'importance d'une exigence (% du score final) |
| **Score IA** | Notation générée par N8N/LLM (0-5) |
| **Score manuel** | Notation ajustée par l'évaluateur (0-5), optionnel |
| **Score final** | Score ramené sur 20 (score manuel si présent, sinon score IA) |
| **Score pondéré** | Score final × Pondération de l'exigence |
| **Score global** | Σ(Scores pondérés) d'un fournisseur, ramené sur 20 |
| **N8N** | Plateforme d'automatisation des workflows (parsing, IA) |
| **GCP** | Google Cloud Platform (stockage fichiers) |
| **Supabase** | Backend PostgreSQL + Auth (gérées en SaaS) |

---

## 11. Annexes

### 11.1 Exemple de structure d'exigences (hiérarchie 4 niveaux)

```
Domaine 1 (Niveau 1)
├── Catégorie 1.1 (Niveau 2)
│   ├── Sous-catégorie 1.1.1 (Niveau 3)
│   │   ├── REQ-001 : Exigence (Niveau 4)
│   │   ├── REQ-002 : Exigence
│   │   └── REQ-003 : Exigence
│   └── Sous-catégorie 1.1.2
│       ├── REQ-004 : Exigence
│       └── REQ-005 : Exigence
└── Catégorie 1.2
    └── Sous-catégorie 1.2.1
        └── REQ-006 : Exigence
```

### 11.2 Exemple de flux de notation IA

**Entrée pour N8N (1 exigence)** :
```json
{
  "requirement_id": "REQ-001",
  "title": "Sécurité des données",
  "description": "Le système doit garantir le chiffrement des données en transit et au repos.",
  "context": "Conformément à la réglementation RGPD...",
  "responses": [
    {
      "supplier_id": "SUP-A",
      "response": "Nous utilisons TLS 1.3 pour le transit et AES-256 pour le repos..."
    },
    {
      "supplier_id": "SUP-B",
      "response": "Chiffrement assuré via des standards industrie."
    }
  ]
}
```

**Sortie N8N** :
```json
{
  "requirement_id": "REQ-001",
  "scores": [
    {
      "supplier_id": "SUP-A",
      "score": 5,
      "comment": "Réponse détaillée et conforme aux standards (TLS 1.3, AES-256)."
    },
    {
      "supplier_id": "SUP-B",
      "score": 3,
      "comment": "Mention générique, manque de précision sur les standards utilisés."
    }
  ]
}
```

### 11.3 Exemple de calcul de score final (fournisseur A, RFP avec 3 exigences)

| Exigence | Poids | Score IA | Score Manuel | Score Final/20 | Pondéré |
|----------|-------|----------|--------------|-----------------|---------|
| REQ-001 | 7% | 5 | - | 20 | 1.40 |
| REQ-002 | 5% | 4 | 3 | 12 | 0.60 |
| REQ-003 | 8% | 3 | - | 12 | 0.96 |
| **TOTAL** | **20%** | - | - | - | **2.96** |
| **Score global** | - | - | - | **14.8/20** | - |

Calcul: 2.96 / 0.20 * 20 = 14.8/20

---

**Fin de l'expression de besoin**
