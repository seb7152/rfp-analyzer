# Spécification Fonctionnelle : Grille Financière

**Feature Branch** : `003-financial-grid`
**Créé** : 2025-11-12
**Statut** : Draft
**Input** : Définition utilisateur de la fonctionnalité de modélisation financière

---

## 📋 Vue d'ensemble

La grille financière est un module autonome de l'application RFP Analyzer permettant la comparaison des offres financières des soumissionnaires. Elle complète le module d'évaluation technique existant en offrant une structuration hiérarchique des coûts (setup et récurrents) avec calcul automatique des totaux et du TCO (Total Cost of Ownership).

Chaque soumissionnaire peut proposer plusieurs versions de son offre (ex: Offre initiale, Révision v1, v2, etc.), importées manuellement par l'évaluateur. La grille permet deux modes d'affichage : comparaison entre fournisseurs (inter-fournisseurs) ou comparaison entre versions d'un même fournisseur (intra-fournisseur).

Les évaluateurs peuvent ajouter des commentaires (notes simples) sur n'importe quelle cellule, exporter les données en Excel/JSON, et personnaliser le template de coûts selon les besoins du RFP.

---

## 🎯 User Stories & Scenarios de Test

### US-1 : Création du template financier (Priorité : P1)

Un évaluateur doit créer un template financier avec une structure hiérarchique de catégories (setup/recurrent) pour définir les lignes de coûts à comparer entre les fournisseurs.

**Pourquoi cette priorité** : Le template est la fondation de la fonctionnalité. Sans structure de coûts définie, aucune évaluation financière n'est possible.

**Scénarios d'acceptation** :

1. **Étant donné** un évaluateur sur l'écran de grille financière, **lorsqu'il** clique sur "Créer un template", **alors** une modale s'ouvre pour définir le nom du template et la période TCO
2. **Étant donné** un template créé, **lorsqu'il** ajoute une ligne racine, **alors** il peut définir le code, nom, type (setup/recurrent) et fréquence (mensuel/annuel)
3. **Étant donné** une ligne existante, **lorsqu'il** ajoute une ligne fille, **alors** elle devient automatiquement une sous-catégorie de la ligne parente dans la hiérarchie
4. **Étant donné** un template avec plusieurs niveaux, **lorsqu'il** visualise la grille, **alors** il voit la structure complète avec indicateurs de sous-totaux à chaque niveau

### US-2 : Import d'une offre financière (Priorité : P1)

Un évaluateur doit créer une nouvelle version d'offre pour un fournisseur existant (ex: "Offre initiale") et saisir les coûts sur chaque ligne du template.

**Pourquoi cette priorité** : Sans la possibilité d'importer les offres financières, la grille reste vide. C'est le cœur du workflow de saisie des données.

**Scénarios d'acceptation** :

1. **Étant donné** un template existant et un fournisseur actif, **lorsqu'il** clique sur "Ajouter une version", **alors** une modale s'ouvre pour définir le nom de version (ex: "Offre initiale")
2. **Étant donné** une version créée, **lorsqu'il** visualise la grille en mode inter-fournisseurs, **alors** une nouvelle colonne apparaît pour ce fournisseur avec la version par défaut
3. **Étant donné** la colonne d'un fournisseur, **lorsqu'il** saisit des coûts dans les cellules, **alors** les valeurs sont sauvegardées automatiquement et les sous-totaux se recalculent
4. **Étant donné** plusieurs versions créées pour un fournisseur, **lorsqu'il** sélectionne une version dans le dropdown de l'en-tête de colonne, **alors** la colonne affiche les coûts de cette version

### US-3 : Comparaison inter-fournisseurs (Priorité : P1)

Un évaluateur doit comparer les offres financières de tous les fournisseurs actifs en sélectionnant une version par fournisseur, et voir les totaux/TCO pour identifier l'offre la plus compétitive.

**Pourquoi cette priorité** : C'est le mode principal d'utilisation de la grille. La comparaison entre fournisseurs est le cas d'usage central pour la prise de décision.

**Scénarios d'acceptation** :

1. **Étant donné** un RFP avec 4 fournisseurs actifs, **lorsqu'il** sélectionne le mode "Comparaison fournisseurs", **alors** 4 colonnes s'affichent avec les versions sélectionnées par défaut
2. **Étant donné** plusieurs fournisseurs affichés, **lorsqu'il** change la version d'un fournisseur via le dropdown, **alors** la colonne se met à jour avec les nouvelles valeurs
3. **Étant donné** la comparaison affichée, **lorsqu'il** consulte le tableau de synthèse, **alors** il voit le Total Setup, Total Recurrent annuel et TCO pour chaque fournisseur
4. **Étant donné** le tableau de synthèse, **lorsqu'il** change la période TCO (1 an → 3 ans), **alors** les totaux TCO sont recalculés dynamiquement

### US-4 : Comparaison intra-fournisseur (Priorité : P2)

