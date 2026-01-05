# Design UI du Dashboard de Synthèse RFP

## 🎯 Objectif

Créer une interface cohérente avec le design system existant, optimisée pour l'analyse comparative et la modification dynamique des poids.

## 🎨 Principes de Design

### 1. **Cohérence Visuelle**

- Utiliser le même palette de couleurs que les pages existantes
- Conserver les composants UI existants (cards, tables, badges)
- Maintenir la structure de navigation (sidebar, header)

### 2. **Responsive Design**

- Adaptation mobile/desktop avec breakpoints cohérents
- Tableaux scrollables horizontalement sur mobile
- Collapsible sections pour optimiser l'espace

### 3. **Performance**

- Virtualisation pour les grandes quantités de données
- Lazy loading des sections complexes
- Optimisation des re-renders avec React.memo

## 📐 Structure du Layout

```
┌─────────────────────────────────────────────────────────┐
│ Header (Navigation + Actions Globales)              │
├─────────────────────────────────────────────────────┤
│ Sidebar │ Main Content Area                    │
│ (Navigation │ ┌─────────────────────────────────┐    │
│ hiérarchique) │ │ Section Avancement Global    │    │
│             │ │ (KPIs + Progression)     │    │
│             │ ├─────────────────────────────────┤    │
│             │ │ Section Fournisseurs       │    │
│             │ │ (Tableau + Matrice)       │    │
│             │ ├─────────────────────────────────┤    │
│             │ │ Section Catégories          │    │
│             │ │ (Tableau + Drill-down)     │    │
│             │ ├─────────────────────────────────┤    │
│             │ │ Section Configuration Poids │    │
│             │ │ (Sliders + Validation)    │    │
│             │ └─────────────────────────────────┤    │
└─────────────────────────────────────────────────────┘
```

## 🎨 Composants UI Principaux

### 1. **Section Avancement Global**

#### `GlobalProgressCard`

```typescript
interface GlobalProgressCardProps {
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
}
```

**Éléments**:

- Progression circulaire principale (gros cercle avec pourcentage)
- KPIs en grille (4 colonnes x 2-3 lignes)
- Graphique mini de progression par catégorie
- Timeline des dernières activités

#### `CategoryProgressBars`

```typescript
interface CategoryProgressBarsProps {
  categories: Array<{
    id: string;
    title: string;
    weight: number;
    completionRate: number;
    averageScore: number;
  }>;
}
```

**Éléments**:

- Barres de progression horizontales
- Scores moyens pondérés
- Indicateurs de tendance (flèches)

### 2. **Section Analyse Comparative des Fournisseurs**

#### `SuppliersComparisonTable`

```typescript
interface SuppliersComparisonTableProps {
  suppliers: Array<{
    id: string;
    name: string;
    totalScore: number;
    categoryScores: Record<string, number>;
    ranking: number;
    previousRanking?: number;
    trend: "up" | "down" | "stable";
  }>;
  onSupplierSelect: (supplierId: string) => void;
  onWeightEdit: () => void;
}
```

**Caractéristiques**:

- Tri automatique par score final (décroissant)
- Mise en évidence du meilleur score
- Indicateurs de variation (flèches colorées)
- Actions rapides (voir détails, exporter)

#### `PerformanceMatrix`

```typescript
interface PerformanceMatrixProps {
  suppliers: string[];
  categories: string[];
  scores: number[][];
  onCellClick: (supplierId: string, categoryId: string) => void;
}
```

**Caractéristiques**:

- Matrice interactive avec coloration automatique
- Tooltips sur hover avec détails
- Légende dynamique des scores
- Zoom sur catégories spécifiques

### 3. **Section Analyse par Catégorie**

#### `CategoryAnalysisView`

```typescript
interface CategoryAnalysisViewProps {
  categories: Array<{
    id: string;
    title: string;
    currentWeight: number;
    defaultWeight: number;
    requirementCount: number;
    averageScore: number;
    completionRate: number;
    trend: "improving" | "stable" | "declining";
  }>;
  onCategorySelect: (categoryId: string) => void;
  onWeightChange: (categoryId: string, weight: number) => void;
}
```

**Caractéristiques**:

- Tableau triable par poids ou score
- Indicateurs visuels de progression
- Actions drill-down vers détail exigences

#### `RequirementsDrillDown`

