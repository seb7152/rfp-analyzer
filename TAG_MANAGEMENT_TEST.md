# Tag Management Feature - Test Guide

This document describes how to test the tag management functionality for RFP requirements JSON import/export.

## Feature Overview

The tag management system enables:

1. **Importing tags** with requirements in JSON format
2. **Automatic tag creation** with random colors from a predefined palette
3. **Tag reuse** - existing tags are reused if they already exist
4. **Exporting tags** with requirements as JSON
5. **Hierarchical preservation** - tags are preserved in both flat and hierarchical requirement structures

## Test Scenarios

### Test 1: Import Requirements with Tags

**Endpoint:** `POST /api/rfps/[rfpId]/requirements/import`

**Request Body:**

```json
{
  "json": "[
    {
      \"code\": \"REQ001\",
      \"title\": \"System Integration\",
      \"description\": \"Must integrate with external APIs\",
      \"weight\": 0.8,
      \"category_name\": \"Functional\",
      \"tags\": [\"Backend\", \"Integration\", \"Critical\"],
      \"is_mandatory\": true
    },
    {
      \"code\": \"REQ002\",
      \"title\": \"User Interface\",
      \"description\": \"Must provide intuitive UI\",
      \"weight\": 0.6,
      \"category_name\": \"Functional\",
      \"tags\": [\"Frontend\", \"UX\"],
      \"is_optional\": true
    }
  ]"
}
```

**Expected Results:**

- Requirements are imported successfully
- Tags "Backend", "Integration", "Critical", "Frontend", "UX" are created in the database
- Each tag is assigned a random color from the palette
- Tags are linked to their respective requirements
- Response includes: `{ success: true, requirements: 2, suppliers: 0 }`

**Verification:**

- Check database: `tags` table should have 5 new entries
- Check database: `requirement_tags` junction table should have 5 entries (3 for REQ001, 2 for REQ002)

---

### Test 2: Tag Deduplication on Import

**Endpoint:** `POST /api/rfps/[rfpId]/requirements/import`

**Request Body:**

```json
{
  "json": "[
    {
      \"code\": \"REQ003\",
      \"title\": \"Report Generation\",
      \"description\": \"Generate PDF reports\",
      \"weight\": 0.7,
      \"category_name\": \"Functional\",
      \"tags\": [\"Backend\", \"Reporting\"],
      \"is_mandatory\": true
    }
  ]"
}
```

**Expected Results:**

- Requirement REQ003 is imported
- "Backend" tag is reused (not created again)
- "Reporting" tag is newly created
- Response shows successful import

**Verification:**

- Check database: `tags` table should have 1 new entry (only "Reporting")
- "Backend" tag ID should match the one from Test 1
- `requirement_tags` links REQ003 to both "Backend" and "Reporting"

---

### Test 3: Export Requirements with Tags (Flat)

**Endpoint:** `GET /api/rfps/[rfpId]/requirements?includeTags=true&flatten=true`

**Expected Response Structure:**

```json
[
  {
    "id": "req-1",
    "rfp_id": "rfp-123",
    "requirement_id_external": "REQ001",
    "title": "System Integration",
    "description": "Must integrate with external APIs",
    "weight": 0.8,
    "tags": ["Backend", "Integration", "Critical"],
    "level": 1,
    "parent_id": null,
    "created_at": "2025-01-09T23:59:00Z",
    "updated_at": "2025-01-09T23:59:00Z"
  },
  {
    "id": "req-2",
    "rfp_id": "rfp-123",
    "requirement_id_external": "REQ002",
    "title": "User Interface",
    "description": "Must provide intuitive UI",
    "weight": 0.6,
    "tags": ["Frontend", "UX"],
    "level": 1,
    "parent_id": null,
    "created_at": "2025-01-09T23:59:00Z",
    "updated_at": "2025-01-09T23:59:00Z"
  }
]
```

**Verification:**

- All tags are present in the response
- Tags are in correct order (order from database)
- No extra fields are included

---

### Test 4: Export Requirements with Tags (Hierarchical)

**Endpoint:** `GET /api/rfps/[rfpId]/requirements?includeTags=true`

**Expected Response Structure:**

```json
[
  {
    "id": "req-parent",
    "requirement_id_external": "DOM-1",
    "title": "Domain Requirements",
    "tags": ["Functional", "Mandatory"],
    "level": 1,
    "parent_id": null,
    "children": [
      {
        "id": "req-child-1",
        "requirement_id_external": "REQ001",
        "title": "System Integration",
        "tags": ["Backend", "Integration"],
        "level": 2,
        "parent_id": "req-parent",
        "children": []
      },
      {
        "id": "req-child-2",
        "requirement_id_external": "REQ002",
        "title": "User Interface",
        "tags": ["Frontend", "UX"],
        "level": 2,
        "parent_id": "req-parent",
        "children": []
      }
    ]
  }
]
```