Un évaluateur doit analyser l'évolution de l'offre d'un même fournisseur à travers ses différentes versions, en visualisant les variations en pourcentage par rapport à la version précédente.

**Pourquoi cette priorité** : Utile pour négocier et voir l'évolution des offres, mais moins critique que la comparaison inter-fournisseurs pour le MVP.

**Scénarios d'acceptation** :

1. **Étant donné** un fournisseur avec 3 versions (v1, v2, v3), **lorsqu'il** sélectionne ce fournisseur et le mode "Comparaison versions", **alors** 3 colonnes s'affichent
2. **Étant donné** les versions affichées, **lorsqu'il** consulte les totaux, **alors** il voit un indicateur de variation pour chaque version par rapport à la précédente (ex: v2: ▼ -5% par rapport à v1)
3. **Étant donné** une variation positive, **lorsqu'il** la consulte, **alors** l'indicateur s'affiche en rouge avec un ▲
4. **Étant donné** une variation négative, **lorsqu'il** la consulte, **alors** l'indicateur s'affiche en vert avec un ▼

### US-5 : Commenter une cellule (Priorité : P2)

Un évaluateur doit ajouter un commentaire sur une cellule spécifique (ligne/fournisseur/version) pour justifier un coût ou noter une question, et le retrouver en cliquant sur le badge indicateur.

**Pourquoi cette priorité** : Important pour la documentation et la collaboration, mais ne bloque pas l'évaluation de base.

**Scénarios d'acceptation** :

1. **Étant donné** une cellule sans commentaire, **lorsqu'il** clique sur l'icône de commentaire, **alors** une modale/popover s'ouvre pour saisir le commentaire
2. **Étant donné** un commentaire saisi, **lorsqu'il** l'enregistre, **alors** un badge indicateur apparaît sur la cellule
3. **Étant donné** une cellule avec commentaire, **lorsqu'il** clique sur le badge indicateur, **alors** un popover affiche le commentaire avec l'auteur et la date
4. **Étant donné** un commentaire existant, **lorsqu'il** clique sur le badge indicateur, **alors** le popover offre des options "Modifier" et "Supprimer"

### US-6 : Calcul du TCO sur différentes périodes (Priorité : P2)

Un évaluateur doit changer la période de calcul TCO (1 an, 3 ans, 5 ans) pour voir l'impact sur les coûts totaux et comparer les offres sur différents horizons temporels.

**Pourquoi cette priorité** : Utile pour la prise de décision, mais le calcul sur une période par défaut (ex: 3 ans) est suffisant pour le MVP.

**Scénarios d'acceptation** :

1. **Étant donné** la grille affichée, **lorsqu'il** sélectionne une période TCO dans le sélecteur (1 an / 3 ans / 5 ans), **alors** les totaux TCO sont recalculés instantanément
2. **Étant donné** une période de 1 an sélectionnée, **lorsqu'il** consulte le tableau de synthèse, **alors** le TCO = Total Setup + Total Recurrent annuel
3. **Étant donné** une période de 3 ans sélectionnée, **lorsqu'il** consulte le tableau de synthèse, **alors** le TCO = Total Setup + (Total Recurrent annuel × 3)
4. **Étant donné** une période modifiée, **lorsqu'il** quitte l'écran et y retourne, **alors** la période précédemment sélectionnée est conservée

### US-7 : Export template en JSON (Priorité : P2)

Un évaluateur doit exporter le template financier au format JSON pour le sauvegarder localement, le partager avec d'autres équipes ou le réutiliser sur un autre RFP.

**Pourquoi cette priorité** : Utile pour la réutilisation et le backup, mais ne bloque pas les fonctionnalités core.

**Scénarios d'acceptation** :

1. **Étant donné** un template créé, **lorsqu'il** clique sur "Export JSON", **alors** un fichier `.json` se télécharge
2. **Étant donné** le fichier téléchargé, **lorsqu'il** l'ouvre, **alors** il contient la structure hiérarchique complète (codes, noms, types, relations parent-enfant)
3. **Étant donné** l'option "avec données" sélectionnée, **lorsqu'il** exporte, **alors** le JSON contient aussi les valeurs de toutes les versions/offres
4. **Étant donné** l'option "sans données" sélectionnée, **lorsqu'il** exporte, **alors** le JSON contient uniquement la structure du template

### US-8 : Export template en Excel avec formules dynamiques (Priorité : P2)

Un évaluateur doit exporter le template financier au format Excel avec la structure hiérarchique, les types de coûts et les formules Excel pré-générées pour que les sous-totaux se calculent automatiquement dans le fichier.

**Pourquoi cette priorité** : Très utile pour le partage avec des équipes non-utilisatrices de l'outil, mais moins critique pour le MVP.

**Scénarios d'acceptation** :

