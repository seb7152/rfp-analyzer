# Modèle JSON Import/Export - Grille Financière

**Feature** : 003-financial-grid
**Créé** : 2025-11-13
**Statut** : Draft

---

## 📋 Vue d'ensemble

Ce document définit le format JSON standardisé pour l'import et l'export des templates et données de la grille financière. Ce modèle permet de :

- Sauvegarder et restaurer des templates financiers
- Partager des structures de coûts entre RFPs
- Exporter les données complètes (template + offres) pour analyse externe
- Réimporter des templates existants sans ressaisir

---

## 📦 Structure JSON Complète

```json
{
  "metadata": {
    "version": "1.0",
    "export_date": "2025-11-13T10:30:00Z",
    "rfp_id": "uuid-du-rfp",
    "rfp_name": "Appel d'offres SI 2025",
    "exported_by": "user@example.com",
    "includes_data": true
  },
  "template": {
    "id": "uuid",
    "name": "Template financier RFP 2025",
    "description": "Template standard pour les évaluations financières",
    "total_period_years": 3,
    "currency": "EUR"
  },
  "lines": [
    {
      "id": "uuid",
      "code": "INF-01",
      "name": "Infrastructure",
      "line_type": "setup",
      "recurrence_type": null,
      "custom_formula": null,
      "parent_id": null,
      "sort_order": 1,
      "is_active": true
    },
    {
      "id": "uuid",
      "code": "INF-01-01",
      "name": "Serveurs",
      "line_type": "setup",
      "recurrence_type": null,
      "custom_formula": null,
      "parent_id": "uuid-de-INF-01",
      "sort_order": 1,
      "is_active": true
    },
    {
      "id": "uuid",
      "code": "SAAS-01",
      "name": "Abonnements SaaS",
      "line_type": "recurrent",
      "recurrence_type": "monthly",
      "custom_formula": "{recurrent_cost} * 12 * quantity",
      "parent_id": null,
      "sort_order": 10,
      "is_active": true
    }
  ],
  "suppliers": [
    {
      "id": "uuid",
      "name": "TechCorp Solutions"
    },
    {
      "id": "uuid",
      "name": "Digital Innovations Ltd"
    }
  ],
  "offer_versions": [
    {
      "id": "uuid",
      "supplier_id": "uuid-de-supplier",
      "supplier_name": "TechCorp Solutions",
      "version_name": "Offre initiale",
      "version_date": "2025-11-10T09:00:00Z",
      "is_active": true
    },
    {
      "id": "uuid",
      "supplier_id": "uuid-de-supplier",
      "supplier_name": "TechCorp Solutions",
      "version_name": "Révision v1",
      "version_date": "2025-11-12T14:30:00Z",
      "is_active": true
    }
  ],
  "offer_values": [
    {
      "id": "uuid",
      "version_id": "uuid-de-version",
      "template_line_id": "uuid-de-ligne",
      "line_code": "INF-01-01",
      "setup_cost": 15000.0,
      "recurrent_cost": null,
      "quantity": 1
    },
    {
      "id": "uuid",
      "version_id": "uuid-de-version",
      "template_line_id": "uuid-de-ligne",
      "line_code": "SAAS-01",
      "setup_cost": null,
      "recurrent_cost": 250.0,
      "quantity": 10
    }
  ],
  "comments": [
    {
      "id": "uuid",
      "template_line_id": "uuid-de-ligne",
      "version_id": "uuid-de-version",
      "line_code": "INF-01-01",
      "comment": "Coût inclut installation et configuration initiale",
      "author": "user@example.com",
      "created_at": "2025-11-11T10:00:00Z",
      "updated_at": "2025-11-11T10:00:00Z"
    }
  ],
  "calculations": {
    "total_setup": 15000.0,
    "total_recurrent_yearly": 30000.0,
    "tco": 105000.0,
    "tco_period_years": 3
  }
}
```

---

