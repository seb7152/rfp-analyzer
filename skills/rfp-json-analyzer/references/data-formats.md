# RFP JSON Data Formats

Complete reference for the three JSON formats accepted by the RFP JSON Analyzer skill.

## Overview

The skill accepts three types of JSON files:

1. **Structure** (optional) - Category hierarchy and metadata
2. **Requirements** (mandatory) - All RFP requirements with descriptions and weights
3. **Responses** (mandatory) - Supplier responses, one JSON array per supplier

## 1. Structure JSON (Optional)

Defines the RFP category hierarchy and organization.

### Format

```json
{
  "categories": [
    {
      "id": "cat-001",
      "code": "SEC",
      "title": "Security",
      "description": "Security and compliance requirements",
      "level": 1,
      "parent_id": null,
      "weight": 0.3
    },
    {
      "id": "cat-002",
      "code": "SEC.AUTH",
      "title": "Authentication & Access",
      "description": "User authentication and access control",
      "level": 2,
      "parent_id": "cat-001",
      "weight": 0.15
    }
  ]
}
```

### Fields

| Field         | Type           | Required | Description                      |
| ------------- | -------------- | -------- | -------------------------------- |
| `id`          | string         | No       | Unique identifier                |
| `code`        | string         | Yes      | Short code (e.g., "SEC", "PERF") |
| `title`       | string         | Yes      | Display name                     |
| `description` | string         | No       | Detailed explanation             |
| `level`       | number         | No       | Hierarchy level (1=main, 2=sub)  |
| `parent_id`   | string         | No       | Reference to parent category     |
| `weight`      | number\|string | No       | Optional category-level weight   |

### Notes

- Structure is helpful for grouping and categorizing requirements
- If not provided, requirements are grouped by `category_name` field
- Categories should align with requirements' `category_name` fields
- Weights at category level are informational; actual weighting uses requirement weights

## 2. Requirements JSON (Mandatory)

Lists all RFP requirements with descriptions, weights, and metadata.

### Format

```json
{
  "requirements": [
    {
      "id": "req-001",
      "code": "SEC.1",
      "title": "Multi-Factor Authentication",
      "description": "Support for MFA via authenticator apps, hardware tokens, or SMS",
      "category_name": "SEC",
      "weight": 0.15,
      "is_mandatory": true,
      "is_optional": false,
      "is_weighted": true,
      "requirement_type": "functional",
      "priority": "high"
    }
  ]
}
```

### Fields

| Field              | Type           | Required | Description                                               |
| ------------------ | -------------- | -------- | --------------------------------------------------------- |
| `id`               | string         | No       | Internal unique ID                                        |
| `code`             | string         | **Yes**  | Unique code (e.g., "SEC.1") - **MUST match response IDs** |
| `title`            | string         | **Yes**  | Requirement name                                          |
| `description`      | string         | No       | Full requirement details                                  |
| `category_name`    | string         | Yes      | Category code (groups requirements)                       |
| `weight`           | number\|string | Yes      | Importance factor (0.0-1.0 or 0-100)                      |
| `is_mandatory`     | boolean        | No       | Criticality flag                                          |
| `is_optional`      | boolean        | No       | Can be skipped                                            |
| `is_weighted`      | boolean        | No       | Include in scoring                                        |
| `requirement_type` | string         | No       | Type (functional, non-functional, etc.)                   |
| `priority`         | string         | No       | Priority level (high, medium, low)                        |

### Weight Format

Weights can be provided as:

- **Decimal**: `0.15` (recommended, 0.0-1.0 range)
- **Percentage**: `15%` or `"15%"` (automatically converted to 0.15)
- **100-scale**: `15` (interpreted as decimal if <1.0, else as percentage)

All formats are normalized internally.

### Critical Notes

- **Code field is key**: Must match `requirement_id_external` in responses
- Requirements without responses will have no score
- Responses for non-existent requirement codes will be ignored
- Weight should reflect importance for scoring

## 3. Responses JSON (Mandatory, one per supplier)

Supplier responses to each requirement with evaluation scores.

### Format

