# Export Fields Reference

This document lists all available fields that can be mapped when configuring exports in the RFP Analyzer system.

## Available Fields

### Requirement Fields

| Field Name                           | Description                                            | Type   | Example                      |
| ------------------------------------ | ------------------------------------------------------ | ------ | ---------------------------- |
| `requirement_code`                   | External requirement identifier                        | string | "REQ-001"                    |
| `requirement_title`                  | Requirement title                                      | string | "Authentication System"      |
| `requirement_description`            | Detailed requirement description                       | string | "The system must support..." |
| `requirement_weight`                 | Requirement weight/importance (absolute)               | number | 0.15                         |
| `requirement_weight_local_percent`\* | Local weight within parent category (decimal 0.0-1.0) | number | 0.305                        |

\***Note on `requirement_weight_local_percent`**: This field is **calculated on-the-fly** and not stored in the database.

- Formula: `requirement weight / sum of sibling weights`
- Example: If 3 requirements in category with weights 0.15, 0.20, 0.15, the first shows 0.30 (30%)
- Returned as decimal (0.305 = 30.5%)
- Rounded to 4 decimal places (DECIMAL(5,4) format)
- Returns 1.0 (100%) if requirement has no category assigned
- Returns 0.0 if total sibling weight is zero

### Supplier Response Fields

| Field Name          | Description              | Type   | Example                              |
| ------------------- | ------------------------ | ------ | ------------------------------------ |
| `supplier_response` | Supplier's response text | string | "Our solution provides..."           |
| `status`            | Response status          | enum   | "pass", "partial", "fail", "pending" |

### Scoring Fields

| Field Name     | Description                                                     | Type         | Example |
| -------------- | --------------------------------------------------------------- | ------------ | ------- |
| `ai_score`     | AI-generated score                                              | number (0-5) | 4.5     |
| `manual_score` | Manually assigned score                                         | number (0-5) | 4.0     |
| `smart_score`  | **Smart score** - Manual score if available, otherwise AI score | number (0-5) | 4.0     |

> **Note on `smart_score`**: This field implements intelligent fallback logic. It will:
>
> 1. Use the manual score if it has been set by a reviewer
> 2. Fall back to the AI score if no manual score exists
> 3. Default to 0 if neither score is available

### Comment Fields

| Field Name       | Description                                                           | Type   | Example                             |
| ---------------- | --------------------------------------------------------------------- | ------ | ----------------------------------- |
| `ai_comment`     | AI-generated comment/justification                                    | string | "The response fully addresses..."   |
| `manual_comment` | Reviewer's manual comment                                             | string | "Additional verification needed..." |
| `smart_comment`  | **Smart comment** - Manual comment if available, otherwise AI comment | string | "Additional verification needed..." |

> **Note on `smart_comment`**: This field implements intelligent fallback logic. It will:
>
> 1. Use the manual comment if it has been entered by a reviewer (and is not empty)
> 2. Fall back to the AI comment if no manual comment exists or is empty
> 3. Default to empty string if neither comment is available

### Review Fields

| Field Name | Description                       | Type   | Example                                  |
| ---------- | --------------------------------- | ------ | ---------------------------------------- |
| `question` | Questions or doubts from reviewer | string | "Need clarification on deployment model" |

### Future Fields

| Field Name    | Description               | Type   | Status |
| ------------- | ------------------------- | ------ | ------ |
| `annotations` | PDF annotations/bookmarks | string | TODO   |

## Field Mapping Logic

### Smart Score Logic

```typescript
smart_score = manual_score ?? ai_score ?? 0;
```

The smart score prioritizes human review:

- If a reviewer has assigned a manual score → use manual score
- If no manual score exists → use AI score
- If neither exists → default to 0

### Smart Comment Logic

```typescript
smart_comment =
  manual_comment && manual_comment !== "" ? manual_comment : (ai_comment ?? "");
```

The smart comment prioritizes human feedback:

- If a reviewer has entered a manual comment (non-empty) → use manual comment
- If no manual comment or empty → use AI comment
- If neither exists → default to empty string

## Usage in Export Configuration

When configuring an export, you can map any of these fields to Excel columns:

```json
{
  "column_mappings": [
    { "column": "A", "field": "requirement_code", "header_name": "Code" },
    { "column": "B", "field": "requirement_title", "header_name": "Titre" },
    { "column": "C", "field": "supplier_response", "header_name": "Réponse" },
    { "column": "D", "field": "ai_score", "header_name": "Note IA" },
    { "column": "E", "field": "manual_score", "header_name": "Note Manuel" },
    {
      "column": "F",
      "field": "smart_score",
      "header_name": "Note Intelligent"
    },
    { "column": "G", "field": "ai_comment", "header_name": "Commentaire IA" },
    {
      "column": "H",
      "field": "manual_comment",
      "header_name": "Commentaire Manuel"
    },
    {
      "column": "I",
      "field": "smart_comment",
      "header_name": "Commentaire Intelligent"
    },
    { "column": "J", "field": "question", "header_name": "Questions / Doutes" }
  ]
}
```

## Best Practices

1. **Use Smart Fields for Final Reports**: When generating reports for stakeholders, use `smart_score` and `smart_comment` to show the most relevant information (prioritizing human review over AI).

2. **Use Separate Fields for Audit Trail**: When generating detailed audit reports, include both AI and manual fields separately to show the full review process.

3. **Include Questions Field**: Always include the `question` field in exports to capture reviewer concerns and follow-up items.

4. **Field Order Recommendation**:
   - Start with requirement identification (code, title)
   - Add requirement details (description, weight)
   - Add supplier response
   - Add scoring fields (smart_score or separate ai_score/manual_score)
   - Add comment fields (smart_comment or separate ai_comment/manual_comment)
   - End with review fields (question, status)

## Recent Changes

### 2025-12-11: Smart Fields and Questions

- Added `smart_score` field with intelligent fallback logic
- Added `smart_comment` field with intelligent fallback logic
- Added `question` field for reviewer questions and doubts
- Updated both preview and generate endpoints to support new fields