## 📄 Sections du JSON

### 1. Metadata

```json
{
  "metadata": {
    "version": "1.0",
    "export_date": "ISO 8601 timestamp",
    "rfp_id": "uuid",
    "rfp_name": "string",
    "exported_by": "email",
    "includes_data": "boolean"
  }
}
```

| Champ           | Type    | Description                                             | Obligatoire |
| --------------- | ------- | ------------------------------------------------------- | ----------- |
| `version`       | string  | Version du format JSON (ex: "1.0")                      | ✅ Oui      |
| `export_date`   | string  | Date/heure de l'export (ISO 8601)                       | ✅ Oui      |
| `rfp_id`        | uuid    | Identifiant du RFP source                               | ❌ Non      |
| `rfp_name`      | string  | Nom du RFP source                                       | ❌ Non      |
| `exported_by`   | string  | Email de l'utilisateur ayant exporté                    | ❌ Non      |
| `includes_data` | boolean | Indique si le JSON inclut les données (offres, valeurs) | ✅ Oui      |

---

### 2. Template

```json
{
  "template": {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "total_period_years": "integer",
    "currency": "string"
  }
}
```

| Champ                | Type    | Description                    | Obligatoire | Valeurs            |
| -------------------- | ------- | ------------------------------ | ----------- | ------------------ |
| `id`                 | uuid    | Identifiant du template        | ❌ Non      | Généré à l'import  |
| `name`               | string  | Nom du template                | ✅ Oui      | -                  |
| `description`        | string  | Description du template        | ❌ Non      | -                  |
| `total_period_years` | integer | Période de calcul TCO (années) | ✅ Oui      | 1, 3, 5            |
| `currency`           | string  | Devise utilisée                | ✅ Oui      | "EUR", "USD", etc. |

---

### 3. Lines

Tableau contenant toutes les lignes du template financier.

```json
{
  "lines": [
    {
      "id": "uuid",
      "code": "string",
      "name": "string",
      "line_type": "setup|recurrent",
      "recurrence_type": "monthly|yearly",
      "custom_formula": "string",
      "parent_id": "uuid|null",
      "sort_order": "integer",
      "is_active": "boolean"
    }
  ]
}
```

| Champ             | Type    | Description                          | Obligatoire    | Valeurs                                                        |
| ----------------- | ------- | ------------------------------------ | -------------- | -------------------------------------------------------------- |
| `id`              | uuid    | Identifiant de la ligne              | ❌ Non         | Généré à l'import                                              |
| `code`            | string  | Code unique de la ligne (ex: INF-01) | ✅ Oui         | Unique par template                                            |
| `name`            | string  | Nom de la ligne                      | ✅ Oui         | -                                                              |
| `line_type`       | string  | Type de coût                         | ✅ Oui         | "setup" ou "recurrent"                                         |
| `recurrence_type` | string  | Fréquence pour coûts récurrents      | ⚠️ Conditional | "monthly" ou "yearly" (obligatoire si `line_type="recurrent"`) |
| `custom_formula`  | string  | Formule de calcul personnalisée      | ❌ Non         | Voir section Formules                                          |
| `parent_id`       | uuid    | Identifiant de la ligne parente      | ❌ Non         | `null` pour racine                                             |
| `sort_order`      | integer | Ordre d'affichage                    | ✅ Oui         | Entier ≥ 0                                                     |
| `is_active`       | boolean | Indique si la ligne est active       | ✅ Oui         | `true` par défaut                                              |

---

### 4. Suppliers

Tableau contenant les fournisseurs présents dans les données.

```json
{
  "suppliers": [
    {
      "id": "uuid",
      "name": "string"
    }
  ]
}
```

| Champ  | Type   | Description                | Obligatoire |
| ------ | ------ | -------------------------- | ----------- |
| `id`   | uuid   | Identifiant du fournisseur | ❌ Non      |
| `name` | string | Nom du fournisseur         | ✅ Oui      |

