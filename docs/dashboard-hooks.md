# Hooks React pour le Dashboard de Synthèse RFP

## 🎯 Objectif

Créer des hooks optimisés pour récupérer et gérer les données nécessaires au dashboard de synthèse, avec mise en cache intelligente et gestion d'état.

## 📋 Liste des Hooks

### 1. `useDashboardData` - Hook Principal

**Objectif**: Récupérer toutes les données consolidées pour le dashboard

**Signature**:

```typescript
interface DashboardData {
  rfp: RFP;
  globalProgress: GlobalProgress;
  suppliersAnalysis: SuppliersAnalysis;
  categoriesAnalysis: CategoriesAnalysis;
  weightsConfiguration: WeightsConfiguration;
}

export function useDashboardData(rfpId: string): UseQueryResult<DashboardData>;
```

**Stratégie de chargement**:

1. Paralléliser les requêtes pour optimiser le temps de chargement
2. Utiliser React Query avec staleTime différencié
3. Combiner les données de plusieurs hooks

### 2. `useSuppliersAnalysis` - Analyse Comparative

**Objectif**: Calculer les scores finaux et classements des fournisseurs

**Signature**:

```typescript
interface SuppliersAnalysis {
  comparisonTable: SupplierComparison[];
  performanceMatrix: PerformanceMatrix;
  ranking: SupplierRanking[];
  charts: ChartData[];
}

export function useSuppliersAnalysis(
  rfpId: string
): UseQueryResult<SuppliersAnalysis>;
```

**Calculs implémentés**:

- Score final pondéré par fournisseur
- Classement dynamique avec variations
- Matrice de performance comparative

### 3. `useWeightsManagement` - Gestion des Poids

**Objectif**: Gérer la modification et la persistance des poids

**Signature**:

```typescript
interface WeightsConfiguration {
  categories: CategoryWeight[];
  requirements: RequirementWeight[];
}

export function useWeightsManagement(
  rfpId: string
): UseQueryResult<WeightsConfiguration>;
```

**Fonctionnalités**:

- Modification des poids avec validation
- Historique des changements
- Reset aux poids par défaut
- Synchronisation avec le backend

### 4. `useCategoriesAnalysis` - Analyse par Catégorie

**Objectif**: Analyser les performances par catégorie

**Signature**:

```typescript
interface CategoriesAnalysis {
  categories: CategoryWithAnalysis[];
  requirementsByCategory: Record<string, RequirementAnalysis[]>;
}

export function useCategoriesAnalysis(
  rfpId: string
): UseQueryResult<CategoriesAnalysis>;
```

## 🔄 Stratégies d'Optimisation

### React Query Configuration

```typescript
// Configuration optimisée pour chaque type de donnée
const queryConfigs = {
  globalProgress: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  },
  suppliersAnalysis: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  },
  weightsConfiguration: {
    staleTime: Infinity, // Ne jamais expirer
    refetchOnWindowFocus: false,
  },
};
```

### Gestion de l'État Local

```typescript
// État local pour les modifications non sauvegardées
interface LocalWeightsState {
  categories: Record<string, number>;
  requirements: Record<string, number>;
  lastSync: Date | null;
}

// Hook personnalisé pour l'état local
export function useLocalWeightsState(rfpId: string) {
  // Implémentation avec localStorage
}
```

### Invalidation Intelligente

```typescript
// Invalidation sélective lors des modifications
const invalidateRelatedQueries = (changedType: "category" | "requirement") => {
  queryClient.invalidateQueries(["dashboard-data"]);
  queryClient.invalidateQueries(["suppliers-analysis"]);

  if (changedType === "category") {
    queryClient.invalidateQueries(["categories-analysis"]);
  }
};
```

## 📊 Types Complémentaires

```typescript
// Types pour l'analyse des fournisseurs
interface SupplierComparison {
  supplierId: string;
  supplierName: string;
  totalScore: number;
  categoryScores: Record<string, number>;
  ranking: number;
  previousRanking?: number;
  trend: "up" | "down" | "stable";
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
  confidence: "high" | "medium" | "low";
}

// Types pour l'analyse par catégorie
interface CategoryWithAnalysis {
  id: string;
  title: string;
  currentWeight: number;
  defaultWeight: number;
  requirementCount: number;
  averageScore: number;
  completionRate: number;
  trend: "improving" | "stable" | "declining";
}

interface RequirementAnalysis {
  id: string;
  title: string;
  categoryId: string;
  currentWeight: number;
  averageScore: number;
  status: "pass" | "partial" | "fail" | "pending";
  evaluationCount: number;
}
```

## 🎯 Fonctions Utilitaires

### Calcul des Scores Pondérés

```typescript
export function calculateWeightedScore(
  scores: Record<string, number>,
  categoryWeights: Record<string, number>,
  requirementWeights: Record<string, number>
): number {
  let totalScore = 0;

  for (const [categoryId, score] of Object.entries(scores)) {
    const categoryWeight = categoryWeights[categoryId] || 0;
    const requirementWeight = requirementWeights[score.requirementId] || 1;

    totalScore += score * categoryWeight * requirementWeight;
  }

  return totalScore;
}
```

### Normalisation des Poids

```typescript
export function normalizeWeights(
  weights: Record<string, number>
): Record<string, number> {
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);

  if (total === 0) return weights;

  return Object.fromEntries(
    Object.entries(weights).map(([key, weight]) => [
      key,
      (weight / total) * 100,
    ])
  );
}
```

## 🔄 Gestion des Erreurs

```typescript
// Gestion robuste des erreurs
export function useDashboardError() {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  return { error, setError, clearError };
}
```

## 📈 Performance Monitoring

```typescript
// Hook pour monitoring des performances
export function useDashboardPerformance() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    renderTime: 0,
    queryCount: 0,
  });

  // Log automatique des métriques
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Dashboard Metrics:", metrics);
    }
  }, [metrics]);

  return metrics;
}
```

## 🎨 Intégration avec UI Components

```typescript
// Props pour les composants du dashboard
interface DashboardComponentProps {
  data: DashboardData;
  onWeightChange: (
    type: "category" | "requirement",
    id: string,
    weight: number
  ) => void;
  onExportData: () => void;
  onRefreshData: () => void;
}

// Hook pour les interactions utilisateur
export function useDashboardInteractions() {
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return {
    selectedSupplier,
    setSelectedSupplier,
    selectedCategory,
    setSelectedCategory,
  };
}
```

Cette architecture de hooks permet une gestion optimisée des données du dashboard avec mise en cache intelligente, gestion d'état local, et calculs performants pour les scores pondérés.