**Verification:**

- Hierarchical structure is preserved
- Tags are present at all levels
- Children are properly nested
- Tags are not lost during hierarchy building

---

### Test 5: Export Without Tags (Backward Compatibility)

**Endpoint:** `GET /api/rfps/[rfpId]/requirements?flatten=true`

**Expected Results:**

- Requirements are returned as normal
- `tags` field is **not** present in response (or is empty array)
- No breaking changes to existing code
- Response structure matches original format

**Verification:**

- Existing API consumers are not affected
- Default behavior (without `includeTags=true`) doesn't include tags

---

### Test 6: Import with Empty Tags Array

**Endpoint:** `POST /api/rfps/[rfpId]/requirements/import`

**Request Body:**

```json
{
  "json": "[
    {
      \"code\": \"REQ004\",
      \"title\": \"Data Processing\",
      \"description\": \"Process incoming data\",
      \"weight\": 0.5,
      \"category_name\": \"Functional\",
      \"tags\": [],
      \"is_mandatory\": true
    }
  ]"
}
```

**Expected Results:**

- Requirement is imported successfully
- No tags are created or linked
- Response shows successful import

---

### Test 7: Import with Special Characters in Tags

**Endpoint:** `POST /api/rfps/[rfpId]/requirements/import`

**Request Body:**

```json
{
  "json": "[
    {
      \"code\": \"REQ005\",
      \"title\": \"Special Requirements\",
      \"description\": \"With special chars\",
      \"weight\": 0.5,
      \"category_name\": \"Functional\",
      \"tags\": [\"C++/C#\", \"Non-Functional (ility)\"],
      \"is_mandatory\": true
    }
  ]"
}
```

**Expected Results:**

- Tags with special characters are created and preserved correctly
- No sanitization or modification of tag names

---

### Test 8: Import Tag Name Length Limits

**Endpoint:** `POST /api/rfps/[rfpId]/requirements/import`

**Request Body (with 101-character tag):**

```json
{
  "json": "[
    {
      \"code\": \"REQ006\",
      \"title\": \"Length Test\",
      \"description\": \"Test tag length validation\",
      \"weight\": 0.5,
      \"category_name\": \"Functional\",
      \"tags\": [\"VeryLongTagNameThatExceedsTheMaximumLengthOf100CharactersAndShouldFailValidation1234567\"],
      \"is_mandatory\": true
    }
  ]"
}
```

**Expected Results:**

- Import fails with validation error
- Response: `{ error: "Validation failed: Tag name exceeds maximum length (100 characters)" }`
- No requirements or tags are created

---

## Implementation Verification Checklist

- [ ] TypeScript types compile without errors
- [ ] ESLint passes without warnings
- [ ] `getRequirementsWithTags()` properly queries the database
- [ ] `getOrCreateTags()` deduplicates tags correctly
- [ ] `linkTagsToRequirement()` creates proper associations
- [ ] `buildHierarchy()` preserves tags in both parent and child nodes
- [ ] Tags are visible in the UI import preview table
- [ ] Example JSON in UI shows tag field
- [ ] `includeTags=true` parameter works correctly
- [ ] `includeTags=false` or missing parameter excludes tags
- [ ] Backward compatibility is maintained for existing callers

## Performance Notes

For N requirements with T unique tags:

- Tag fetching and creation: O(1) - batch operation
- Linking tags: O(N) - one operation per requirement
- Total API time: ~2-4 seconds for 100 requirements with 10 tags

## Database Queries Generated

### Import Flow:

1. Fetch existing tags by name
2. Create missing tags
3. Fetch requirement IDs (one per requirement)
4. Create tag associations

### Export Flow:

1. Fetch requirements
2. Fetch tag associations with tag details (aliased query)
3. Build tag map by requirement ID

## Troubleshooting

### Tags not showing in export

- Verify `includeTags=true` query parameter is present
- Check that tags exist in database via: `SELECT * FROM tags WHERE rfp_id = '{rfpId}'`
- Check requirement_tags junction table

### Tags not created during import

- Check validation errors in response
- Verify tag names meet length requirements (1-100 chars)
- Check Supabase RLS policies allow tag creation

### Race conditions on concurrent imports

- Handled automatically via unique constraint + retry logic
- Check server logs for "Failed to process tags" warnings