**Note** : Cette section est uniquement incluse si `metadata.includes_data = true`.

---

### 5. Offer Versions

Tableau contenant toutes les versions d'offres par fournisseur.

```json
{
  "offer_versions": [
    {
      "id": "uuid",
      "supplier_id": "uuid",
      "supplier_name": "string",
      "version_name": "string",
      "version_date": "ISO 8601 timestamp",
      "is_active": "boolean"
    }
  ]
}
```

| Champ           | Type    | Description                              | Obligatoire                                   |
| --------------- | ------- | ---------------------------------------- | --------------------------------------------- |
| `id`            | uuid    | Identifiant de la version                | ❌ Non                                        |
| `supplier_id`   | uuid    | Identifiant du fournisseur               | ❌ Non (mais doit correspondre à `suppliers`) |
| `supplier_name` | string  | Nom du fournisseur                       | ✅ Oui                                        |
| `version_name`  | string  | Nom de la version (ex: "Offre initiale") | ✅ Oui                                        |
| `version_date`  | string  | Date de la version                       | ❌ Non (défaut: maintenant)                   |
| `is_active`     | boolean | Indique si la version est active         | ✅ Oui                                        |

**Note** : Cette section est uniquement incluse si `metadata.includes_data = true`.

---

### 6. Offer Values

Tableau contenant toutes les valeurs de coûts pour chaque version et chaque ligne.

```json
{
  "offer_values": [
    {
      "id": "uuid",
      "version_id": "uuid",
      "template_line_id": "uuid",
      "line_code": "string",
      "setup_cost": "decimal|null",
      "recurrent_cost": "decimal|null",
      "quantity": "integer"
    }
  ]
}
```

| Champ              | Type    | Description                         | Obligatoire                                   | Contraintes                 |
| ------------------ | ------- | ----------------------------------- | --------------------------------------------- | --------------------------- |
| `id`               | uuid    | Identifiant de la valeur            | ❌ Non                                        | Généré à l'import           |
| `version_id`       | uuid    | Identifiant de la version d'offre   | ❌ Non (doit correspondre à `offer_versions`) | -                           |
| `template_line_id` | uuid    | Identifiant de la ligne de template | ❌ Non (doit correspondre à `lines`)          | -                           |
| `line_code`        | string  | Code de la ligne                    | ✅ Oui                                        | Référence vers `lines.code` |
| `setup_cost`       | decimal | Coût setup (coût ponctuel)          | ❌ Non                                        | ≥ 0 si présent              |
| `recurrent_cost`   | decimal | Coût récurrent                      | ❌ Non                                        | ≥ 0 si présent              |
| `quantity`         | integer | Quantité                            | ✅ Oui                                        | > 0, défaut: 1              |

**Note** : Cette section est uniquement incluse si `metadata.includes_data = true`.

---

### 7. Comments

Tableau contenant les commentaires sur les cellules de la grille.

```json
{
  "comments": [
    {
      "id": "uuid",
      "template_line_id": "uuid",
      "version_id": "uuid|null",
      "line_code": "string",
      "comment": "string",
      "author": "string",
      "created_at": "ISO 8601 timestamp",
      "updated_at": "ISO 8601 timestamp"
    }
  ]
}
```

| Champ              | Type   | Description                                            | Obligatoire                          |
| ------------------ | ------ | ------------------------------------------------------ | ------------------------------------ |
| `id`               | uuid   | Identifiant du commentaire                             | ❌ Non                               |
| `template_line_id` | uuid   | Identifiant de la ligne de template                    | ❌ Non (doit correspondre à `lines`) |
| `version_id`       | uuid   | Identifiant de la version (null si commentaire global) | ❌ Non                               |
| `line_code`        | string | Code de la ligne                                       | ✅ Oui                               |
| `comment`          | string | Texte du commentaire                                   | ✅ Oui                               |
| `author`           | string | Email de l'auteur                                      | ❌ Non                               |
| `created_at`       | string | Date de création                                       | ❌ Non                               |
| `updated_at`       | string | Date de dernière modification                          | ❌ Non                               |

