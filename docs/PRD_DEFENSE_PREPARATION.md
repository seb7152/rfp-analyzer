# PRD - AI Defense Preparation Feature

**Version:** 1.0
**Date:** 2025-12-14
**Author:** Product Team
**Status:** Draft - Ready for Review

---

## Executive Summary

This PRD defines the AI-powered Defense Preparation feature for the RFP Analyzer platform. The feature generates structured synthesis reports (Forces/Faiblesses/Questions) to prepare stakeholders for RFP evaluation defense presentations (soutenances).

The system will:
- Analyze evaluation data at the category level using aggregated statistics
- Generate synthesis using AI (via N8N) with minimal hallucination risk
- Aggregate results bottom-up through the category hierarchy
- Integrate seamlessly into the existing Analysis tab
- Provide supplier-specific defense reports with PDF export

---

## Problem Statement

### Current Pain Points

1. **Manual preparation is time-consuming**: Teams spend 3-4 hours manually preparing defense presentations by reviewing hundreds of evaluations
2. **Risk of overlooking critical issues**: Important weaknesses, open questions, or scoring inconsistencies can be missed
3. **No structured approach**: Teams lack a systematic framework to identify strengths, weaknesses, and risks
4. **Difficult to justify decisions**: Hard to quickly locate evidence and reasoning for scoring decisions
5. **Supplier comparison gaps**: Difficult to identify and explain significant scoring gaps between suppliers

### Target Users

- **Primary**: Evaluation coordinators and project managers preparing for defense presentations
- **Secondary**: Analysts reviewing their evaluation quality before submission
- **Tertiary**: Executive stakeholders reviewing RFP outcomes

---

## Goals & Objectives

### Business Goals

1. **Reduce preparation time** from 3-4 hours to 30 minutes (85% reduction)
2. **Increase evaluation quality** by systematically identifying gaps and inconsistencies
3. **Improve decision confidence** through structured analysis of strengths and risks
4. **Enable better stakeholder communication** with professional, data-driven reports

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to prepare defense | < 30 min | User surveys |
| User adoption rate | > 80% of RFPs | Usage analytics |
| Report generation success rate | > 95% | System logs |
| User satisfaction (NPS) | > 8/10 | Post-use survey |
| PDF export usage | > 60% | Feature analytics |

---

## User Stories

### Primary Flows

**US-1: Generate Category-Level Analysis**
> As an evaluation coordinator, I want to generate an AI analysis of each evaluation category so that I can quickly identify strengths, weaknesses, and open questions.

**Acceptance Criteria:**
- Analysis button visible in Analysis tab
- Generation triggers N8N workflow
- Loading state shown during processing (< 30 seconds)
- Results displayed in modal when clicking on category row
- Cached for 24 hours to avoid re-computation

---

**US-2: View Category Synthesis Details**
> As a project manager, I want to click on a category in the heatmap to see its detailed synthesis (Forces/Faiblesses/Questions) so that I can prepare specific talking points.

**Acceptance Criteria:**
- Click on category row opens modal
- Modal displays Forces (top 5), Faiblesses (top 5), Questions (top 5)
- Each item shows: requirement title, weight, summary, scores
- Click on requirement navigates to detailed view
- Modal includes "Generate AI suggestions" for presentation talking points

---

**US-3: Access Supplier-Specific Defense Report**
> As an analyst, I want to access a comprehensive defense report for a specific supplier so that I can review all evaluation decisions before the presentation.

**Acceptance Criteria:**
- Link in Analysis tab: "Voir rapport de soutenance par fournisseur"
- Dedicated page per supplier (/rfps/[rfpId]/defense/[supplierId])
- Displays aggregated synthesis across all categories
- Shows top 10 Forces, top 10 Faiblesses, top 10 Questions globally
- Hierarchical view (RFP → Domain → Category → Detail)
- Export to PDF button

---

**US-4: Export Defense Report to PDF**
> As a project manager, I want to export the defense synthesis to PDF so that I can share it with stakeholders and review it offline.

**Acceptance Criteria:**
- "Export PDF" button on supplier defense page
- PDF includes: RFP title, supplier name, generation date
- Sections: Executive Summary, Strengths, Weaknesses, Questions
- Each item includes requirement reference for traceability
- PDF formatted professionally (branded template)
- Download completes in < 5 seconds

---

### Secondary Flows

**US-5: Regenerate Stale Analysis**
> As a coordinator, I want to regenerate the defense analysis if evaluation data has changed so that I always work with up-to-date information.

