# Résumé des Fonctionnalités - Serveur MCP RFP Analyzer

**Date**: 2025-12-29
**Version**: 1.0

---

## 🎯 Vue d'Ensemble

Le serveur MCP permet à Claude d'accéder aux données RFP de manière structurée avec un focus sur :
- **Consultation des RFPs et exigences**
- **Visualisation des notes et moyennes**
- **Comparaison des fournisseurs**
- **Export de données**

---

## 📦 Fonctionnalités Principales

### 1. Consultation des RFPs

**Ce que vous pouvez faire :**
- Lister tous les RFPs de votre organisation
- Voir les détails d'un RFP spécifique
- Obtenir un résumé avec statistiques

**Exemples d'usage :**
```
"Montre-moi tous mes RFPs actifs"
"Donne-moi le résumé du RFP Plateforme CRM"
"Quels sont les domaines couverts par ce RFP ?"
```

---

### 2. Exploration des Exigences

**Ce que vous pouvez faire :**
- Voir toutes les exigences par domaine (Sécurité, Infrastructure, etc.)
- Consulter une exigence spécifique avec toutes les réponses fournisseurs
- Obtenir la hiérarchie complète (4 niveaux)

**Options avancées :**
- Filtrer par fournisseur
- Inclure ou non les réponses
- Voir les scores moyens par exigence

**Exemples d'usage :**
```
"Montre-moi toutes les exigences du domaine Sécurité"
"Quelles sont les exigences d'authentification ?"
"Affiche l'exigence REQ-042 avec les réponses de tous les fournisseurs"
```

---

### 3. Scores et Moyennes ⭐ (Nouveau)

**Ce que vous pouvez faire :**
- Voir les notes de tous les fournisseurs pour chaque exigence
- Calculer les moyennes, médianes, min/max
- Identifier les exigences avec forte variance (désaccord entre fournisseurs)
- Obtenir une matrice de scores (tableau)

**Données disponibles par exigence :**
- **Score consolidé** : `score` = score manuel si existe, sinon score IA
- **Commentaire consolidé** : `comment` = commentaire manuel si existe, sinon commentaire IA
- **Évaluateur** : qui a évalué et quand (si évaluation manuelle)
- **Statistiques** : moyenne, médiane, écart-type, min, max
- **Meilleur/pire fournisseur** par exigence
- **Taux de complétion**

**Traçabilité optionnelle** :
- Avec `?include_details=true` : accès aux champs séparés (ai_score, manual_score, ai_comment, manual_comment)
- Par défaut : uniquement les champs consolidés pour simplifier

**Formats de visualisation :**

#### Format Détaillé
```json
{
  "requirement": "REQ-001: SSO SAML 2.0",
  "scores_by_supplier": [
    {
      "supplier": "Acme Corp",
      "score": 5,
      "comment": "Validé en démo",
      "evaluated_by": "jean.dupont@example.com"
    },
    {
      "supplier": "Beta Inc",
      "score": 4,
      "comment": "Bonne couverture avec quelques limitations"
    },
    {
      "supplier": "TechCo",
      "score": 3,
      "comment": "Solution acceptable après discussion",
      "evaluated_by": "marie.martin@example.com"
    }
  ],
  "statistics": {
    "avg_score": 4.0,
    "median_score": 4.0,
    "min_score": 3,
    "max_score": 5,
    "std_deviation": 1.0,
    "best_supplier": "Acme Corp",
    "worst_supplier": "TechCo"
  }
}
```

#### Format Matrice
```
Requirement           | Acme Corp | Beta Inc | TechCo | Moyenne
REQ-001: SSO SAML 2.0 |     5     |    4     |   3    |   4.0
REQ-002: MFA          |     5     |    5     |   3    |   4.3
REQ-003: Audit trail  |     4     |    4     |   2    |   3.3
-----------------------------------------------------------------
TOTAL                 |   175     |  157     |  105   |  145.7
RANG                  |     1     |    2     |   3    |
```