1. **Étant donné** un template existant, **lorsqu'il** sélectionne "Export Excel - Template vide", **alors** un fichier `.xlsx` se télécharge avec la structure mais sans données
2. **Étant donné** le fichier Excel ouvert, **lorsqu'il** modifie des valeurs, **alors** les sous-totaux se recalculent automatiquement grâce aux formules Excel
3. **Étant donné** le mode comparison affiché, **lorsqu'il** sélectionne "Export Excel - Avec données", **alors** l'Excel contient les données des fournisseurs actuellement affichés
4. **Étant donné** le mode supplier affiché, **lorsqu'il** sélectionne "Export Excel - Avec données", **alors** l'Excel contient les données des versions actuellement affichées pour ce fournisseur

### US-9 : Import template depuis JSON (Priorité : P2)

Un évaluateur doit importer un template depuis un fichier JSON existant (précédemment exporté) pour créer rapidement un nouveau template sans le reconstruire manuellement.

**Pourquoi cette priorité** : Accélère la création de templates récurrents, mais la création manuelle est viable pour le MVP.

**Scénarios d'acceptation** :

1. **Étant donné** aucun template existant, **lorsqu'il** clique sur "Import JSON", **alors** une modale s'ouvre pour sélectionner un fichier
2. **Étant donné** un fichier JSON valide sélectionné, **lorsqu'il** l'importe, **alors** le template est créé avec la structure complète
3. **Étant donné** l'option "Remplacer" sélectionnée, **lorsqu'il** importe un template, **alors** le template existant est remplacé par celui du fichier
4. **Étant donné** l'option "Ajouter" sélectionnée, **lorsqu'il** importe un template, **alors** les lignes du fichier sont ajoutées au template existant

---

## 📐 Exigences Fonctionnelles

### FR-001 : Le système DOIT permettre la création d'un template financier associé à un RFP

### FR-002 : Le système DOIT permettre la création de lignes hiérarchiques (tree structure) avec des relations parent-enfant

### FR-003 : Le système DOIT supporter deux types de lignes : Setup (coût ponctuel) et Recurrent (coût périodique)

### FR-004 : Le système DOIT permettre de définir la fréquence des coûts récurrents : mensuel ou annuel

### FR-005 : Le système DOIT permettre de définir une période de calcul TCO en années (1, 3, 5, etc.)

### FR-006 : Le système DOIT calculer automatiquement les sous-totaux à chaque niveau de la hiérarchie

### FR-007 : Le système DOIT calculer le Total Setup (somme de tous les coûts setup du template)

### FR-008 : Le système DOIT calculer le Total Recurrent annuel (somme de tous les coûts récurrents)

### FR-009 : Le système DOIT calculer le TCO sur la période définie : TCO = Total Setup + (Total Recurrent × période)

### FR-010 : Le système DOIT permettre de créer plusieurs versions d'offre par fournisseur

### FR-011 : Le système DOIT permettre de saisir des coûts (setup et/ou recurrent) pour chaque ligne et chaque version

### FR-012 : Le système DOIT permettre de définir une quantité par ligne pour les calculs (default: 1)

### FR-013 : Le système DOIT supporter deux modes d'affichage : Comparison (inter-fournisseurs) et Supplier (intra-fournisseur)

### FR-014 : Le système DOIT afficher tous les fournisseurs actifs du RFP en mode Comparison

### FR-015 : Le système DOIT permettre de sélectionner une version par fournisseur en mode Comparison

### FR-016 : Le système DOIT permettre de sélectionner un fournisseur spécifique en mode Supplier

### FR-017 : Le système DOIT afficher toutes les versions du fournisseur sélectionné en mode Supplier

### FR-018 : Le système DOIT calculer et afficher les variations en pourcentage entre versions (mode Supplier)

### FR-019 : Le système DOIT utiliser des indicateurs visuels pour les variations : ▲ rouge (hausse), ▼ vert (baisse)

### FR-020 : Le système DOIT permettre d'ajouter un commentaire sur n'importe quelle cellule (ligne/fournisseur/version)

### FR-021 : Le système DOIT afficher un badge indicateur sur les cellules avec commentaires

### FR-022 : Le système DOIT afficher les commentaires via popover au clic sur le badge indicateur

### FR-023 : Le système DOIT permettre de modifier et supprimer les commentaires existants

### FR-024 : Le système DOIT conserver l'auteur et la date de création/modification de chaque commentaire

### FR-025 : Le système DOIT exporter le template en format JSON (avec ou sans données)

### FR-026 : Le système DOIT exporter le template en format Excel (.xlsx) avec formules automatiques

### FR-027 : Le système DOIT permettre d'exporter le template vide (structure uniquement)

### FR-028 : Le système DOIT permettre d'exporter avec les données actuellement affichées sur l'interface

### FR-029 : Le système DOIT respecter l'état de l'interface lors de l'export (mode, fournisseurs/versions, période)

### FR-030 : Le système DOIT importer un template depuis un fichier JSON