**Acceptance Criteria:**
- System detects stale data (responses modified after last analysis)
- Visual indicator shows "Analysis outdated"
- "Regenerate" button available
- Confirmation prompt before regeneration
- Old analysis archived

---

**US-6: View Analysis Generation Progress**
> As a user, I want to see the progress of analysis generation so that I know the system is working.

**Acceptance Criteria:**
- Progress indicator shows: "Analyzing X/Y categories"
- Estimated time remaining displayed
- Can navigate away and return (background processing)
- Toast notification when complete

---

## Functional Requirements

### FR-1: AI Analysis Engine

**Input Data (Per Category)**

To minimize hallucination risk, send **aggregated statistics only**, NOT full text comments:

```typescript
{
  category: {
    id: string,
    title: string,
    level: number,
    total_weight: number,
    requirements_count: number
  },

  // Per-requirement aggregated statistics
  requirements_stats: [
    {
      requirement_id: string,
      requirement_title: string,
      weight: number,

      // Aggregated scoring data
      scores_summary: {
        avg_score: number,
        min_score: number,
        max_score: number,
        score_gap: number,        // max - min
        score_std_dev: number,    // Standard deviation
        suppliers_count: number
      },

      // AI vs Manual consistency
      ai_manual_gap: number,      // Average |ai_score - manual_score|

      // Evaluation completeness
      has_manual_comment: boolean,
      has_ai_comment: boolean,
      has_open_question: boolean,
      annotation_count: number,

      // Audit indicators
      modification_count: number,  // From response_audit
      last_modified_at: string,

      // Status distribution
      status_distribution: {
        pass: number,
        partial: number,
        fail: number,
        pending: number
      }
    }
  ]
}
```

**AI Prompt Template**

```
Vous êtes un assistant d'analyse pour la préparation d'une soutenance RFP.

Analysez la catégorie "{category_title}" ({requirements_count} exigences, poids total {total_weight}).

Pour chaque dimension, considérez :
- POIDS de l'exigence (priorité business)
- ÉCART entre fournisseurs (score_gap)
- COHÉRENCE de l'évaluation (ai_manual_gap, modification_count)
- COMPLÉTUDE (annotations, commentaires, questions ouvertes)

Générez une synthèse en 3 dimensions :

✅ FORCES (max 5)
Exigences avec :
- Consensus fort (score_gap < 1.0)
- Évaluation bien documentée (annotations, commentaires)
- Scores élevés (avg_score >= 3.5)
Priorisez par poids décroissant.
Format : "[Titre exigence] (poids X): [raison en 10 mots max]"

⚠️ FAIBLESSES (max 5)
Exigences avec :
- Scores faibles généralisés (avg_score < 2.5)
- Manque documentation (pas annotations, pas commentaire manuel)
- Statut "pending" ou "fail"
Priorisez par poids décroissant.
Format : "[Titre exigence] (poids X): [problème + impact en 10 mots max]"

❓ QUESTIONS À PRÉPARER (max 5)
Exigences nécessitant justification :
- Écart significatif entre fournisseurs (score_gap > 2.0)
- Question ouverte non résolue (has_open_question)
- Incohérence AI/manuel (ai_manual_gap > 1.0)
- Modifications multiples (modification_count > 2)
Priorisez par : poids × score_gap
Format : "[Titre exigence] (poids X): [question à préparer en 15 mots max]"

RÈGLES :
- MAX 5 items par dimension
- CONCIS (pas de phrases longues)
- CHIFFRES inclus (scores, écarts)
- PRIORISATION par poids
- Référencez requirement_id pour traçabilité
```

**Output Format**

```typescript
{
  category_id: string,
  category_title: string,
  level: number,

  strengths: [
    {
      requirement_id: string,
      requirement_title: string,
      weight: number,
      summary: string,            // AI-generated
      avg_score: number,
      evidence_count: number
    }
  ],

  weaknesses: [
    {
      requirement_id: string,
      requirement_title: string,
      weight: number,
      summary: string,
      avg_score: number,
      evidence_count: number
    }
  ],

  questions: [
    {
      requirement_id: string,
      requirement_title: string,
      weight: number,
      question: string,           // AI-generated question to prepare
      score_gap: number,
      open_question?: string,     // Original open question if exists
      ai_manual_gap?: number
    }
  ],

  metrics: {
    total_weight: number,
    avg_score_weighted: number,
    requirements_count: number,
    high_divergence_count: number,
    open_questions_count: number
  }
}
```