```typescript
interface RequirementsDrillDownProps {
  categoryId: string;
  categoryName: string;
  requirements: Array<{
    id: string;
    title: string;
    currentWeight: number;
    averageScore: number;
    status: "pass" | "partial" | "fail" | "pending";
    evaluationCount: number;
  }>;
  onRequirementSelect: (requirementId: string) => void;
}
```

### 4. **Section Configuration des Poids**

#### `WeightsConfigurationPanel`

```typescript
interface WeightsConfigurationPanelProps {
  categories: Array<{
    id: string;
    title: string;
    currentWeight: number;
    requirements: Array<{
      id: string;
      title: string;
      currentWeight: number;
    }>;
  }>;
  onCategoryWeightChange: (categoryId: string, weight: number) => void;
  onRequirementWeightChange: (requirementId: string, weight: number) => void;
  onResetWeights: () => void;
  onSaveWeights: () => void;
}
```

**Caractéristiques**:

- Sliders synchronisés pour les poids
- Validation en temps réel (somme = 100%)
- Visualisation de l'impact sur scores
- Boutons de reset et sauvegarde

#### `WeightImpactPreview`

```typescript
interface WeightImpactPreviewProps {
  beforeScores: Record<string, number>;
  afterScores: Record<string, number>;
  rankingChanges: Array<{
    supplierId: string;
    oldRanking: number;
    newRanking: number;
  }>;
}
```

## 🎨 Thème et Couleurs

### Palette Cohérente

```css
:root {
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;

  --success-50: #10b981;
  --success-500: #059669;
  --success-600: #047857;

  --warning-50: #fbbf24;
  --warning-500: #f59e0b;
  --warning-600: #d97706;

  --danger-50: #fef2f2;
  --danger-500: #ef4444;
  --danger-600: #dc2626;

  --slate-50: #f8fafc;
  --slate-900: #0f172a;
}
```

### Codes Couleur pour les Scores

```typescript
const getScoreColor = (score: number, maxScore: number = 5) => {
  const percentage = (score / maxScore) * 100;
  if (percentage >= 80) return "text-green-600 bg-green-50";
  if (percentage >= 60) return "text-blue-600 bg-blue-50";
  if (percentage >= 40) return "text-yellow-600 bg-yellow-50";
  return "text-red-600 bg-red-50";
};
```

## 📱 Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
  .comparison-table {
    font-size: 0.75rem;
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
  }
}

/* Desktop */
@media (min-width: 1025px) {
  .dashboard-grid {
    grid-template-columns: 2fr 1fr;
  }
  .comparison-table {
    font-size: 0.875rem;
  }
}
```

## 🔄 États et Interactions

### États de Chargement

```typescript
interface DashboardLoadingState {
  globalProgress: "loading" | "loaded" | "error";
  suppliersAnalysis: "loading" | "loaded" | "error";
  categoriesAnalysis: "loading" | "loaded" | "error";
  weightsConfiguration: "loading" | "loaded" | "error";
}
```

### Patterns d'Interaction

- **Clic-droit** pour actions rapides
- **Drag-and-drop** pour réorganiser les sections
- **Keyboard shortcuts** pour la navigation
- **Hover states** avec tooltips informatifs

## 🎯 Composants Réutilisables

### `DashboardCard`

```typescript
interface DashboardCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
  loading?: boolean;
}
```

### `ScoreIndicator`

```typescript
interface ScoreIndicatorProps {
  score: number;
  maxScore: number;
  size: "sm" | "md" | "lg";
  showValue?: boolean;
  trend?: "up" | "down" | "stable";
}
```

### `ProgressBar`

```typescript
interface ProgressBarProps {
  value: number;
  max: number;
  size: "sm" | "md" | "lg";
  color?: "primary" | "success" | "warning" | "danger";
  showPercentage?: boolean;
}
```

## 📊 Visualisations

### Graphique en Barres Comparatif

```typescript
interface ComparisonChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  showGrid?: boolean;
  showLabels?: boolean;
}
```

### Radar Chart des Performances

```typescript
interface RadarChartProps {
  suppliers: Array<{
    name: string;
    scores: Record<string, number>;
  }>;
  categories: string[];
  maxScore?: number;
}
```

Ce design system assure une expérience utilisateur cohérente avec les pages existantes tout en ajoutant les fonctionnalités avancées d'analyse comparative et de configuration dynamique des poids.