**Note** : Cette section est uniquement incluse si `metadata.includes_data = true`.

---

### 8. Calculations

Section contenant les calculs de totaux (optionnelle).

```json
{
  "calculations": {
    "total_setup": "decimal",
    "total_recurrent_yearly": "decimal",
    "tco": "decimal",
    "tco_period_years": "integer"
  }
}
```

| Champ                    | Type    | Description                                 | Obligatoire |
| ------------------------ | ------- | ------------------------------------------- | ----------- |
| `total_setup`            | decimal | Somme de tous les coûts setup               | ❌ Non      |
| `total_recurrent_yearly` | decimal | Somme annuelle de tous les coûts récurrents | ❌ Non      |
| `tco`                    | decimal | TCO total sur la période                    | ❌ Non      |
| `tco_period_years`       | integer | Période de calcul TCO                       | ❌ Non      |

**Note** : Cette section est uniquement incluse si `metadata.includes_data = true`.

---

## 🔗 Formules Personnalisées

Les formules personnalisées utilisent une syntaxe simple de substitution de variables.

### Variables disponibles

| Variable               | Description                |
| ---------------------- | -------------------------- |
| `{setup_cost}`         | Coût setup de la ligne     |
| `{recurrent_cost}`     | Coût récurrent de la ligne |
| `{quantity}`           | Quantité de la ligne       |
| `{total_period_years}` | Période de calcul TCO      |

### Exemples de formules

```json
{
  "custom_formula": "{recurrent_cost} * 12 * quantity"
}
```

Calcule le coût annuel d'un coût mensuel.

```json
{
  "custom_formula": "{setup_cost} + ({recurrent_cost} * {total_period_years})"
}
```

Calcule le coût total sur la période TCO.

```json
{
  "custom_formula": "({recurrent_cost} * quantity) * 1.20"
}
```

Ajoute 20% de marge.

---

## 📐 Validation JSON

### Règles de validation

1. **Structure hiérarchique**
   - Pas de cycles dans les relations `parent_id` → `id`
   - Chaque `parent_id` doit correspondre à un `id` existant dans `lines`
   - Lignes racines : `parent_id = null`

2. **Types de données**
   - `line_type` : `"setup"` ou `"recurrent"`
   - `recurrence_type` : `"monthly"` ou `"yearly"` (obligatoire si `line_type = "recurrent"`)
   - `total_period_years` : 1, 3 ou 5
   - Montants : décimaux ≥ 0
   - `quantity` : entier > 0

3. **Références**
   - Chaque `line_code` dans `offer_values` doit exister dans `lines`
   - Chaque `supplier_id` dans `offer_versions` doit exister dans `suppliers`
   - Chaque `version_id` dans `offer_values` doit exister dans `offer_versions`

4. **Codes uniques**
   - Les codes de lignes doivent être uniques dans un template

### Exemple d'erreurs de validation

```json
{
  "errors": [
    {
      "code": "CYCLE_DETECTED",
      "message": "Cycle détecté dans la hiérarchie : INF-01 → INF-01-01 → INF-01",
      "line_code": "INF-01-01"
    },
    {
      "code": "INVALID_LINE_TYPE",
      "message": "line_type doit être 'setup' ou 'recurrent' (valeur: 'invalid')",
      "line_code": "ERR-01"
    },
    {
      "code": "MISSING_RECURRENCE_TYPE",
      "message": "recurrence_type est obligatoire pour line_type='recurrent'",
      "line_code": "SAAS-01"
    },
    {
      "code": "INVALID_REFERENCE",
      "message": "parent_id 'xxx' ne correspond à aucune ligne existante",
      "line_code": "CHILD-01"
    },
    {
      "code": "DUPLICATE_CODE",
      "message": "Code 'INF-01' déjà utilisé dans le template",
      "line_code": "INF-01"
    }
  ]
}
```