---

### FR-2: Bottom-Up Aggregation

**Algorithm**

```typescript
function aggregateToParent(childrenAnalyses: CategoryAnalysis[]): CategoryAnalysis {
  // Merge all children strengths
  const allStrengths = childrenAnalyses.flatMap(c => c.strengths)

  // Deduplicate by requirement_id
  const uniqueStrengths = deduplicateByRequirementId(allStrengths)

  // Sort by weight descending
  const sortedStrengths = sortBy(uniqueStrengths, 'weight', 'desc')

  // Keep top 5
  const topStrengths = sortedStrengths.slice(0, 5)

  // Same process for weaknesses and questions
  const topWeaknesses = processItems(childrenAnalyses, 'weaknesses')

  // For questions, sort by priority = weight × score_gap
  const topQuestions = processQuestions(childrenAnalyses)

  // Aggregate metrics
  const metrics = {
    total_weight: sum(childrenAnalyses, 'metrics.total_weight'),
    avg_score_weighted: weightedAverage(childrenAnalyses),
    requirements_count: sum(childrenAnalyses, 'metrics.requirements_count'),
    high_divergence_count: sum(childrenAnalyses, 'metrics.high_divergence_count'),
    open_questions_count: sum(childrenAnalyses, 'metrics.open_questions_count')
  }

  return {
    category_id: parentId,
    category_title: parentTitle,
    level: parentLevel,
    strengths: topStrengths,
    weaknesses: topWeaknesses,
    questions: topQuestions,
    metrics,
    children_analyses: childrenAnalyses  // Keep for drill-down
  }
}
```

**Aggregation Levels**

1. **Level 4** (Leaf categories with requirements) → AI Analysis
2. **Level 3** → Aggregate from Level 4
3. **Level 2** → Aggregate from Level 3
4. **Level 1** → Aggregate from Level 2
5. **Level 0** (RFP Global) → Aggregate from Level 1

---

### FR-3: Database Schema

```sql
CREATE TABLE defense_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfp_id UUID REFERENCES rfps(id) NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),  -- NULL = multi-supplier analysis
  version_id UUID REFERENCES evaluation_versions(id),

  -- Full analysis data (JSON structure defined above)
  analysis_data JSONB NOT NULL,

  -- Cache management
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  is_stale BOOLEAN DEFAULT false,  -- Marked when responses change

  -- Metadata
  generation_duration_ms INTEGER,
  categories_analyzed INTEGER,

  CONSTRAINT unique_fresh_analysis
    UNIQUE (rfp_id, supplier_id, version_id)
    WHERE is_stale = false
);

CREATE INDEX idx_defense_analyses_rfp ON defense_analyses(rfp_id);
CREATE INDEX idx_defense_analyses_fresh
  ON defense_analyses(rfp_id, is_stale)
  WHERE expires_at > NOW();

-- Trigger to mark analyses as stale when responses change
CREATE OR REPLACE FUNCTION mark_defense_analyses_stale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE defense_analyses
  SET is_stale = true
  WHERE rfp_id IN (
    SELECT r.rfp_id
    FROM requirements r
    WHERE r.id = NEW.requirement_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER response_updated_mark_stale
AFTER UPDATE ON responses
FOR EACH ROW
WHEN (
  OLD.manual_score IS DISTINCT FROM NEW.manual_score OR
  OLD.ai_score IS DISTINCT FROM NEW.ai_score OR
  OLD.manual_comment IS DISTINCT FROM NEW.manual_comment OR
  OLD.question IS DISTINCT FROM NEW.question OR
  OLD.status IS DISTINCT FROM NEW.status
)
EXECUTE FUNCTION mark_defense_analyses_stale();
```

---

### FR-4: API Endpoints

#### POST /api/rfps/[rfpId]/defense-prep/generate

**Request**
```typescript
{
  supplier_id?: string,       // Optional: specific supplier
  version_id?: string,        // Optional: specific version (default: active)
  force_regenerate?: boolean  // Optional: bypass cache
}
```

