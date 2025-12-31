# Changelog - MCP Server Specs

## [1.1.0] - 2025-12-29

### 🎯 Simplification des Champs Score et Comment

**Changement majeur** : Consolidation des champs de scores et commentaires pour simplifier l'API.

#### Avant (v1.0)

```json
{
  "ai_score": 5,
  "ai_comment": "Excellente couverture",
  "manual_score": 5,
  "manual_comment": "Validé en démo",
  "final_score": 5
}
```

#### Après (v1.1)

```json
{
  "score": 5,
  "comment": "Validé en démo",
  "evaluated_by": "jean.dupont@example.com",
  "evaluated_at": "2025-01-20T10:30:00Z",

  // Détails optionnels (avec ?include_details=true)
  "details": {
    "ai_score": 5,
    "ai_comment": "Excellente couverture",
    "manual_score": 5,
    "manual_comment": "Validé en démo"
  }
}
```

#### Avantages

1. **Interface simplifiée** : Un seul champ `score` et `comment` au lieu de 5 champs
2. **Logique automatique** :
   - `score` = `manual_score` si existe, sinon `ai_score`
   - `comment` = `manual_comment` si existe, sinon `ai_comment`
3. **Traçabilité préservée** : Les champs originaux restent disponibles via `include_details=true`
4. **Meilleure UX** : Plus besoin de gérer la logique de fallback côté client

#### Logique de Consolidation

```typescript
function consolidateResponse(response) {
  return {
    score: response.manual_score ?? response.ai_score,
    comment: response.manual_comment ?? response.ai_comment,
    evaluated_by: response.manual_score ? response.evaluated_by : null,
    evaluated_at: response.manual_score ? response.evaluated_at : null,
  };
}
```

#### Impact sur les APIs

**Resources impactées** :

- `requirements://{rfp_id}/domain/{domain}?include_responses=true`
- `requirements://{requirement_id}`
- `responses://{rfp_id}/by-domain`

**Tools impactés** :

- `get_requirements_scores`
- `get_scores_matrix`
- `compare_suppliers`
- `export_domain_responses`

**Nouveau paramètre** :

- `include_details`: `boolean` (défaut: `false`)
  - `false` : Retourne uniquement les champs consolidés
  - `true` : Ajoute l'objet `details` avec la décomposition AI/Manuel

#### Migration

**Pour les clients existants** :

- Si vous utilisez `final_score` → Remplacer par `score`
- Si vous utilisez `ai_score` ou `manual_score` → Ajouter `?include_details=true` et accéder via `details.ai_score`
- Si vous affichez des commentaires → Utiliser `comment` au lieu de gérer le fallback

**Exemple de migration** :

```typescript
// AVANT
const displayScore = response.manual_score ?? response.ai_score;
const displayComment = response.manual_comment ?? response.ai_comment;

// APRÈS
const displayScore = response.score;
const displayComment = response.comment;

// Pour la traçabilité (optionnel)
if (response.details) {
  console.log("AI initial:", response.details.ai_score);
  console.log("Ajusté à:", response.details.manual_score);
}
```

---

## [1.0.0] - 2025-12-29

### 🎉 Version Initiale

Création des spécifications complètes du serveur MCP RFP Analyzer :

#### Documentation

- **SPECS.md** : Spécifications techniques (~1300 lignes)
- **FEATURES_SUMMARY.md** : Vue d'ensemble fonctionnelle
- **IMPLEMENTATION_PLAN.md** : Plan de développement
- **ARCHITECTURE.md** : Diagrammes d'architecture
- **BRAINSTORM_RECAP.md** : Récapitulatif session brainstorming

#### Resources

- `rfp://list` et `rfp://{id}`
- `requirements://{rfp_id}/tree`
- `requirements://{rfp_id}/domain/{domain}`
- `requirements://{requirement_id}`
- `suppliers://{rfp_id}/list` et `suppliers://{supplier_id}`
- `responses://{rfp_id}/by-domain`

#### Tools - Scores & Moyennes