### FR-031 : Le système DOIT permettre de remplacer ou d'ajouter au template existant lors de l'import

### FR-032 : Le système DOIT valider la structure JSON lors de l'import (pas de cycles, types valides)

### FR-033 : Le système DOIT permettre l'utilisation de formules personnalisées pour le calcul des coûts

### FR-034 : Le système DOIT supporter des variables dans les formules : {setup_cost}, {recurrent_cost}, {quantity}, {total_period_years}

### FR-035 : Le système DOIT conserver l'état de l'interface (mode, sélections) par utilisateur et par RFP

### FR-036 : Le système DOIT restaurer l'état de l'interface lors du retour sur l'écran

### FR-037 : Le système DOIT sauvegarder automatiquement les préférences lors de chaque changement

---

## 🗃️ Entités Clés

### financial_templates

Représente le template financier associé à un RFP. Contient les paramètres globaux de la grille (nom, période de calcul TCO). Un RFP peut avoir un seul template financier. La structure hiérarchique des coûts est définie dans les lignes associées.

### financial_template_lines

Représente une ligne de la hiérarchie financière (catégorie, sous-catégorie, ou ligne de coût). Chaque ligne peut avoir une relation parent-child pour créer une structure tree. Le type de ligne (setup/recurrent) détermine si c'est un coût ponctuel ou périodique. Les sous-totaux sont calculés automatiquement à chaque niveau.

### financial_offer_versions

Représente une version de l'offre financière d'un fournisseur. Les évaluateurs peuvent créer plusieurs versions par fournisseur pour suivre l'évolution des offres (ex: Offre initiale, Révision v1, Révision v2). Chaque version contient des coûts pour toutes les lignes du template.

### financial_offer_values

Contient les valeurs de coûts pour une version donnée sur une ligne spécifique. Stocke les coûts setup et/ou recurrent, la quantité, et une formule personnalisée optionnelle. Ces valeurs sont utilisées pour calculer les sous-totaux et totaux automatiquement.

### financial_comments

Représente un commentaire sur une cellule de la grille financière. Peut être attaché à une ligne seule (commentaire global) ou à une ligne + version spécifique. Les commentaires sont des notes simples (pas de threads de discussion) avec auteur et date de création.

### financial_grid_preferences

Stocke les préférences d'affichage de la grille financière par utilisateur et par RFP. Contient le mode actif (comparison/supplier), le fournisseur sélectionné, les versions affichées, la période TCO, et l'état d'expansion des lignes. Ces préférences sont automatiquement sauvegardées et restaurées pour une expérience personnalisée.

---

## 🎯 Critères de Succès

### SC-001

Un évaluateur peut créer un template financier avec 50+ lignes hiérarchiques en moins de 10 minutes.

### SC-002

La grille financière affiche 4-10 fournisseurs avec leurs versions sans latence perceptible (< 1s).

### SC-003

Le calcul des totaux/sous-totaux se fait automatiquement en temps réel (< 500ms) à chaque modification.

### SC-004

L'export Excel génère un fichier avec les formules fonctionnelles en moins de 5 secondes.

### SC-005

L'import JSON valide et restaure un template de 100 lignes en moins de 3 secondes.

### SC-006

Les commentaires sont ajoutés et affichés via popover en moins de 1 seconde.

### SC-007

Le switch entre mode comparison et supplier se fait sans rechargement de page.

---

## 📝 Hypothèses

- **Données fournisseurs** : Les fournisseurs sont déjà définis dans la table `suppliers` liée au RFP. La grille financière réutilise cette liste.
- **Import manuel** : Les versions d'offres financières sont créées et remplies manuellement par les évaluateurs. Aucun import automatique depuis PDF n'est prévu dans le MVP.
- **Monnaie** : Toutes les valeurs sont en euros (€). Le support multidevises est différé à une version future.
- **Périodes récurrentes** : Seules les périodes mensuelle et annuelle sont supportées. Autres périodes (trimestrielle, semestrielle) sont différées.
- **Formules personnalisées** : Les formules utilisent une syntaxe simple de substitution de variables. Pas de langage d'expression complexe (ex: pas d'opérateurs conditionnels).
- **Performance** : La grille peut gérer jusqu'à 200 lignes de template et 10 fournisseurs avec 5 versions chacun sans dégradation significative des performances.
- **Comments simples** : Les commentaires sont des notes individuelles. Pas de threads de discussion, mentions @user, ou notifications.
- **Calcul côté serveur** : Les calculs de totaux/sous-totaux sont effectués par le backend pour garantir la cohérence des données.
- **Export Excel** : Les formules Excel sont générées côté serveur lors de l'export. Pas de formules dans l'interface web.
- **Persistance locale** : Les préférences d'affichage sont stockées en base de données, pas en local storage du navigateur, pour permettre la synchronisation entre appareils.

---

## 🔌 API Endpoints