**Exemples d'usage :**
```
"Montre-moi les notes de tous les fournisseurs pour le domaine Sécurité"
"Quelle est la moyenne des scores pour l'exigence REQ-001 ?"
"Quels sont les fournisseurs qui ont les meilleures notes en Infrastructure ?"
"Affiche une matrice de scores pour tous les fournisseurs"
"Quelles exigences ont les scores les plus variables entre fournisseurs ?"
```

---

### 4. Consultation des Fournisseurs

**Ce que vous pouvez faire :**
- Lister tous les fournisseurs d'un RFP
- Voir les statistiques de performance par fournisseur
- Obtenir les scores moyens par domaine

**Informations disponibles :**
- Nombre total de réponses
- Taux de complétion
- Score moyen global
- Scores moyens par domaine
- Points forts / Points faibles

**Exemples d'usage :**
```
"Liste les fournisseurs du RFP avec leurs scores moyens"
"Comment Acme Corp performe sur le domaine Sécurité ?"
"Quels sont les points forts de Beta Inc ?"
```

---

### 5. Analyse des Réponses avec Contexte Complet

**Ce que vous pouvez faire :**
- Voir toutes les réponses organisées par domaine
- Obtenir les réponses d'un fournisseur spécifique
- Inclure le contexte complet : exigence + toutes les réponses + scores

**Options de filtrage :**
- Par domaine(s)
- Par fournisseur(s)
- Par code d'exigence
- Par plage de scores
- Par statut (pass/partial/fail/pending)

**Exemples d'usage :**
```
"Montre-moi toutes les réponses d'Acme Corp pour le domaine Sécurité"
"Compare les réponses de tous les fournisseurs pour l'exigence REQ-015"
"Quelles sont les réponses avec un score < 3 ?"
"Affiche toutes les réponses du domaine Infrastructure avec les exigences"
```

---

### 6. Comparaison des Fournisseurs

**Ce que vous pouvez faire :**
- Comparer 2 à 10 fournisseurs
- Focus sur tout le RFP, un domaine, ou des exigences spécifiques
- Voir les différences de scores
- Identifier le meilleur fournisseur par exigence

**Modes de comparaison :**
1. **Side-by-side** : Réponses côte à côte avec analyse
2. **Matrix** : Tableau de scores
3. **Summary** : Résumé avec classement

**Exemples d'usage :**
```
"Compare Acme Corp et Beta Inc sur le domaine Sécurité"
"Qui est le meilleur fournisseur pour les exigences d'authentification ?"
"Montre-moi un tableau comparatif de tous les fournisseurs"
"Quelle est la différence de score moyenne entre Acme et TechCo ?"
```

---

### 7. Analyse de Domaine

**Ce que vous pouvez faire :**
- Analyse approfondie d'un domaine spécifique
- Performance de chaque fournisseur sur le domaine
- Identification des forces/faiblesses
- Détection des lacunes critiques

**Informations fournies :**
- Décomposition par catégories
- Scores moyens par catégorie
- Comparaison des fournisseurs
- Exigences problématiques
- Recommandations

**Exemples d'usage :**
```
"Analyse le domaine Sécurité en détail"
"Quels sont les points faibles des fournisseurs sur l'Infrastructure ?"
"Y a-t-il des exigences non couvertes dans le domaine Conformité ?"
```

---

### 8. Export et Rapports

**Ce que vous pouvez faire :**
- Exporter les réponses par domaine
- Générer des rapports de comparaison
- Formats : JSON, Markdown, CSV (matrice)

**Options d'export :**
- Avec/sans exigences complètes
- Avec/sans scores
- Avec/sans commentaires
- Filtrage par fournisseur

**Exemples d'usage :**
```
"Exporte toutes les réponses du domaine Sécurité en Markdown"
"Génère un rapport de comparaison des 3 meilleurs fournisseurs"
"Exporte la matrice de scores en format CSV"
```

---

## 🔐 Sécurité