- `get_requirements_scores` : Notes et statistiques par exigence
- `get_scores_matrix` : Vue matricielle Requirements × Suppliers

#### Tools - Consultation

- `get_rfp_with_responses` : Consultation complète avec filtres
- `search_responses` : Recherche textuelle
- `get_domain_analysis` : Analyse approfondie d'un domaine

#### Tools - Comparaison

- `compare_suppliers` : Comparaison multi-fournisseurs (side-by-side, matrix, summary)

#### Tools - Export

- `export_domain_responses` : Export JSON/Markdown/CSV
- `generate_comparison_report` : Rapports de comparaison

#### Sécurité

- Authentification PAT (Personal Access Tokens)
- Permissions granulaires par catégorie
- Rate limiting différencié
- Audit logs complet
- RLS (Row Level Security)
- Isolation multi-tenant

#### Statistiques

- Moyenne, médiane, min, max
- Écart-type (variance)
- Distribution des scores
- Meilleur/pire fournisseur
- Taux de complétion

---

**Format** : [version] - date

**Types de changements** :

- 🎉 Nouvelle fonctionnalité
- 🎯 Amélioration
- 🐛 Correction de bug
- 📝 Documentation
- ⚠️ Breaking change
- 🚀 Architecture

---

## [Unreleased]

### 📝 Documentation & Architecture

#### Meilleures Pratiques MCP Officielles

- **MCP_BEST_PRACTICES.md** - Nouveau document de référence complet
  - Principes fondamentaux (séparation Tools/Resources/Prompts)
  - Validation stricte avec Zod sur tous les inputs/outputs
  - Logging sécurisé (pas de console.log, uniquement stderr)
  - Gestion d'erreurs robuste avec messages structurés
  - Contextualisation complète (MCPContext avec user/org/permissions)
  - Performance monitoring (timing des requêtes, métriques)

- **SPECS.md v1.1** - Mise à jour avec références MCP officielles
  - Ajout de la version MCP Protocol (2025-11-25)
  - Section architecture MCP (transport HTTP/STDIO, server capabilities)
  - Convention de nommage et structuration des tools
  - Patterns d'implémentation (logging, error handling)

- **IMPLEMENTATION_PLAN.md v1.1** - Restructuré avec sections MCP
  - Section "Meilleures Pratiques MCP" avec 5 principes fondamentaux
  - Architecture multi-transport (HTTP + STDIO)
  - Améliorations requises (logging sécurisé, Zod validation, \_meta timing)
  - Section Sécurité MCP (user consent, data privacy, tool safety, checklist)
  - Métriques de succès mises à jour (incluant sécurité et coverage tests)
  - Stratégie de test améliorée (MCP Inspector + debugging)
  - Structure de fichiers complète avec patterns de code (server handler, registration patterns)

#### Patterns d'Implémentation

- **ARCHITECTURE.md** - Maintenant alignée avec les patterns MCP
- **route.ts** - Route MCP initialisée avec support multi-transport
- **tokens.ts** - Manager PAT avec hashing sécurisé (SHA-256)

### 🚀 Infrastructure

#### Structure de fichiers MCP-complète

- Réorganisation des dossiers pour suivre les conventions MCP :
  - `lib/mcp/resources/` - Tous les resources
  - `lib/mcp/tools/` - Tous les tools (avec catégories)
  - `lib/mcp/utils/` - Utilitaires réutilisables
  - `lib/logger/` - Logger sécurisé (output sur stderr)
  - `tests/` - Tests unitaires/intégration/E2E

### 🎯 Améliorations

#### Code Quality

- Ajout de patterns de documentation :
  - TypeScript JSDoc sur tous les handlers
  - Zod schemas documentés avec descriptions
  - Exemples d'usage dans le code

#### Sécurité

- Modèle de permissions plus robuste :
  - Permissions par catégorie granulaires
  - Restrictions spécifiques (org_ids, rfp_ids, IP whitelist)
  - Rate limiting intégré

#### Performance

- Préparation pour le monitoring :
  - Timing des requêtes dans tous les handlers
  - Métriques par outil/type
  - Support de \_meta dans les réponses

---