**Response**
```typescript
{
  analysis_id: string,
  status: "processing" | "completed" | "failed",
  progress?: {
    current: number,
    total: number,
    eta_seconds: number
  },
  result?: {
    rfp_id: string,
    supplier_id: string | null,
    version_id: string,
    generated_at: string,

    // Global synthesis (RFP level)
    overall: {
      strengths: [...],      // Top 5
      weaknesses: [...],     // Top 5
      questions: [...],      // Top 5
      metrics: {...}
    },

    // By hierarchy level
    by_level: {
      1: [...],  // Domains
      2: [...],  // Categories
      3: [...],  // Subcategories
      4: [...]   // Leaf categories
    },

    // Quick access index
    index: {
      "cat_123": { level: 2, parent_id: "dom_1", ... }
    }
  }
}
```

**Business Logic**
1. Check for existing fresh analysis (not stale, not expired)
2. If exists and !force_regenerate → return cached
3. If not exists or stale:
   - Build category hierarchy tree
   - Identify leaf categories (have requirements)
   - For each leaf → call N8N analysis endpoint
   - Aggregate bottom-up
   - Store result in database
   - Return analysis

**Error Handling**
- 400: Invalid rfpId/supplierId/versionId
- 404: RFP not found
- 429: Too many requests (rate limit: 5/min per RFP)
- 500: N8N webhook failure
- 503: Analysis timeout (> 60s)

---

#### GET /api/rfps/[rfpId]/defense-prep/[analysisId]

Retrieve existing analysis by ID.

---

#### GET /api/rfps/[rfpId]/defense-prep/latest

Get latest analysis (fresh or stale).

**Query Params:**
- `supplier_id` (optional)
- `version_id` (optional)

---

#### POST /api/rfps/[rfpId]/defense-prep/export-pdf

Generate PDF export.

**Request**
```typescript
{
  analysis_id: string,
  supplier_id: string,
  format: "executive" | "detailed"
}
```

**Response**
- Content-Type: application/pdf
- File download

---

### FR-5: N8N Webhook

**New Webhook:** `/webhook/defense-category-analysis`

**Input:**
```typescript
{
  category: {...},
  requirements_stats: [...]  // As defined in FR-1
}
```

**N8N Workflow Steps:**
1. Receive webhook data
2. Construct AI prompt with category + stats
3. Call Claude API (via OpenAI-compatible endpoint or native)
4. Parse JSON response
5. Validate output format
6. Return structured result

**Timeout:** 15 seconds max per category

**Retry Logic:** 2 retries with exponential backoff (2s, 4s)

---

### FR-6: UI Components

#### Component 1: AnalysisTab Enhancement

**Location:** `/components/RFPSummary/AnalysisTab.tsx`

**Changes:**
1. Add button in CategoryHeatmap header: "Générer analyse de soutenance"
2. Button triggers defense analysis generation
3. Show loading overlay during generation
4. Enable click on category rows to open synthesis modal
5. Add link above heatmap: "Voir rapport complet par fournisseur →"

**Mockup:**
```
┌─────────────────────────────────────────────────────────┐
│ Synthèse par Catégorie                                  │
│ [🔄 Générer analyse de soutenance]  [📄 Rapports →]    │
├─────────────────────────────────────────────────────────┤
│ Catégorie          │ Supplier A │ Supplier B │ ...     │
├─────────────────────────────────────────────────────────┤
│ 🔐 Sécurité        │    4.2     │    3.8     │         │  ← Click opens modal
│ ⚡ Performance     │    2.8     │    3.1     │         │
└─────────────────────────────────────────────────────────┘
```

---

#### Component 2: CategorySynthesisModal

**Location:** `/components/defense/CategorySynthesisModal.tsx`

**Props:**
```typescript
{
  categoryId: string,
  analysisData: CategoryAnalysis,
  isOpen: boolean,
  onClose: () => void
}
```

