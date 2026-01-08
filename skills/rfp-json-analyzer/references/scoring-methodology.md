# Weighted Scoring Methodology

Complete technical reference for RFP score calculations used by the analyzer.

## Overview

The RFP JSON Analyzer uses **weighted average scoring** to fairly evaluate suppliers across requirements with different importance levels.

### Core Formula

```
Global Score = Σ(supplier_score × requirement_weight) / Σ(all_weights)

Where:
- supplier_score = score for a specific requirement (0-10)
- requirement_weight = importance factor of that requirement (0-1)
- Σ = sum across all requirements
```

## Calculation Steps

### Step 1: Normalize Weights

Weights can be provided in multiple formats. Normalize to 0-1 range:

- **Decimal format** (0.15): Use as-is
- **Percentage format** ("15%" or "15"): Divide by 100 → 0.15
- **Missing weight**: Default to 1.0 (equal weight)

```javascript
function normalizeWeight(weight) {
  if (typeof weight === "string" && weight.endsWith("%")) {
    return parseFloat(weight) / 100;
  }
  const num = parseFloat(weight);
  return num > 100 ? num / 100 : num; // Handle 0-100 scale
}
```

### Step 2: Select Score Per Requirement

For each requirement, use the best available score:

1. **Use manual_score** if provided (human judgment priority)
2. **Fall back to ai_score** if manual not available
3. **Skip requirement** if no score provided

```javascript
const score =
  response.manual_score !== undefined
    ? response.manual_score
    : response.ai_score;
```

### Step 3: Calculate Weighted Score

For each requirement-response pair:

```
weighted_score = score × weight
```

**Example**:

- Requirement "SEC.1" has weight 0.20
- Supplier's score is 8/10
- Weighted score = 8 × 0.20 = 1.6

### Step 4: Sum and Average

Aggregate across all requirements:

```
global_score = Σ(weighted_scores) / Σ(weights)
```

### Step 5: Round

Round to 1 decimal place for readability:

```
final_score = round(global_score, 1)
```

## Examples

### Simple Case: Uniform Weights

**Data:**

- REQ.1 (weight 0.25): Supplier scores 8
- REQ.2 (weight 0.25): Supplier scores 7
- REQ.3 (weight 0.25): Supplier scores 9
- REQ.4 (weight 0.25): Supplier scores 8

**Calculation:**

```
weighted_sum = (8×0.25) + (7×0.25) + (9×0.25) + (8×0.25)
             = 2.0 + 1.75 + 2.25 + 2.0
             = 8.0

total_weight = 0.25 + 0.25 + 0.25 + 0.25 = 1.0

score = 8.0 / 1.0 = 8.0
```

### Complex Case: Varied Weights

**Data:**

- SEC.1 (weight 0.20): Supplier scores 9
- SEC.2 (weight 0.15): Supplier scores 7
- PERF.1 (weight 0.10): Supplier scores 8
- COST.1 (weight 0.25): Supplier scores 5
- SUPP.1 (weight 0.30): Supplier scores 8

**Calculation:**

```
weighted_sum = (9×0.20) + (7×0.15) + (8×0.10) + (5×0.25) + (8×0.30)
             = 1.8 + 1.05 + 0.8 + 1.25 + 2.4
             = 7.3

total_weight = 0.20 + 0.15 + 0.10 + 0.25 + 0.30 = 1.0

score = 7.3 / 1.0 = 7.3
```

### Partial Responses Case

If a supplier didn't answer all requirements:

**Data:**

- REQ.1 (weight 0.20): Score 8 ✓
- REQ.2 (weight 0.15): Score 7 ✓
- REQ.3 (weight 0.25): No response ✗
- REQ.4 (weight 0.40): Score 9 ✓

**Calculation:**

```
weighted_sum = (8×0.20) + (7×0.15) + (9×0.40)
             = 1.6 + 1.05 + 3.6
             = 6.25

total_weight = 0.20 + 0.15 + 0.40 = 0.75  // Only requirements with responses

score = 6.25 / 0.75 = 8.33 → 8.3
```

**Note**: Missing requirements reduce total weight but don't penalize the score unless they're required. Report response rate (3/4 = 75%).

## Category Scores

Same calculation applied to requirements within a category:

```
category_score = Σ(scores × weights for category requirements) / Σ(category weights)
```

**Example:**