### Authentification
- Personal Access Token (PAT) requis pour chaque requête
- Validation de l'organisation
- Permissions granulaires par catégorie

### Permissions
- `requirements:read` - Voir les exigences
- `suppliers:read` - Voir les fournisseurs
- `responses:read` - Voir les réponses
- `export` - Exporter des données

### Rate Limiting
- Consultation : 100 requêtes/minute
- Outils : 50 requêtes/minute
- Exports : 10 requêtes/minute

### Audit
- Toutes les actions sont loggées
- Traçabilité complète : qui, quoi, quand
- Rétention : 90 jours minimum

---

## 📊 Cas d'Usage Typiques

### Scénario 1: Analyse rapide d'un domaine
```
1. "Montre-moi le domaine Sécurité avec les scores"
2. "Quelles exigences ont les scores les plus bas ?"
3. "Compare les 3 meilleurs fournisseurs sur ces exigences"
```

### Scénario 2: Évaluation d'un fournisseur
```
1. "Comment Acme Corp performe globalement ?"
2. "Affiche toutes les réponses d'Acme pour Infrastructure"
3. "Quels sont les points faibles d'Acme ?"
```

### Scénario 3: Préparation d'une réunion
```
1. "Génère un résumé du RFP avec classement des fournisseurs"
2. "Exporte les réponses du domaine Sécurité en Markdown"
3. "Crée un tableau comparatif des scores"
```

### Scénario 4: Analyse de consensus
```
1. "Quelles exigences ont le plus de variance dans les scores ?"
2. "Pour chaque exigence controversée, compare les réponses"
3. "Y a-t-il des exigences où tous les fournisseurs ont échoué ?"
```

---

## 🚀 Prochaines Étapes

### Phase 1 - MVP (4-6 semaines)
- ✅ Infrastructure MCP + Auth PAT
- 🔄 Resources essentielles (RFP, Requirements, Suppliers)
- 🔄 Outils de scores et moyennes
- 🔄 Tool `get_rfp_with_responses`

### Phase 2 - Comparaison (2-3 semaines)
- 📋 Tool `compare_suppliers`
- 📋 Tool `get_domain_analysis`
- 📋 Resource `responses://{rfp_id}/by-domain`

### Phase 3 - Export (1-2 semaines)
- 📋 Export JSON
- 📋 Export Markdown
- 📋 Export CSV (matrice)

### Phase 4 - Améliorations (futures)
- 📋 Recherche full-text
- 📋 Analyse IA prédictive
- 📋 Webhooks temps réel
- 📋 API publique REST

---

## 📞 Questions Fréquentes

### Q: Puis-je voir les réponses sans les exigences ?
**R:** Oui, tous les outils ont un paramètre `include_requirements` que vous pouvez mettre à `false`.

### Q: Comment obtenir uniquement les scores sans le texte des réponses ?
**R:** Utilisez `get_requirements_scores` avec `include_responses: false` ou `get_scores_matrix`.

### Q: Puis-je comparer plus de 10 fournisseurs ?
**R:** La limite est 10 fournisseurs par comparaison pour garantir la performance. Pour plus, utilisez plusieurs appels.

### Q: Les moyennes incluent-elles le score IA ou manuel ?
**R:** Les moyennes utilisent toujours le `final_score` qui est le score manuel si disponible, sinon le score IA.

### Q: Comment identifier les exigences problématiques ?
**R:** Utilisez `sort_by: "variance"` dans `get_requirements_scores` pour voir les exigences avec forte divergence de scores.

---

## 📚 Documentation Complète

Pour plus de détails techniques, consultez :
- **[SPECS.md](./SPECS.md)** - Spécifications complètes avec schémas de données
- **[README.md](./README.md)** - Guide de démarrage rapide
- **[Architecture Guide](../specs/ARCHITECTURE_WORKFLOW_GUIDE.md)** - Architecture système globale

---

**Dernière mise à jour** : 2025-12-29