**Content:**
```
┌─────────────────────────────────────────────────────┐
│ Synthèse - Sécurité (Score: 4.1/5)            [✕]  │
├─────────────────────────────────────────────────────┤
│                                                      │
│ ✅ FORCES (4)                                       │
│                                                      │
│ 1. OAuth 2.0 Implementation (poids 3.0)            │
│    → Consensus fort, bien documenté                │
│    Avg: 4.3 | Evidence: 5 annotations              │
│    [Voir exigence →]                               │
│                                                      │
│ 2. Multi-Factor Authentication (poids 4.0)         │
│    → Tous fournisseurs conformes                   │
│    Avg: 4.5 | Evidence: 8 annotations              │
│    [Voir exigence →]                               │
│                                                      │
├─────────────────────────────────────────────────────┤
│ ⚠️ FAIBLESSES (2)                                   │
│                                                      │
│ 1. Encryption at Rest (poids 2.5)                  │
│    → Scores hétérogènes, manque spécifications     │
│    Avg: 2.1 | Evidence: 1 annotation               │
│    [Voir exigence →]                               │
│                                                      │
├─────────────────────────────────────────────────────┤
│ ❓ QUESTIONS À PRÉPARER (3)                         │
│                                                      │
│ 1. Audit Logs Retention (poids 3.0)                │
│    → Écart 2.5 points entre fournisseurs           │
│    Question ouverte: "7 jours suffisant?"          │
│    [Voir exigence →]                               │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

#### Component 3: SupplierDefensePage

**Location:** `/app/dashboard/rfp/[rfpId]/defense/[supplierId]/page.tsx`

**URL:** `/dashboard/rfp/{rfpId}/defense/{supplierId}`

**Layout:**
```
┌─────────────────────────────────────────────────────┐
│ [← Retour]  Rapport de Soutenance - Supplier A     │
│                                     [📥 Export PDF] │
├─────────────────────────────────────────────────────┤
│                                                      │
│ 📊 Vue d'ensemble                                   │
│ ├─ Score global: 3.8/5 (15.2/20)                   │
│ ├─ 12 forces identifiées                           │
│ ├─ 8 faiblesses critiques                          │
│ ├─ 15 questions à préparer                         │
│ └─ Dernière analyse: il y a 2h                     │
│     [⚠️ Données modifiées - Régénérer]             │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 🎯 SYNTHÈSE GLOBALE (Top 10 par dimension)         │
│                                                      │
│ [Tab: Forces] [Tab: Faiblesses] [Tab: Questions]   │
│                                                      │
│ ✅ FORCES PRINCIPALES                               │
│ 1. [Sécurité > OAuth] Support OAuth 2.0 PKCE       │
│    Poids: 3.0 | Score: 4.5 | Evidence: 5           │
│    [Voir catégorie] [Voir exigence]                │
│                                                      │
│ 2. [Performance > API] Response Time < 100ms        │
│    Poids: 4.0 | Score: 4.8 | Evidence: 12          │
│    [Voir catégorie] [Voir exigence]                │
│    ...                                              │
│                                                      │
├─────────────────────────────────────────────────────┤
│ 📂 SYNTHÈSE PAR DOMAINE                             │
│                                                      │
│ [▼] 🔐 Sécurité (Score: 4.1/5)                     │
│     ├─ 4 forces | 2 faiblesses | 3 questions       │
│     └─ [Voir détail →]                             │
│                                                      │
│ [▶] ⚡ Performance (Score: 2.8/5) ⚠️                │
│     ├─ 2 forces | 5 faiblesses | 8 questions       │
│     └─ [Voir détail →]                             │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

#### Component 4: DefenseExportButton

**Location:** `/components/defense/DefenseExportButton.tsx`

**Functionality:**
- Calls `/api/rfps/[rfpId]/defense-prep/export-pdf`
- Shows loading spinner during PDF generation
- Triggers browser download on success
- Error toast on failure

---

### FR-7: PDF Export Template

**Library:** jsPDF or Puppeteer (server-side HTML → PDF)

**PDF Structure:**

```
┌─────────────────────────────────────────┐
│ [LOGO]  RAPPORT DE SOUTENANCE          │
│                                          │
│ RFP: [Title]                            │
│ Fournisseur: [Supplier Name]           │
│ Date: [Generation Date]                 │
└─────────────────────────────────────────┘

Page 1: Executive Summary
─────────────────────────
Vue d'ensemble
• Score global: X.X/5 (XX/20)
• Exigences évaluées: XXX
• Forces: XX | Faiblesses: XX | Questions: XX

Page 2-3: Forces Principales
─────────────────────────────
✅ FORCES (Top 10)

1. [Domaine] Titre exigence
   Poids: X.X | Score: X.X | Evidence: X annotations
   Synthèse: [AI summary]

2. ...

Page 4-5: Faiblesses Critiques
───────────────────────────────
⚠️ FAIBLESSES (Top 10)

1. [Domaine] Titre exigence
   Poids: X.X | Score: X.X | Evidence: X annotations
   Problème: [AI summary]

2. ...

Page 6-7: Questions à Préparer
───────────────────────────────
❓ QUESTIONS (Top 10)

1. [Domaine] Titre exigence
   Poids: X.X | Écart: X.X points
   Question: [AI-generated question]
   Context: [Open question if any]

2. ...

Page 8+: Annexes (Optional)
────────────────────────────
Synthèse par domaine (collapsed view)
```