---

## 📤 Exemples d'Export

### Export sans données (template uniquement)

```json
{
  "metadata": {
    "version": "1.0",
    "export_date": "2025-11-13T10:30:00Z",
    "includes_data": false
  },
  "template": {
    "name": "Template financier RFP 2025",
    "description": "Template standard SI",
    "total_period_years": 3,
    "currency": "EUR"
  },
  "lines": [
    {
      "code": "INF-01",
      "name": "Infrastructure",
      "line_type": "setup",
      "parent_id": null,
      "sort_order": 1,
      "is_active": true
    },
    {
      "code": "SAAS-01",
      "name": "Abonnements SaaS",
      "line_type": "recurrent",
      "recurrence_type": "monthly",
      "parent_id": null,
      "sort_order": 2,
      "is_active": true
    }
  ]
}
```

### Export avec données complètes

```json
{
  "metadata": {
    "version": "1.0",
    "export_date": "2025-11-13T10:30:00Z",
    "rfp_id": "550e8400-e29b-41d4-a716-446655440000",
    "rfp_name": "Appel d'offres SI 2025",
    "exported_by": "user@example.com",
    "includes_data": true
  },
  "template": {
    "name": "Template financier RFP 2025",
    "description": "Template standard SI",
    "total_period_years": 3,
    "currency": "EUR"
  },
  "lines": [
    {
      "code": "INF-01",
      "name": "Infrastructure",
      "line_type": "setup",
      "parent_id": null,
      "sort_order": 1,
      "is_active": true
    }
  ],
  "suppliers": [
    {
      "name": "TechCorp Solutions"
    }
  ],
  "offer_versions": [
    {
      "supplier_name": "TechCorp Solutions",
      "version_name": "Offre initiale",
      "is_active": true
    }
  ],
  "offer_values": [
    {
      "line_code": "INF-01",
      "setup_cost": 15000.0,
      "quantity": 1
    }
  ],
  "calculations": {
    "total_setup": 15000.0,
    "total_recurrent_yearly": 0.0,
    "tco": 15000.0,
    "tco_period_years": 3
  }
}
```

---

## 📥 Comportement d'Import

### Mode Remplacer (`replace=true`)

1. Supprime toutes les lignes du template existant
2. Crée un nouveau template à partir du JSON
3. Recrée toutes les relations parent-child
4. Génère de nouveaux UUIDs pour tous les identifiants
5. Si `includes_data=true` : importe aussi les versions et valeurs

### Mode Ajouter (`replace=false`)

1. Conserve le template existant
2. Ajoute les nouvelles lignes du JSON au template
3. Génère de nouveaux UUIDs pour les lignes importées
4. Préserve les relations internes du JSON (entre lignes importées)
5. Les lignes importées sont ajoutées à la racine (`parent_id = null`)
6. Si `includes_data=true` : importe aussi les versions et valeurs

### Gestion des erreurs

- **Transaction rollback** : Toutes les modifications sont annulées si une erreur survient
- **Retour 400** : JSON invalide ou erreurs de validation
- **Retour 201** : Import réussi avec retour des données créées

---

## 🔄 Compatibilité

### Version 1.0

- Format initial du JSON
- Support de toutes les fonctionnalités MVP
- Support des templates et données complètes

### Évolution future

Les futures versions du format JSON maintiendront la rétrocompatibilité avec la version 1.0. Les champs ajoutés seront optionnels.

---

## 📚 Ressources

- **Spécification fonctionnelle** : `specs/003-financial-grid/spec.md`
- **Documentation API** : `docs/api/financial-grid.md`
- **Schéma TypeScript** : `src/types/financial-grid.types.ts`

---

_Ce document est maintenu par l'équipe technique RFP Analyzer._