### Template financier

- `GET /api/rfps/[rfpId]/financial-template` - Récupérer le template financier d'un RFP
- `POST /api/rfps/[rfpId]/financial-template` - Créer un nouveau template
- `PUT /api/rfps/[rfpId]/financial-template` - Mettre à jour le template (nom, période TCO)
- `DELETE /api/rfps/[rfpId]/financial-template` - Supprimer le template

### Lignes du template

- `GET /api/financial-templates/[templateId]/lines` - Récupérer toutes les lignes d'un template
- `POST /api/financial-template-lines` - Ajouter une ligne au template
- `PUT /api/financial-template-lines/[lineId]` - Modifier une ligne
- `DELETE /api/financial-template-lines/[lineId]` - Supprimer une ligne (soft delete)
- `POST /api/financial-template-lines/[lineId]/move` - Déplacer une ligne dans la hiérarchie (changer parent/ordre)

### Versions d'offres

- `GET /api/rfps/[rfpId]/financial-offer-versions` - Lister toutes les versions (avec fournisseurs)
- `POST /api/rfps/[rfpId]/financial-offer-versions` - Créer une nouvelle version pour un fournisseur
- `PUT /api/financial-offer-versions/[versionId]` - Mettre à jour une version (nom, date)
- `DELETE /api/financial-offer-versions/[versionId]` - Supprimer une version

### Valeurs

- `GET /api/rfps/[rfpId]/financial-values?mode=comparison|supplier&supplierId=X` - Récupérer toutes les valeurs selon le mode
- `POST /api/financial-offer-values/batch` - Créer ou mettre à jour en lot les valeurs pour une version
- `PUT /api/financial-offer-values/[valueId]` - Modifier une valeur individuelle
- `POST /api/financial-values/calculate` - Déclencher le recalcul des totaux/sous-totaux

### Commentaires

- `GET /api/financial-comments?lineId=X&versionId=Y` - Récupérer les commentaires (filtres optionnels)
- `POST /api/financial-comments` - Ajouter un commentaire
- `PUT /api/financial-comments/[commentId]` - Modifier un commentaire
- `DELETE /api/financial-comments/[commentId]` - Supprimer un commentaire

### Export/Import

- `GET /api/rfps/[rfpId]/financial-template/export/json?withData=true|false` - Exporter en JSON
- `GET /api/rfps/[rfpId]/financial-template/export/excel?contentType=template-only|with-data` - Exporter en Excel
- `POST /api/rfps/[rfpId]/financial-template/import/json?replace=true|false` - Importer depuis JSON

### Préférences

- `GET /api/rfps/[rfpId]/financial-grid-preferences` - Récupérer les préférences
- `PUT /api/rfps/[rfpId]/financial-grid-preferences` - Sauvegarder les préférences

---

## 📤 Spécifications Export/Import

### Export JSON

**Endpoint** : `GET /api/rfps/[rfpId]/financial-template/export/json?withData=true|false`

**Contenu JSON sans données (`withData=false`)** :

```json
{
  "template": {
    "id": "uuid",
    "name": "Template financier RFP 2025",
    "total_period_years": 3
  },
  "lines": [
    {
      "id": "uuid",
      "code": "INF-01",
      "name": "Infrastructure",
      "line_type": "setup",
      "parent_id": null,
      "sort_order": 1
    },
    {
      "id": "uuid",
      "code": "INF-01-01",
      "name": "Serveurs",
      "line_type": "setup",
      "parent_id": "uuid-de-INF-01",
      "sort_order": 1
    }
  ]
}
```

**Contenu JSON avec données (`withData=true`)** :
Inclut en plus les sections `offer_versions` et `offer_values` avec toutes les données des versions et coûts.

**Validation lors de l'import** :

- Structure hiérarchique valide (pas de cycles dans les relations parent-child)
- Types de coûts valides ('setup' ou 'recurrent')
- Types de réquence valides ('monthly' ou 'yearly') si line_type = 'recurrent'
- Formules syntaxiquement correctes (variables valides, opérateurs supportés)

### Export Excel

**Endpoint** : `GET /api/rfps/[rfpId]/financial-template/export/excel?contentType=template-only|with-data`

**Contenu Excel template vide** :

- Feuille 1 : Structure du template
  - Colonnes : Code, Nom, Type (Setup/Recurrent), Fréquence, Formule personnalisée, Ordre
  - Lignes groupées par indentation visuelle (colonnes cachées pour parent/ordre)
  - Formules Excel automatiques : `=SUM(INDIRECT(...))` pour les sous-totaux
  - Lignes de sous-totaux en gras avec fond coloré
- Feuille 2 : Légende et instructions
  - Explication des types de coûts
  - Mode d'emploi pour ajouter des données

**Contenu Excel avec données** :