---

## Technical Specifications

### Tech Stack

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase PostgreSQL
- **AI Processing:** N8N + Claude (via Anthropic API)
- **PDF Generation:** Puppeteer (server-side)
- **Caching:** PostgreSQL + Redis (optional future enhancement)

### Performance Requirements

| Metric | Target | Notes |
|--------|--------|-------|
| Analysis generation time | < 30s | For RFP with 200 requirements, 20 categories |
| Category analysis (N8N) | < 15s each | Parallel processing |
| Modal open latency | < 200ms | Cached data |
| PDF export generation | < 5s | A4 format, 10-15 pages |
| Cache hit rate | > 80% | Within 24h window |

### Security & Permissions

- **Row Level Security:** Users can only generate/view analyses for their organization's RFPs
- **Rate Limiting:** 5 generations per minute per RFP (prevent abuse)
- **Audit Logging:** Log all analysis generations in `defense_analyses` table
- **PDF Access:** Signed URLs with 1-hour expiration (if stored in GCS)

### Data Privacy

- No PII in AI prompts (only aggregated statistics)
- PDF exports stored temporarily (auto-delete after 7 days)
- N8N webhook logs retention: 30 days

---

## UI/UX Specifications

### Integration Points

#### 1. Analysis Tab - CategoryHeatmap Enhancement

**Location:** Existing Analysis tab

**Additions:**
- **Header button:** "Générer analyse de soutenance" (primary CTA)
- **Link:** "Voir rapports par fournisseur →" (secondary action)
- **Row click behavior:** Open CategorySynthesisModal
- **Loading state:** Full-screen overlay with progress bar during generation

**Visual Indicators:**
- ⚠️ Badge on button if analysis is stale
- ✓ Badge if fresh analysis exists
- 🔄 Spinner if generation in progress

---

#### 2. Category Synthesis Modal

**Trigger:** Click on category row in heatmap

**Design:**
- **Width:** 800px
- **Height:** Auto (max-height: 80vh, scrollable)
- **Close:** Click outside, ESC key, or [×] button
- **Tabs:** Forces | Faiblesses | Questions (default: Forces)
- **Empty state:** "Aucune analyse disponible. [Générer maintenant →]"

**Item Card Design:**
```
┌───────────────────────────────────────┐
│ 1. OAuth 2.0 Support (poids 3.0) ✅  │
│    Avg: 4.3/5 | Evidence: 5 📎       │
│                                       │
│    Consensus fort entre fournisseurs,│
│    bien documenté avec annotations   │
│                                       │
│    [Voir exigence →]                 │
└───────────────────────────────────────┘
```

