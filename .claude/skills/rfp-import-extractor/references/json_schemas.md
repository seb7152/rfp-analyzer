# JSON Schemas for RFP Import

This document defines the JSON schemas for importing data into the RFP Analyzer project.

## Categories (Structure)

Categories define the hierarchical structure of requirements (domains, sub-domains, etc.).

### Schema

```json
{
  "id": "string",              // Required - Unique identifier for the category
  "code": "string",            // Required - Code for the category (must be unique)
  "title": "string",           // Required - Display title
  "short_name": "string",      // Optional - Abbreviated name
  "level": integer,            // Required - Hierarchy level (1, 2, 3, etc.)
  "parent_id": "string|null",  // Optional - ID of parent category (null for top-level)
  "order": integer             // Optional - Display order within the same level
}
```

### Example

```json
[
  {
    "id": "DOM1",
    "code": "DOM1",
    "title": "Functional Requirements",
    "short_name": "FUNC",
    "level": 1,
    "parent_id": null,
    "order": 1
  },
  {
    "id": "DOM1.1",
    "code": "DOM1.1",
    "title": "User Management",
    "short_name": "USER",
    "level": 2,
    "parent_id": "DOM1",
    "order": 1
  }
]
```

### Validation Rules

- `id` and `code` must be unique across all categories
- `level` must be a positive integer (1, 2, 3, ...)
- Top-level categories (level 1) should have `parent_id` set to `null`
- `parent_id` must reference an existing category `id` (if not null)

---

## Requirements (Exigences)

Requirements are the individual items that need to be evaluated in the RFP.

### Schema

```json
{
  "code": "string",              // Required - Unique requirement code
  "title": "string",             // Required - Requirement title/summary
  "description": "string",       // Required - Detailed description
  "weight": float,               // Required - Weight/importance (0.0 to 1.0)
  "category_name": "string",     // Required - Category code or title
  "is_mandatory": boolean,       // Optional - Is this a mandatory requirement? (default: false)
  "is_optional": boolean,        // Optional - Is this an optional requirement? (default: false)
  "page_number": integer,        // Optional - Page number in source document
  "rf_document_id": "string"     // Optional - UUID of the source document
}
```

### Example

```json
[
  {
    "code": "REQ001",
    "title": "User Authentication",
    "description": "The system must support secure user authentication with SSO capabilities",
    "weight": 0.9,
    "category_name": "DOM1.1",
    "is_mandatory": true,
    "is_optional": false,
    "page_number": 12
  },
  {
    "code": "REQ002",
    "title": "Multi-factor Authentication",
    "description": "Support for MFA using TOTP or SMS",
    "weight": 0.6,
    "category_name": "User Management",
    "is_mandatory": false,
    "is_optional": true,
    "page_number": 13
  }
]
```

### Validation Rules

- `code` must be unique across all requirements
- `weight` must be between 0.0 and 1.0
- `category_name` can be either the category `code` or `title` - the system will match it
- `is_mandatory` and `is_optional` should not both be true
- `page_number` must be a positive integer if provided

---

## Supplier Responses

Responses contain supplier answers and evaluations (both AI and manual).

### Schema

```json
{
  "requirement_id_external": "string",  // Required - The requirement code this response is for
  "response_text": "string",            // Optional - Supplier's response text
  "ai_score": float,                    // Optional - AI evaluation score (0-5, in 0.5 increments)
  "ai_comment": "string",               // Optional - AI analysis/comment
  "manual_score": float,                // Optional - Manual evaluation score (0-5, in 0.5 increments)
  "manual_comment": "string",           // Optional - Human reviewer's comment
  "question": "string",                 // Optional - Evaluation question
  "status": "string",                   // Optional - Status: "pending", "pass", "partial", "fail"
  "is_checked": boolean                 // Optional - Has this been reviewed? (default: false)
}
```

### Example

```json
[
  {
    "requirement_id_external": "REQ001",
    "response_text": "Our solution provides SSO integration via SAML 2.0 and OAuth 2.0",
    "ai_score": 4.5,
    "ai_comment": "Strong response demonstrating SSO capabilities with industry standards",
    "manual_score": 4.0,
    "manual_comment": "Good answer but needs more detail on implementation timeline",
    "question": "How does your solution handle user authentication?",
    "status": "pass",
    "is_checked": true
  },
  {
    "requirement_id_external": "REQ002",
    "response_text": "MFA is available through our authentication module",
    "ai_score": 3.0,
    "ai_comment": "Basic MFA support mentioned but lacks specific details",
    "status": "partial"
  },
  {
    "requirement_id_external": "REQ003",
    "manual_score": 2.0,
    "manual_comment": "Response does not adequately address the requirement",
    "status": "fail",
    "is_checked": true
  }
]
```

### Validation Rules

- `requirement_id_external` must reference an existing requirement code
- `ai_score` and `manual_score` must be between 0 and 5, in increments of 0.5 (0, 0.5, 1.0, 1.5, ..., 5.0)
- `status` must be one of: "pending", "pass", "partial", "fail"
- At least one of the optional fields should be provided (otherwise the response has no data)

---

## Import Modes

### UPSERT Behavior (Responses)

When importing supplier responses, the system uses **UPSERT** mode:
- If a response for a requirement already exists, it will be **updated** with the provided fields
- Fields not provided in the import JSON will **retain their existing values**
- This allows partial updates without overwriting all data

### CREATE or UPDATE (Categories & Requirements)

- **Categories**: Creating categories with the same `code` may fail or update existing ones (depends on API endpoint)
- **Requirements**: Similar behavior - check if codes already exist before importing

---

## Best Practices

1. **Always validate JSON before importing** using the `validate_json.py` script
2. **Use consistent coding schemes** for categories and requirements
3. **Test with a small sample** before importing large datasets
4. **Back up existing data** before major imports
5. **Document your extraction script** for future reuse
6. **Save extraction scripts** in a known location (e.g., `scripts/extractions/`)