- Structure identique au template vide
- Colonnes supplémentaires par fournisseur/version selon le mode actuel
- Valeurs pré-remplies
- Tableau de synthèse des totaux (Setup, Recurrent, TCO)
- Indicateurs de variations en mode intra-fournisseur

**Respect de l'état de l'interface** :

- Récupère automatiquement les préférences du utilisateur (`financial_grid_preferences`)
- Affiche seulement les fournisseurs/versions actuellement visibles
- Applique les filtres actifs
- Utilise la période TCO sélectionnée

### Import JSON

**Endpoint** : `POST /api/rfps/[rfpId]/financial-template/import/json?replace=true|false`

**Comportement replace=true** :

- Supprime toutes les lignes du template existant
- Crée une nouvelle structure à partir du JSON
- Recrée toutes les relations parent-child
- Réinitialise les identifiants (génère de nouveaux UUIDs)

**Comportement replace=false (défaut)** :

- Conserve le template existant
- Ajoute les lignes du JSON au template
- Préserve les relations internes du JSON (parent-child entre lignes importées)
- Les lignes importées sont ajoutées à la racine (parent_id = null)

**Gestion des erreurs** :

- Retourne une erreur 400 si le JSON est invalide
- Liste détaillée des erreurs de validation (ex: "Ligne INF-05: cycle détecté dans la hiérarchie")
- Transaction rollback : tout ou rien (soit tout est importé, soit rien ne change)

---

## 🖥️ Spécifications UI/UX

### Navigation et accès

L'interface de la grille financière est accessible depuis le dashboard de l'RFP via un nouvel onglet "Grille Financière" à côté de l'onglet "Évaluation" existant.

### Écran principal

**Barre d'outils supérieure** :

- Sélecteur de mode : [Inter-fournisseurs ▼] | [Intra-fournisseur ▼]
- Sélecteur de période TCO : [1 an ▼] | [3 ans ▼] | [5 ans ▼]
- Actions :
  - [Exporter JSON ▼] → Template vide | Avec données
  - [Exporter Excel ▼] → Template vide | Avec données
  - [Importer JSON]
  - [Modifier le template]

**Panneau de synthèse** (en haut de la grille) :

- Mode inter-fournisseurs :
  - Tableau avec une ligne par fournisseur
  - Colonnes : Fournisseur | Total Setup | Total Recurrent/an | TCO (sur période)
- Mode intra-fournisseur :
  - Tableau avec une ligne par version
  - Colonnes : Version | Total Setup | Total Recurrent/an | TCO | Variation % vs version précédente
  - Indicateurs visuels : ▲ rouge (hausse), ▼ vert (baisse)

**Grille principale** :

_Structure des colonnes fixes_ :

- Colonne 1 : Code de la ligne (ex: INF-01)
- Colonne 2 : Nom de la ligne
- Colonne 3 : Type (badge Setup bleu / Recurrent vert)
- Indentation visuelle selon le niveau hiérarchique (1 espace = 20px)
- Flèches expand/collapse sur les nœuds avec enfants
- Lignes de sous-totaux en gras avec fond grisé léger

_Colonnes dynamiques_ :

- Mode inter-fournisseurs : une colonne par fournisseur
  - En-tête : Nom du fournisseur + [Sélecteur de version ▼]
  - Contenu : Valeur setup et/ou recurrent selon le type de ligne
  - Format : "12 500 €" pour setup, "1 200 €/mois" ou "14 400 €/an" pour recurrent
- Mode intra-fournisseur : une colonne par version
  - En-tête : Nom de version (ex: "v1", "v2", "Révision finale")
  - Contenu : Identique au mode inter-fournisseurs

_Commentaires_ :

- Icône de commentaire (bulle de dialogue) dans chaque cellule
- Badge indicateur en haut à droite de la cellule si commentaire présent
- Couleur du badge : Bleu clair
- Au clic sur le badge : Popover avec :
  - Commentaire
  - Auteur (nom + avatar)
  - Date/heure de création
  - Boutons [Modifier] [Supprimer]

_Navigation dans la hiérarchie_ :

- Clic sur une ligne : Sélectionne la ligne (fond bleu clair)
- Clic sur la flèche : Expand/collapse
- Boutons [Expand All] / [Collapse All] en haut à gauche de la grille

### Modales

**Créer un template** :

- Champs : Nom (text), Période TCO (sélecteur 1/3/5 ans)
- Boutons : [Créer] [Annuler]

**Ajouter une ligne** :

- Champs : Code (text), Nom (text), Type (radio Setup/Recurrent), Fréquence (sélecteur Monthly/Yearly, visible si Recurrent), Formule personnalisée (textarea, optionnel)
- Boutons : [Ajouter] [Annuler]

**Créer une version** :

- Champs : Nom de version (text, ex: "Offre initiale"), Date (date picker)
- Boutons : [Créer] [Annuler]

**Modifier un commentaire** :

- Champs : Commentaire (textarea)
- Boutons : [Enregistrer] [Annuler]

