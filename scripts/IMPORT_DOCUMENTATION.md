# Documentation d'Importation des Réponses RFP

Date: $(date)
Générée automatiquement pour le fichier: `imports/RFP_Rating_Grid_Extract.json`

---

## 1. Structure de la Table `responses`

### Schéma Complet (depuis migration 001_initial_schema.sql + 20251115_support_half_star_ratings.sql)

```sql
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  response_text TEXT,
  ai_score DECIMAL(3,1) CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 5 AND ai_score * 2 = ROUND(ai_score * 2))),
  ai_comment TEXT,
  manual_score DECIMAL(3,1) CHECK (manual_score IS NULL OR (manual_score >= 0 AND manual_score <= 5 AND manual_score * 2 = ROUND(manual_score * 2))),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_checked BOOLEAN NOT NULL DEFAULT false,
  manual_comment TEXT,
  question TEXT,
  last_modified_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requirement_id, supplier_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'pass', 'partial', 'fail'))
);
```

### Colonnes Détaillées

| Colonne            | Type         | Nullable | Contrainte                           | Description                             |
| ------------------ | ------------ | -------- | ------------------------------------ | --------------------------------------- |
| `id`               | UUID         | NOT NULL | PRIMARY KEY                          | Identifiant unique de la réponse        |
| `rfp_id`           | UUID         | NOT NULL | FK → rfps(id)                        | ID du RFP parent                        |
| `requirement_id`   | UUID         | NOT NULL | FK → requirements(id)                | ID du requirement évalué                |
| `supplier_id`      | UUID         | NOT NULL | FK → suppliers(id)                   | ID du fournisseur                       |
| `response_text`    | TEXT         | NULL     | -                                    | Texte de la réponse du fournisseur      |
| `ai_score`         | DECIMAL(3,1) | NULL     | 0-5, incréments de 0.5               | Score généré par IA                     |
| `ai_comment`       | TEXT         | NULL     | -                                    | Commentaire généré par IA               |
| `manual_score`     | DECIMAL(3,1) | NULL     | 0-5, incréments de 0.5               | **Score manuel (CIBLE D'IMPORT)**       |
| `status`           | VARCHAR(20)  | NOT NULL | 'pending', 'pass', 'partial', 'fail' | Statut d'évaluation                     |
| `is_checked`       | BOOLEAN      | NOT NULL | DEFAULT false                        | Indicateur de révision                  |
| `manual_comment`   | TEXT         | NULL     | -                                    | **Commentaire manuel (CIBLE D'IMPORT)** |
| `question`         | TEXT         | NULL     | -                                    | Question associée                       |
| `last_modified_by` | UUID         | NULL     | FK → users(id)                       | Dernier modificateur                    |
| `created_at`       | TIMESTAMPTZ  | NOT NULL | DEFAULT NOW()                        | Date de création                        |
| `updated_at`       | TIMESTAMPTZ  | NOT NULL | DEFAULT NOW()                        | Date de modification                    |

### Contraintes d'Intégrité

- **UNIQUE (requirement_id, supplier_id)**: Une seule réponse par combinaison requirement/supplier
- **CHECK ai_score**: Entre 0 et 5 avec précision de 0.5 (validé par: `ai_score * 2 = ROUND(ai_score * 2)`)
- **CHECK manual_score**: Entre 0 et 5 avec précision de 0.5 (validé par: `manual_score * 2 = ROUND(manual_score * 2)`)
- **CHECK status**: Doit être 'pending', 'pass', 'partial', ou 'fail'

---

## 2. Tables Liées

### Table `requirements`

```sql
CREATE TABLE requirements (
  id UUID PRIMARY KEY,
  rfp_id UUID NOT NULL REFERENCES rfps(id),
  requirement_id_external VARCHAR(50) NOT NULL,  -- Ex: "R - 1", "R - 2"
  title TEXT NOT NULL,
  description TEXT,
  context TEXT,
  parent_id UUID REFERENCES requirements(id),
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  weight DECIMAL(5,4) NOT NULL CHECK (weight BETWEEN 0 AND 1),
  category_id UUID REFERENCES categories(id),
  -- ... autres colonnes
  UNIQUE (rfp_id, requirement_id_external)
);
```

**Champs Importants pour l'Import:**

- `requirement_id_external`: Identifiant externe (ex: "R - 1") utilisé pour le mapping

### Table `suppliers`

```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY,
  rfp_id UUID NOT NULL REFERENCES rfps(id),
  supplier_id_external VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,  -- Ex: "ACCENTURE", "ITC"
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rfp_id, supplier_id_external)
);
```

**Champs Importants pour l'Import:**

- `name`: Nom du fournisseur utilisé pour le mapping

### Table `rfps`

```sql
CREATE TABLE rfps (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES users(id)
);
```

---

## 3. Analyse du Fichier JSON

### Structure Globale

```json
{
  "ACCENTURE": [
    /* array de 18 réponses */
  ],
  "ITC": [
    /* array de 18 réponses */
  ],
  "TCS": [
    /* array de 18 réponses */
  ],
  "CAPGEMINI": [
    /* array de 18 réponses */
  ],
  "LUCEM": [
    /* array de 18 réponses */
  ],
  "ATAWAY": [
    /* array de 18 réponses */
  ],
  "PREREQUIS": [
    /* array de 18 réponses */
  ]
}
```

### Statistiques

- **Nombre de suppliers**: 7
- **Nombre de requirements**: 18
- **Total d'entrées**: 126 (7 × 18)

### Suppliers

```
1. ACCENTURE
2. ATAWAY
3. CAPGEMINI
4. ITC
5. LUCEM
6. PREREQUIS
7. TCS
```

### Requirements IDs

```
R - 1, R - 2, R - 3, R - 4, R - 5, R - 6, R - 7, R - 8, R - 9,
R - 10, R - 11, R - 13, R - 14, R - 18, R - 19, R - 20, R - 21, R - 22
```

**Note**: Les IDs R - 12, R - 15, R - 16, R - 17 sont absents du fichier.

### Structure d'une Entrée

#### Exemple 1: ACCENTURE (notation numérique)

```json
{
  "requirement_id": "R - 1",
  "notation": 5,
  "comment": "Accenture explicitly confirms full L1/L1.5 scope coverage..."
}
```

#### Exemple 2: ITC (notation textuelle)

```json
{
  "requirement_id": "R - 1",
  "notation": "Explicit scope coverage: ITC states L1 and L1.5 support...",
  "comment": null
}
```

### Types de Données dans "notation"

**IMPORTANT**: Le fichier contient **deux types de données différents** dans le champ `notation`:

1. **Type NUMBER** (pour 6 suppliers sur 7):
   - ACCENTURE, TCS, CAPGEMINI, LUCEM, ATAWAY, PREREQUIS
   - Exemples: `5`, `3.5`, `4`, `2.5`
   - Valeurs supportées: 0 à 5 avec incréments de 0.5

2. **Type STRING** (pour ITC uniquement):
   - Contient du texte d'analyse au lieu d'un nombre
   - Exemple: "Explicit scope coverage: ITC states L1 and L1.5 support..."
   - Longueur variable (parfois plusieurs paragraphes)

---

## 4. Mapping de Données pour l'Import

### Mapping des Champs

| Champ JSON                    | Type   | Champ DB                | Transformation                                    |
| ----------------------------- | ------ | ----------------------- | ------------------------------------------------- |
| `requirement_id`              | string | `requirement_id` (UUID) | Lookup via `requirements.requirement_id_external` |
| Clé d'objet (ex: "ACCENTURE") | string | `supplier_id` (UUID)    | Lookup via `suppliers.name`                       |
| `notation` (si nombre)        | number | `manual_score`          | Direct (supporte 0.5 incréments)                  |
| `notation` (si string)        | string | `manual_comment`        | Préfixé par "NOTATION: "                          |
| `comment`                     | string | `manual_comment`        | Direct ou combiné avec notation si ITC            |

### Stratégie de Transformation

```typescript
function transformEntry(supplierName: string, entry: any) {
  let manual_score: number | null = null;
  let manual_comment: string = "";

  // Gérer le champ notation selon son type
  if (typeof entry.notation === "number") {
    manual_score = entry.notation;
    manual_comment = entry.comment || "";
  } else if (typeof entry.notation === "string") {
    // Cas ITC: notation contient du texte
    manual_score = null;
    manual_comment = `NOTATION: ${entry.notation}`;
    if (entry.comment) {
      manual_comment += `\n\nCOMMENT: ${entry.comment}`;
    }
  } else if (entry.notation === null) {
    manual_score = null;
    manual_comment = entry.comment || "";
  }

  return {
    requirement_id_external: entry.requirement_id,
    supplier_name: supplierName,
    manual_score,
    manual_comment,
    status: "pending",
    is_checked: false,
  };
}
```

---

## 5. Données de Référence Requises

### À Récupérer depuis Supabase (PRÉ-REQUIS)

#### 5.1. ID du RFP

```sql
-- Obtenir la liste des RFPs disponibles
SELECT id, title, status, created_at
FROM rfps
ORDER BY created_at DESC;
```

**IMPORTANT**: Vous devez connaître l'UUID du RFP cible avant d'exécuter l'import.

#### 5.2. Mapping des Suppliers

```sql
-- Pour un RFP donné (remplacer 'YOUR_RFP_ID')
SELECT
  name,
  id,
  supplier_id_external
FROM suppliers
WHERE rfp_id = 'YOUR_RFP_ID'
ORDER BY name;
```

**Résultat Attendu:**

| name      | id (UUID)                            | supplier_id_external |
| --------- | ------------------------------------ | -------------------- |
| ACCENTURE | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | SUP001               |
| ATAWAY    | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | SUP002               |
| CAPGEMINI | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | SUP003               |
| ITC       | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | SUP004               |
| LUCEM     | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | SUP005               |
| PREREQUIS | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | SUP006               |
| TCS       | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | SUP007               |

#### 5.3. Mapping des Requirements

```sql
-- Pour un RFP donné (remplacer 'YOUR_RFP_ID')
SELECT
  requirement_id_external,
  id,
  title
FROM requirements
WHERE rfp_id = 'YOUR_RFP_ID'
  AND requirement_id_external IN (
    'R - 1', 'R - 2', 'R - 3', 'R - 4', 'R - 5', 'R - 6',
    'R - 7', 'R - 8', 'R - 9', 'R - 10', 'R - 11', 'R - 13',
    'R - 14', 'R - 18', 'R - 19', 'R - 20', 'R - 21', 'R - 22'
  )
ORDER BY requirement_id_external;
```

**Résultat Attendu:**

| requirement_id_external | id (UUID)                            | title             |
| ----------------------- | ------------------------------------ | ----------------- |
| R - 1                   | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | Scope coverage... |
| R - 2                   | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | Knowledge base... |
| ...                     | ...                                  | ...               |
| R - 22                  | xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | Pricing...        |

---

## 6. Requête SQL d'Import Complète

### Script Généré

Le script SQL complet a été généré dans:

```
/Users/seb7152/Documents/RFP analyzer/RFP-Analyer/scripts/import_responses_generated.sql
```

**Taille**: 7544 lignes

### Utilisation du Script

1. **Ouvrir le fichier** `import_responses_generated.sql`

2. **Remplacer** `YOUR_RFP_ID_HERE` par l'UUID réel de votre RFP:

   ```sql
   v_rfp_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
   ```

3. **Vérifier les prérequis**:
   - Le RFP existe dans la table `rfps`
   - Les 7 suppliers existent dans la table `suppliers` pour ce RFP
   - Les 18 requirements existent dans la table `requirements` pour ce RFP

4. **Exécuter le script** via Supabase SQL Editor ou psql

### Structure du Script

Le script utilise un bloc PL/pgSQL avec:

- Gestion des erreurs par entrée (EXCEPTION)
- Compteurs de succès/erreurs
- INSERT avec ON CONFLICT DO UPDATE (upsert)
- Rapport final d'importation

### Exemple d'une Entrée (ACCENTURE - R - 1)

```sql
INSERT INTO responses (
  rfp_id,
  requirement_id,
  supplier_id,
  manual_score,
  manual_comment,
  status,
  is_checked,
  created_at,
  updated_at
)
SELECT
  v_rfp_id,
  req.id,
  sup.id,
  5,
  'Accenture explicitly confirms full L1/L1.5 scope coverage...',
  'pending',
  FALSE,
  NOW(),
  NOW()
FROM requirements req
CROSS JOIN suppliers sup
WHERE req.rfp_id = v_rfp_id
  AND req.requirement_id_external = 'R - 1'
  AND sup.rfp_id = v_rfp_id
  AND sup.name = 'ACCENTURE'
ON CONFLICT (requirement_id, supplier_id) DO UPDATE SET
  manual_score = 5,
  manual_comment = 'Accenture explicitly confirms full L1/L1.5 scope coverage...',
  updated_at = NOW();
```

---

## 7. Points d'Attention

### Cas Particulier: ITC

Pour ITC, le champ `notation` contient du **texte au lieu de nombres**. Le script gère ce cas en:

- Mettant `manual_score` à NULL
- Plaçant le contenu de `notation` dans `manual_comment` avec préfixe "NOTATION: "
- Ajoutant le `comment` après avec préfixe "COMMENT: "

### Échappement des Apostrophes

Les commentaires contiennent des apostrophes qui doivent être échappées:

```sql
'can''t' -- Correct
'can't'  -- ERREUR SQL
```

Le script génère automatiquement l'échappement correct.

### Contrainte UNIQUE

La table `responses` a une contrainte:

```sql
UNIQUE (requirement_id, supplier_id)
```

Le script utilise `ON CONFLICT DO UPDATE` pour gérer les doublons (upsert).

### Support des Demi-Étoiles

Les colonnes `ai_score` et `manual_score` supportent désormais les valeurs avec 0.5 précision:

- Valeurs valides: 0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5
- Contrainte: `manual_score * 2 = ROUND(manual_score * 2)`

---

## 8. Vérification Post-Import

### Requête de Vérification Globale

```sql
SELECT COUNT(*) as total_responses
FROM responses
WHERE rfp_id = 'YOUR_RFP_ID_HERE';
-- Résultat attendu: 126
```

### Vérification par Supplier

```sql
SELECT
  s.name as supplier,
  COUNT(*) as response_count,
  COUNT(manual_score) as with_score,
  COUNT(manual_comment) as with_comment,
  AVG(manual_score) as avg_score
FROM responses r
JOIN suppliers s ON r.supplier_id = s.id
WHERE r.rfp_id = 'YOUR_RFP_ID_HERE'
GROUP BY s.name
ORDER BY s.name;
```

**Résultat Attendu:**

| supplier  | response_count | with_score | with_comment | avg_score |
| --------- | -------------- | ---------- | ------------ | --------- |
| ACCENTURE | 18             | 18         | 18           | ~3.4      |
| ATAWAY    | 18             | 18         | 18           | ~X.X      |
| CAPGEMINI | 18             | 18         | 18           | ~X.X      |
| ITC       | 18             | 0          | 18           | NULL      |
| LUCEM     | 18             | 18         | 18           | ~X.X      |
| PREREQUIS | 18             | 18         | 18           | ~X.X      |
| TCS       | 18             | 18         | 18           | ~X.X      |

### Vérification par Requirement

```sql
SELECT
  req.requirement_id_external,
  COUNT(*) as response_count,
  AVG(manual_score) as avg_score,
  MIN(manual_score) as min_score,
  MAX(manual_score) as max_score
FROM responses r
JOIN requirements req ON r.requirement_id = req.id
WHERE r.rfp_id = 'YOUR_RFP_ID_HERE'
GROUP BY req.requirement_id_external
ORDER BY req.requirement_id_external;
-- Chaque requirement devrait avoir 7 réponses (une par supplier)
```

---

## 9. Exemple d'Utilisation via API

Si vous préférez importer via l'API Next.js au lieu de SQL direct:

### Endpoint

```
POST /api/rfps/[rfpId]/responses/import
```

### Format de Requête

```typescript
{
  "responses": [
    {
      "requirement_id_external": "R - 1",
      "supplier_id_external": "ACCENTURE",
      "manual_score": 5,
      "manual_comment": "Accenture explicitly confirms..."
    },
    // ... 125 autres entrées
  ]
}
```

### Script de Transformation JSON → API Format

Vous pouvez créer un script Node.js pour transformer le fichier JSON actuel en format API:

```javascript
const fs = require("fs");
const data = require("./imports/RFP_Rating_Grid_Extract.json");

const apiPayload = [];

Object.entries(data).forEach(([supplierName, responses]) => {
  responses.forEach((entry) => {
    let manual_score = null;
    let manual_comment = "";

    if (typeof entry.notation === "number") {
      manual_score = entry.notation;
      manual_comment = entry.comment || "";
    } else if (typeof entry.notation === "string") {
      manual_comment = `NOTATION: ${entry.notation}`;
      if (entry.comment) {
        manual_comment += `\n\nCOMMENT: ${entry.comment}`;
      }
    }

    apiPayload.push({
      requirement_id_external: entry.requirement_id,
      supplier_id_external: supplierName,
      manual_score,
      manual_comment,
    });
  });
});

fs.writeFileSync(
  "./imports/api_format.json",
  JSON.stringify({ responses: apiPayload }, null, 2)
);
```

---

## 10. Checklist Avant Import

- [ ] Obtenir l'UUID du RFP cible
- [ ] Vérifier que les 7 suppliers existent dans la base
- [ ] Vérifier que les 18 requirements existent dans la base
- [ ] Sauvegarder la base de données (backup)
- [ ] Remplacer `YOUR_RFP_ID_HERE` dans le script SQL
- [ ] Tester sur 1-2 entrées d'abord
- [ ] Vérifier les résultats partiels
- [ ] Exécuter l'import complet
- [ ] Exécuter les requêtes de vérification
- [ ] Vérifier les cas particuliers (ITC notamment)

---

## Résumé

Ce document vous fournit:

1. **Structure complète de la table `responses`** avec tous les champs et contraintes
2. **Structure des tables liées** (`requirements`, `suppliers`, `rfps`)
3. **Analyse détaillée du fichier JSON** avec statistiques et exemples
4. **Mappings de données** pour transformer JSON → SQL
5. **Requêtes SQL de référence** pour obtenir les UUIDs nécessaires
6. **Script SQL d'import complet** (7544 lignes) prêt à l'emploi
7. **Points d'attention** et cas particuliers (ITC, apostrophes, etc.)
8. **Requêtes de vérification** post-import
9. **Alternative API** si vous préférez l'import programmatique
10. **Checklist** pour sécuriser l'import

**Le script SQL généré est prêt à être exécuté une fois que vous aurez remplacé `YOUR_RFP_ID_HERE` par l'UUID réel de votre RFP.**