**Colors:**
- Forces: Green accent (#10b981)
- Faiblesses: Yellow/Orange accent (#f59e0b)
- Questions: Blue accent (#3b82f6)

---

#### 3. Supplier Defense Page

**Navigation:**
- From Analysis tab → Click "Voir rapports par fournisseur"
- Shows supplier selector dropdown
- Redirects to `/dashboard/rfp/{rfpId}/defense/{supplierId}`

**Header:**
- Breadcrumb: Dashboard > RFP > Defense > Supplier A
- Title: "Rapport de Soutenance - {Supplier Name}"
- Actions: [← Retour] [🔄 Régénérer] [📥 Export PDF]

**Content Sections:**
1. **Overview Card** (collapsed by default)
   - Key metrics
   - Stale indicator if applicable

2. **Global Synthesis Tabs**
   - Forces (default)
   - Faiblesses
   - Questions
   - Top 10 per tab, sortable by weight/score

3. **Domain Breakdown** (expandable tree)
   - Level 1: Domains (collapsed)
   - Click to expand → shows category-level summary
   - "Voir détail" button → opens CategorySynthesisModal

**Empty State:**
- Message: "Aucune analyse disponible pour ce fournisseur"
- CTA: "Générer l'analyse maintenant"

---

### Mobile Responsiveness

- Modal: Full-screen on mobile (< 768px)
- Defense page: Tabs collapse to dropdown on mobile
- PDF export: Disable on mobile (show message: "Export PDF disponible sur desktop")

---

### Accessibility

- Keyboard navigation (Tab, Enter, ESC)
- ARIA labels for all interactive elements
- Screen reader announcements for loading states
- Color contrast ratio > 4.5:1 (WCAG AA)

---

## Out of Scope (Future Enhancements)

### Phase 2 - Advanced Features

- **Simulation de Questions:** AI generates likely jury questions based on weaknesses
- **Presentation Slides Export:** PowerPoint generation with key talking points
- **Comparative Analysis:** Side-by-side supplier comparison view
- **Real-time Collaboration:** Multiple users annotating defense report simultaneously
- **Custom Weights for Defense:** Adjust importance of Forces/Faiblesses/Questions for specific audiences

### Phase 3 - Intelligence

- **Learning from Past Defenses:** Track which questions were actually asked
- **Automatic Action Items:** Generate TODO list (e.g., "Add annotation to Req #45")
- **Sentiment Analysis:** Analyze tone of comments to detect evaluator uncertainty
- **Trend Detection:** Identify systematic biases in evaluations

---

## Implementation Plan

### Phase 1: Foundation (Week 1-2)

**Sprint 1.1: Backend Infrastructure**
- [ ] Database schema creation (defense_analyses table)
- [ ] Trigger for stale analysis detection
- [ ] API endpoint: POST /generate
- [ ] API endpoint: GET /latest
- [ ] Aggregation algorithm implementation
- [ ] Unit tests for aggregation logic

**Sprint 1.2: N8N Workflow**
- [ ] Create defense-category-analysis webhook
- [ ] Implement AI prompt construction
- [ ] Integrate Claude API call
- [ ] Response parsing & validation
- [ ] Error handling & retries
- [ ] Testing with sample data

---

### Phase 2: Core Features (Week 3-4)

**Sprint 2.1: UI Components**
- [ ] CategorySynthesisModal component
- [ ] DefenseExportButton component
- [ ] AnalysisTab enhancements (button, link, click handling)
- [ ] Loading states & progress indicators
- [ ] Error states & retry mechanisms

**Sprint 2.2: Supplier Defense Page**
- [ ] Page layout & routing
- [ ] Overview section
- [ ] Global synthesis tabs
- [ ] Domain breakdown (expandable tree)
- [ ] Integration with modal
- [ ] Mobile responsive design

---

### Phase 3: Export & Polish (Week 5)

**Sprint 3.1: PDF Export**
- [ ] PDF template design (HTML)
- [ ] Puppeteer integration
- [ ] API endpoint: POST /export-pdf
- [ ] Download handling
- [ ] Error handling (timeouts, memory)

**Sprint 3.2: Testing & Refinement**
- [ ] End-to-end testing (Cypress/Playwright)
- [ ] Performance testing (100+ requirements)
- [ ] User acceptance testing
- [ ] Bug fixes & polish
- [ ] Documentation (user guide)

---

### Phase 4: Launch (Week 6)

- [ ] Feature flag rollout (beta users)
- [ ] Monitor analytics & errors
- [ ] Gather user feedback
- [ ] Iterate on UX improvements
- [ ] Full release to all users

---

## Success Criteria

### Launch Readiness Checklist

- [ ] All API endpoints return < 2s response time (p95)
- [ ] Analysis generation success rate > 95%
- [ ] PDF export success rate > 98%
- [ ] No critical bugs in production
- [ ] User documentation complete
- [ ] Analytics tracking implemented
- [ ] Error monitoring (Sentry) configured

### Post-Launch (30 days)

- [ ] > 50% of active RFPs have generated defense analysis
- [ ] User satisfaction score > 8/10
- [ ] Average time-to-defense-preparation < 45 min
- [ ] < 5% regeneration rate (analysis quality)
- [ ] > 60% PDF export adoption

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **AI Hallucinations** | High | Medium | Use aggregated stats only (no full text). Validate output format. Show "AI-generated" disclaimer. |
| **N8N Webhook Timeouts** | High | Medium | Implement retries. Process categories in parallel. Set 15s timeout per category. |
| **Performance with Large RFPs** | Medium | High | Implement caching (24h). Paginate category processing. Show progress indicator. |
| **Stale Data Issues** | Medium | Medium | Auto-detect via trigger. Show clear warnings. Easy regenerate button. |
| **PDF Generation Failures** | Low | Low | Implement server-side rendering (Puppeteer). Fallback to simplified format. |
| **User Confusion** | Medium | Low | Onboarding tooltips. Clear labels. User documentation. |

---

## Analytics & Tracking

### Events to Track

| Event | Properties | Purpose |
|-------|-----------|---------|
| `defense_analysis_generated` | rfpId, supplierId, duration_ms, categories_count | Monitor usage & performance |
| `defense_modal_opened` | categoryId, source (heatmap/page) | Understand user navigation |
| `defense_pdf_exported` | rfpId, supplierId, format (executive/detailed) | Measure export adoption |
| `defense_analysis_regenerated` | rfpId, reason (stale/force) | Track data freshness issues |
| `defense_page_viewed` | rfpId, supplierId | Measure feature adoption |

### Dashboards

1. **Usage Dashboard**
   - Daily active users
   - Analyses generated per week
   - Top RFPs using feature
   - PDF export rate

2. **Performance Dashboard**
   - Average generation time
   - N8N webhook success rate
   - Cache hit rate
   - Error rate by type

3. **Quality Dashboard**
   - Regeneration frequency
   - User feedback scores
   - Time spent on defense page
   - Modal interaction rate

---

## Open Questions

1. **Multi-Supplier vs Single-Supplier Analysis:**
   - Should default analysis compare all suppliers or focus on one?
   - **Recommendation:** Default to multi-supplier (comparative). Allow supplier-specific filter.

2. **AI Model Selection:**
   - Use Claude Sonnet (fast, cheaper) or Opus (higher quality)?
   - **Recommendation:** Start with Sonnet. A/B test Opus if quality issues arise.

3. **Cache Invalidation Strategy:**
   - Should we invalidate on ANY response change or only significant ones (score change)?
   - **Recommendation:** Invalidate on score, comment, question, or status change. Ignore minor edits.

4. **PDF Storage:**
   - Store generated PDFs in GCS or generate on-demand?
   - **Recommendation:** Generate on-demand (simpler, always fresh). Consider GCS if performance issues.

5. **Access Control:**
   - Should analysts be able to generate defense reports or only coordinators?
   - **Recommendation:** All users with RFP access can generate. Track in audit log.

---

## Appendix

### A. Sample AI Prompt (Full Example)

```
Vous êtes un assistant d'analyse pour la préparation d'une soutenance RFP.

Analysez la catégorie "Authentification & SSO" (8 exigences, poids total 15.5).

Données agrégées des exigences :

1. OAuth 2.0 Support (poids 3.0)
   - Scores: avg=4.3, min=4.0, max=4.5, gap=0.5, std_dev=0.2
   - AI/Manuel gap: 0.1
   - Evidence: 5 annotations, commentaire manuel ✓
   - Status: 3 pass, 0 partial, 0 fail
   - Modifications: 1

2. Multi-Factor Authentication (poids 4.0)
   - Scores: avg=2.1, min=1.5, max=2.5, gap=1.0, std_dev=0.4
   - AI/Manuel gap: 0.3
   - Evidence: 1 annotation, pas de commentaire manuel
   - Status: 0 pass, 2 partial, 1 fail
   - Modifications: 3
   - Question ouverte: "Support SMS ou TOTP uniquement?"

3. ...

Générez une synthèse en 3 dimensions :

✅ FORCES (max 5) ...
⚠️ FAIBLESSES (max 5) ...
❓ QUESTIONS (max 5) ...
```

### B. Sample AI Response

```json
{
  "strengths": [
    {
      "requirement_id": "req_oauth",
      "summary": "Consensus fort (4.0-4.5), excellente documentation",
      "weight": 3.0,
      "avg_score": 4.3
    }
  ],
  "weaknesses": [
    {
      "requirement_id": "req_mfa",
      "summary": "Scores faibles généralisés, manque commentaires techniques",
      "weight": 4.0,
      "avg_score": 2.1
    }
  ],
  "questions": [
    {
      "requirement_id": "req_mfa",
      "question": "Justifier écart entre fournisseurs et type MFA accepté",
      "weight": 4.0,
      "score_gap": 1.0,
      "open_question": "Support SMS ou TOTP uniquement?"
    }
  ]
}
```

### C. Database Indexes

```sql
-- Optimize analysis retrieval
CREATE INDEX idx_defense_fresh_lookup
  ON defense_analyses(rfp_id, supplier_id, version_id)
  WHERE is_stale = false AND expires_at > NOW();

-- Optimize stale marking trigger
CREATE INDEX idx_requirements_rfp ON requirements(rfp_id);
CREATE INDEX idx_responses_requirement ON responses(requirement_id);
```

---

## Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-14 | Product Team | Initial PRD draft |

---

**Approval Sign-offs:**

- [ ] Product Owner: _______________
- [ ] Tech Lead: _______________
- [ ] Design Lead: _______________
- [ ] Stakeholder: _______________