```json
[
  {
    "id": "resp-001",
    "requirement_id_external": "SEC.1",
    "requirement_code": "SEC.1",
    "response_text": "We support MFA via Google Authenticator, hardware tokens (FIDO2), and SMS backup codes. Available at authentication layer.",
    "ai_score": 8,
    "manual_score": 8,
    "ai_comment": "Comprehensive MFA implementation with multiple methods",
    "manual_comment": "Exceeds requirements, good security posture",
    "question": "What is your MFA implementation timeline?",
    "status": "pass",
    "is_checked": true
  }
]
```

### Fields

| Field                     | Type    | Required   | Description                           |
| ------------------------- | ------- | ---------- | ------------------------------------- |
| `id`                      | string  | No         | Internal unique ID                    |
| `requirement_id_external` | string  | **Yes**    | Requirement code (e.g., "SEC.1")      |
| `requirement_code`        | string  | No         | Alias for `requirement_id_external`   |
| `response_text`           | string  | No         | Supplier's answer/explanation         |
| `ai_score`                | number  | Optional\* | AI evaluation (0-5 scale)             |
| `manual_score`            | number  | Optional\* | Human evaluation (0-5 scale)          |
| `ai_comment`              | string  | No         | AI justification                      |
| `manual_comment`          | string  | No         | Human justification                   |
| `question`                | string  | No         | Follow-up question                    |
| `status`                  | string  | No         | Status (pass, partial, fail, pending) |
| `is_checked`              | boolean | No         | Validation/review flag                |

### Score Selection

**Manual scores take absolute priority over AI scores.**

The skill uses this priority for score selection:

1. **Use `manual_score` if provided** (human judgment is authoritative)
   - Always preferred, even if it differs from `ai_score`
   - Represents expert evaluation and contextual understanding
2. **Use `ai_score` only if `manual_score` is missing**
   - Fallback when human hasn't reviewed the requirement
3. **Skip requirement if neither provided**
   - Contribution to overall score is 0
   - Note the missing evaluation in analysis

**Why this matters**: A human evaluator may score a requirement differently than an AI system due to contextual factors, stakeholder feedback, or clarifications from the supplier. Always trust the manual score.

### Status Values

| Value     | Meaning                   |
| --------- | ------------------------- |
| `pass`    | Requirement fully met     |
| `partial` | Requirement partially met |
| `fail`    | Requirement not met       |
| `pending` | Review pending            |
| (empty)   | Not specified             |

### Important Notes

- **One file per supplier**: Each supplier's responses in separate JSON array
- **requirement_id_external is critical**: Must exactly match requirement `code`
- Case sensitivity: Match codes exactly (e.g., "SEC.1" ≠ "sec.1")
- Responses for unknown requirement codes are ignored
- Partial responses (missing some requirements) are handled gracefully

## Complete Example

### requirements.json

```json
{
  "requirements": [
    {
      "code": "SEC.1",
      "title": "Authentication",
      "category_name": "Security",
      "weight": 0.15
    },
    {
      "code": "SEC.2",
      "title": "Encryption",
      "category_name": "Security",
      "weight": 0.2
    },
    {
      "code": "PERF.1",
      "title": "Response Time",
      "category_name": "Performance",
      "weight": 0.1
    }
  ]
}
```

### responses-supplier-a.json

```json
[
  {
    "requirement_id_external": "SEC.1",
    "response_text": "MFA supported",
    "manual_score": 8
  },
  {
    "requirement_id_external": "SEC.2",
    "response_text": "AES-256 encryption",
    "manual_score": 9
  },
  {
    "requirement_id_external": "PERF.1",
    "response_text": "< 100ms response time",
    "manual_score": 7
  }
]
```

## Common Issues

### Code Mismatch

**Problem**: Responses don't score any requirements
**Cause**: `requirement_id_external` doesn't match `code` in requirements
**Solution**: Verify exact spelling and capitalization

### Missing Weight Format

**Problem**: "Weight must be numeric"
**Cause**: Weight is null or invalid type
**Solution**: Provide weight as number (0.15) or string percentage ("15%")

### Incomplete Responses

**Problem**: Some suppliers have fewer responses
**Cause**: Partial response files (not all requirements answered)
**Solution**: This is expected and handled gracefully - analysis shows response rate

### Scale Mismatch

**Problem**: Scores don't look right
**Cause**: Scores on different scales (0-20 vs 0-10)
**Solution**: Normalize to 0-10 or 0-100 consistently across suppliers