**Importer JSON** :

- Upload de fichier (drag & drop ou clic)
- Toggle : [ ] Remplacer le template existant (coché par défaut)
- Boutons : [Importer] [Annuler]
- Zone d'erreurs si validation échoue

### États et feedback

**Chargement** :

- Spinner dans la grille pendant le chargement des données
- Message "Chargement en cours..." pendant les calculs de totaux

**Succès** :

- Toast notification après export/import : "Template exporté avec succès"
- Badge vert sur le bouton "Sauvegarder" si modifications non sauvegardées

**Erreur** :

- Toast notification en cas d'erreur : "Erreur lors de l'import : format JSON invalide"
- Messages d'erreur en rouge sous les champs de formulaire (ex: "Code déjà utilisé")

**Vide** :

- Si aucun template : Message "Aucun template financier. Créez un template pour commencer." + bouton [Créer un template]
- Si template vide : Message "Aucune ligne dans le template. Ajoutez des lignes de coûts." + bouton [Ajouter une ligne]
- Si aucune version : Message "Aucune offre financière importée. Créez une version pour commencer."

### Responsive

**Desktop (> 1024px)** :

- Affichage complet de la grille
- Tableau de synthèse en haut
- Largeur minimale de colonne : 150px

**Tablet (768px - 1024px)** :

- Grille avec scroll horizontal
- Tableau de synthèse réduit (cache la colonne Variation en mode intra-fournisseur)

**Mobile (< 768px)** :

- Grille non optimisée (message : "Veuillez utiliser un écran plus large pour la grille financière")
- Affichage uniquement du tableau de synthèse (mode consultation)

---

## 💾 Persistance de l'état de l'interface

**Table : financial_grid_preferences**

```sql
CREATE TABLE financial_grid_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    ui_mode VARCHAR(20) DEFAULT 'comparison' CHECK (ui_mode IN ('comparison', 'supplier')),
    selected_supplier_id UUID REFERENCES suppliers(id),
    displayed_versions JSONB DEFAULT '{}',
    tco_period_years INTEGER DEFAULT 3 CHECK (tco_period_years IN (1, 3, 5)),
    expanded_lines UUID[] DEFAULT '{}',
    show_comments BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rfp_id, user_id)
);
```

**Contenu de `displayed_versions` (JSONB)** :

```json
{
  "supplier-id-1": "version-id-1",
  "supplier-id-2": "version-id-2"
}
```

**Workflow de sauvegarde** :

1. L'utilisateur modifie une préférence (mode, version, période)
2. L'application appelle `PUT /api/rfps/[rfpId]/financial-grid-preferences`
3. Le backend met à jour l'enregistrement dans `financial_grid_preferences`
4. L'état est sauvegardé pour la prochaine session

**Workflow de restauration** :

1. L'utilisateur accède à l'écran de grille financière
2. L'application appelle `GET /api/rfps/[rfpId]/financial-grid-preferences`
3. Le backend retourne les préférences (ou valeurs par défaut si inexistantes)
4. L'interface applique automatiquement les préférences

---

## 🔄 Modèle de Données SQL

```sql
-- Template financier
CREATE TABLE financial_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    total_period_years INTEGER DEFAULT 3 CHECK (total_period_years IN (1, 3, 5)),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rfp_id)
);

-- Lignes du template (hiérarchie)
CREATE TABLE financial_template_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES financial_templates(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES financial_template_lines(id) ON DELETE CASCADE,
    line_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    line_type VARCHAR(20) NOT NULL CHECK (line_type IN ('setup', 'recurrent')),
    recurrence_type VARCHAR(20) CHECK (recurrence_type IN ('monthly', 'yearly')),
    custom_formula TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(template_id, line_code)
);

-- Index pour les requêtes hiérarchiques
CREATE INDEX idx_financial_template_lines_parent ON financial_template_lines(parent_id);
CREATE INDEX idx_financial_template_lines_template ON financial_template_lines(template_id, sort_order);

-- Versions d'offres par fournisseur
CREATE TABLE financial_offer_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    version_name VARCHAR(255) NOT NULL,
    version_date TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_financial_offer_versions_supplier ON financial_offer_versions(supplier_id);

-- Valeurs des coûts
CREATE TABLE financial_offer_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES financial_offer_versions(id) ON DELETE CASCADE,
    template_line_id UUID NOT NULL REFERENCES financial_template_lines(id) ON DELETE CASCADE,
    setup_cost DECIMAL(15, 2) CHECK (setup_cost >= 0),
    recurrent_cost DECIMAL(15, 2) CHECK (recurrent_cost >= 0),
    quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(version_id, template_line_id)
);

CREATE INDEX idx_financial_offer_values_version ON financial_offer_values(version_id);

-- Commentaires
CREATE TABLE financial_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_line_id UUID NOT NULL REFERENCES financial_template_lines(id) ON DELETE CASCADE,
    version_id UUID REFERENCES financial_offer_versions(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_financial_comments_line ON financial_comments(template_line_id);
CREATE INDEX idx_financial_comments_version ON financial_comments(version_id);

-- Préférences utilisateur
CREATE TABLE financial_grid_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    ui_mode VARCHAR(20) DEFAULT 'comparison' CHECK (ui_mode IN ('comparison', 'supplier')),
    selected_supplier_id UUID REFERENCES suppliers(id),
    displayed_versions JSONB DEFAULT '{}',
    tco_period_years INTEGER DEFAULT 3 CHECK (tco_period_years IN (1, 3, 5)),
    expanded_lines UUID[] DEFAULT '{}',
    show_comments BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(rfp_id, user_id)
);

CREATE INDEX idx_financial_grid_prefs_rfp ON financial_grid_preferences(rfp_id, user_id);
```