```
Security category (weight normalized within category):
- SEC.1 (0.20): Score 8  →  1.6
- SEC.2 (0.15): Score 7  →  1.05
- SEC.3 (0.25): Score 9  →  2.25
Total: 4.9 / 0.60 = 8.17 → 8.2
```

## Special Cases

### Zero-Weighted Requirements

Requirements with weight 0:

- **Interpretation**: Not part of scoring (informational only)
- **Handling**: Excluded from calculation
- **Use case**: Must-have checklists that don't affect scoring

### Perfect Uniformity

When all weights are equal:

```
score = average of all scores
```

Example: 4 requirements, all weight 0.25

```
global_score = (8 + 7 + 9 + 8) / 4 = 8.0
```

### Single Supplier

Scoring works identically with one or multiple suppliers:

```
Supplier A: 7.8
Supplier B: 6.5  ← lower but uses same formula
Supplier C: 7.2
```

### Tied Scores

Suppliers with identical weighted scores:

- Reported as equal rank
- Look at category breakdowns for differentiation
- Secondary criteria (cost, timeline) for tie-breaking

## Interpreting Results

### Score Scale (0-10)

| Range    | Interpretation                         |
| -------- | -------------------------------------- |
| 9.0-10.0 | Excellent - exceeds all requirements   |
| 8.0-8.9  | Very Good - meets all key requirements |
| 7.0-7.9  | Good - meets most requirements well    |
| 6.0-6.9  | Fair - meets requirements with gaps    |
| 5.0-5.9  | Marginal - significant gaps remain     |
| < 5.0    | Weak - major concerns                  |

### What Affects Ranking

1. **Weight distribution**: High-weight requirements heavily influence final score
2. **Performance variation**: Suppliers strong in different areas score differently
3. **Mandatory requirements**: Failure on critical items (high weight) significantly lowers score
4. **Response completeness**: Incomplete responses show response rate as caveat

## Common Scoring Patterns

### High Variance (Specialist Profile)

Supplier excels in some areas but weak in others:

```
- Category A: 9.2 (strength)
- Category B: 5.8 (weakness)
- Global: 7.5
```

**Insight**: Good specialist; assess if gaps are acceptable for use case.

### Consistent (Generalist Profile)

Supplier performs evenly across categories:

```
- Category A: 7.5
- Category B: 7.4
- Category C: 7.6
- Global: 7.5
```

**Insight**: Reliable all-arounder; safe choice.

### Weighted Advantage

Supplier dominates high-weight categories:

```
Suppose SECURITY has 40% weight, COST has 20%:
- Supplier A: Good security (8.5), weak cost (5.0) → 7.2 global
- Supplier B: Weak security (5.0), good cost (8.5) → 6.4 global
```

**Insight**: A wins due to security importance.

## Impact Analysis

### Sensitivity to Weight Changes

If a requirement weight doubles:

```
Old weight: 0.15, score: 8  →  contribution 1.2
New weight: 0.30, score: 8  →  contribution 2.4

Global score impact: +0.12 (for normalized weights)
```

### Critical Requirement Scoring

High-weight requirement with low score heavily penalizes:

```
Requirement: 50% weight, score 4
Contribution: 4 × 0.5 = 2.0

Without this: Global = 8.0
With this: Global = (6.0 + 2.0) / 1.5 = 5.3

Impact: -2.7 points globally
```

## Best Practices

1. **Verify weight normalization**: Sum of weights should be ~1.0 (0.8-1.2 acceptable)
2. **Audit score sources**: Manual scores trump AI; verify important scores are reviewed
3. **Check response rates**: Note suppliers with incomplete responses
4. **Category breakdown**: Always look at category scores before deciding
5. **Validate outliers**: If scores seem wrong, check calculation manually
6. **Document assumptions**: Note any weights or scores you override
7. **Sensitivity analysis**: Ask "what if this weight doubled?" to understand impact

## Validation Checklist

Before relying on scores:

- [ ] All requirement codes match between requirements and responses
- [ ] Weights are numeric (or valid percentage strings)
- [ ] Scores are in expected range (0-10, 0-20, 0-100 - consistent)
- [ ] Manual scores are used where critical requirements are evaluated
- [ ] No zero-weight requirements were intended to be scored
- [ ] Response rates are acceptable (>80% recommended)
- [ ] Category scores make logical sense
- [ ] Ranking aligns with intuitive assessment

## References

See [data-formats.md](data-formats.md) for detailed JSON schema and field definitions.
