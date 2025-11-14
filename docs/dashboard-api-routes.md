# Routes API pour le Dashboard de Synthèse RFP

## 🛠️ Routes API à Créer

### 1. Route Principale du Dashboard

#### `GET /api/rfps/[rfpId]/dashboard`

**Objectif**: Récupérer toutes les données consolidées pour le dashboard de synthèse

**Response attendue**:

```typescript
interface DashboardResponse {
  rfp: RFP;
  globalProgress: {
    completionPercentage: number;
    totalRequirements: number;
    evaluatedRequirements: number;
    statusDistribution: {
      pass: number;
      partial: number;
      fail: number;
      pending: number;
    };
    averageScores: Record<string, number>;
  };
  suppliersAnalysis: {
    comparisonTable: SupplierComparison[];
    performanceMatrix: PerformanceMatrix;
    ranking: SupplierRanking[];
    categories: CategoryAnalysis[];
  };
  categoriesAnalysis: {
    categories: CategoryWithWeights[];
    requirementsByCategory: Record<string, RequirementAnalysis[]>;
  };
  weightsConfiguration: {
    categories: CategoryWeight[];
    requirements: RequirementWeight[];
  };
}
```

**Requêtes SQL nécessaires**:

```sql
-- KPIs globaux
SELECT
  COUNT(r.id) as total_requirements,
  COUNT(CASE WHEN resp.is_checked = true THEN 1 END) as evaluated_requirements,
  ROUND(AVG(COALESCE(resp.manual_score, resp.ai_score, 0)), 2) as avg_score,
  COUNT(CASE WHEN resp.status = 'pass' THEN 1 END) as pass_count,
  COUNT(CASE WHEN resp.status = 'partial' THEN 1 END) as partial_count,
  COUNT(CASE WHEN resp.status = 'fail' THEN 1 END) as fail_count,
  COUNT(CASE WHEN resp.status = 'pending' THEN 1 END) as pending_count
FROM requirements r
LEFT JOIN responses resp ON r.id = resp.requirement_id
WHERE r.rfp_id = $1 AND r.level = 4;

-- Analyse par fournisseur
SELECT
  s.id,
  s.name,
  COUNT(resp.id) as total_responses,
  ROUND(AVG(COALESCE(resp.manual_score, resp.ai_score, 0)), 2) as avg_score,
  COUNT(CASE WHEN resp.status = 'pass' THEN 1 END) as pass_count,
  COUNT(CASE WHEN resp.status = 'partial' THEN 1 END) as partial_count,
  COUNT(CASE WHEN resp.status = 'fail' THEN 1 END) as fail_count
FROM suppliers s
LEFT JOIN responses resp ON s.id = resp.supplier_id
WHERE s.rfp_id = $1
GROUP BY s.id, s.name
ORDER BY avg_score DESC;

-- Analyse par catégorie
SELECT
  c.id,
  c.title,
  c.weight as current_weight,
  COUNT(r.id) as requirement_count,
  ROUND(AVG(COALESCE(resp.manual_score, resp.ai_score, 0)), 2) as avg_score
FROM categories c
LEFT JOIN requirements r ON c.id = r.category_id
LEFT JOIN responses resp ON r.id = resp.requirement_id
WHERE c.rfp_id = $1
GROUP BY c.id, c.title, c.weight;
```

### 2. Route Analyse des Fournisseurs

#### `GET /api/rfps/[rfpId]/suppliers/analysis`

**Objectif**: Analyse comparative détaillée des fournisseurs

**Response attendue**:

```typescript
interface SuppliersAnalysisResponse {
  comparisonTable: {
    supplierId: string;
    supplierName: string;
    totalScore: number;
    categoryScores: Record<string, number>;
    ranking: number;
  }[];
  performanceMatrix: {
    suppliers: string[];
    categories: string[];
    scores: number[][];
  };
  ranking: SupplierRanking[];
}
```

### 3. Route Poids des Catégories

#### `GET /api/rfps/[rfpId]/categories/weights`

**Objectif**: Récupérer les poids actuels des catégories

#### `PUT /api/rfps/[rfpId]/categories/weights`

**Objectif**: Mettre à jour les poids des catégories

**Body attendu**:

```typescript
interface UpdateCategoryWeightsRequest {
  categories: {
    categoryId: string;
    weight: number; // 0-100
  }[];
}
```

### 4. Route Poids des Exigences

#### `GET /api/rfps/[rfpId]/requirements/weights`

**Objectif**: Récupérer les poids des exigences individuelles

#### `PUT /api/rfps/[rfpId]/requirements/weights`

**Objectif**: Mettre à jour les poids des exigences

**Body attendu**:

```typescript
interface UpdateRequirementWeightsRequest {
  requirements: {
    requirementId: string;
    weight: number; // 0-100
  }[];
}
```

## 🔄 Logique de Calcul des Scores Pondérés

### Formule Principale

```
ScoreFinalFournisseur = Σ(ScoreExigence × PoidsCatégorie × PoidsExigence)
```

### Normalisation

```
PoidsNormalisé = PoidsCatégorie / Σ(TousPoidsCatégories)
ScoreFinalNormalisé = ScoreBrut / ScoreMaximumPossible
```

### Recalcul Dynamique

Lors de la modification d'un poids:

1. Recalculer immédiatement tous les scores impactés
2. Mettre à jour le classement
3. Historiser la modification pour undo/redo

## 📊 Types TypeScript Complémentaires

```typescript
// Types pour le dashboard
interface SupplierComparison {
  supplierId: string;
  supplierName: string;
  totalScore: number;
  categoryScores: Record<string, number>;
  ranking: number;
  previousRanking?: number;
}

interface PerformanceMatrix {
  suppliers: string[];
  categories: string[];
  scores: number[][];
}

interface SupplierRanking {
  supplierId: string;
  supplierName: string;
  finalScore: number;
  ranking: number;
  variation: number; // % variation vs moyenne
}

interface CategoryWithWeights {
  id: string;
  title: string;
  currentWeight: number;
  defaultWeight: number;
  requirementCount: number;
  averageScore: number;
}

interface RequirementAnalysis {
  id: string;
  title: string;
  categoryId: string;
  currentWeight: number;
  averageScore: number;
  status: "pass" | "partial" | "fail" | "pending";
}
```

## 🎯 Optimisations de Performance

### Indexation Recommandée

```sql
-- Index composite pour les calculs de scores
CREATE INDEX idx_responses_requirement_supplier
ON responses(requirement_id, supplier_id);

-- Index pour les analyses par catégorie
CREATE INDEX idx_requirements_category_rfp
ON requirements(category_id, rfp_id);

-- Index pour les poids
CREATE INDEX idx_categories_weights
ON categories(rfp_id, weight);
```

### Stratégie de Cache

- React Query avec staleTime de 5 minutes pour les données globales
- staleTime de 2 minutes pour les calculs de scores
- Invalidation sélective lors des modifications de poids

## 🔐 Sécurité

### Validation des Poids

- Somme des poids de catégories = 100%
- Poids individuels entre 0 et 100
- Validation côté client et serveur

### Permissions

- Vérification des permissions RFP (admin/evaluator)
- Isolation des données par organisation (RLS)