---

## 🔒 Row Level Security (RLS)

```sql
-- Activer RLS sur les tables
ALTER TABLE financial_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_template_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_offer_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_offer_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_grid_preferences ENABLE ROW LEVEL SECURITY;

-- Politiques pour financial_templates
CREATE POLICY "Users can view financial_templates of their RFPs"
ON financial_templates FOR SELECT
USING (
    rfp_id IN (
        SELECT id FROM rfps
        WHERE organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can create financial_templates for their RFPs"
ON financial_templates FOR INSERT
WITH CHECK (
    rfp_id IN (
        SELECT id FROM rfps
        WHERE organization_id IN (
            SELECT organization_id FROM user_organizations
            WHERE user_id = auth.uid()
        )
    )
);

-- Politiques pour financial_template_lines
CREATE POLICY "Users can view lines of their templates"
ON financial_template_lines FOR SELECT
USING (
    template_id IN (
        SELECT id FROM financial_templates
        WHERE rfp_id IN (
            SELECT id FROM rfps
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    )
);

CREATE POLICY "Users can manage lines of their templates"
ON financial_template_lines FOR ALL
USING (
    template_id IN (
        SELECT id FROM financial_templates
        WHERE rfp_id IN (
            SELECT id FROM rfps
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- Politiques pour financial_offer_versions
CREATE POLICY "Users can view offer versions of their RFPs"
ON financial_offer_versions FOR SELECT
USING (
    supplier_id IN (
        SELECT id FROM suppliers
        WHERE rfp_id IN (
            SELECT id FROM rfps
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    )
);

CREATE POLICY "Users can manage offer versions of their RFPs"
ON financial_offer_versions FOR ALL
USING (
    supplier_id IN (
        SELECT id FROM suppliers
        WHERE rfp_id IN (
            SELECT id FROM rfps
            WHERE organization_id IN (
                SELECT organization_id FROM user_organizations
                WHERE user_id = auth.uid()
            )
        )
    )
);

-- Politiques pour financial_offer_values
CREATE POLICY "Users can view values of their RFPs"
ON financial_offer_values FOR SELECT
USING (
    version_id IN (
        SELECT id FROM financial_offer_versions
        WHERE supplier_id IN (
            SELECT id FROM suppliers
            WHERE rfp_id IN (
                SELECT id FROM rfps
                WHERE organization_id IN (
                    SELECT organization_id FROM user_organizations
                    WHERE user_id = auth.uid()
                )
            )
        )
    )
);

CREATE POLICY "Users can manage values of their RFPs"
ON financial_offer_values FOR ALL
USING (
    version_id IN (
        SELECT id FROM financial_offer_versions
        WHERE supplier_id IN (
            SELECT id FROM suppliers
            WHERE rfp_id IN (
                SELECT id FROM rfps
                WHERE organization_id IN (
                    SELECT organization_id FROM user_organizations
                    WHERE user_id = auth.uid()
                )
            )
        )
    )
);

-- Politiques pour financial_comments
CREATE POLICY "Users can view comments of their RFPs"
ON financial_comments FOR SELECT
USING (
    template_line_id IN (
        SELECT id FROM financial_template_lines
        WHERE template_id IN (
            SELECT id FROM financial_templates
            WHERE rfp_id IN (
                SELECT id FROM rfps
                WHERE organization_id IN (
                    SELECT organization_id FROM user_organizations
                    WHERE user_id = auth.uid()
                )
            )
        )
    )
);

CREATE POLICY "Users can create comments"
ON financial_comments FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own comments"
ON financial_comments FOR UPDATE
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own comments"
ON financial_comments FOR DELETE
USING (created_by = auth.uid());

-- Politiques pour financial_grid_preferences
CREATE POLICY "Users can view their own preferences"
ON financial_grid_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own preferences"
ON financial_grid_preferences FOR ALL
USING (user_id = auth.uid());
```

---

_Ce document est maintenu par l'équipe technique RFP Analyzer et mis à jour à chaque évolution de la fonctionnalité Grille Financière._
