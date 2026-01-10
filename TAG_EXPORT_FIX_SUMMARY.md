# Tag Export Fix - JSON Export Integration

## Problem Identified

The JSON export feature in "Exporter JSON" (tree-view page) was not including tags even though:

- The import functionality was working ✅
- The API endpoint `/api/rfps/[rfpId]/requirements?includeTags=true` was working ✅
- Tags were being stored in the database ✅

**Root Cause**: The JSON export routes were not calling the requirements API. Instead, they were directly querying Supabase and bypassing the `getRequirementsWithTags()` function we created.

## Solution Implemented

### 1. Updated Tree Endpoint (`/app/api/rfps/[rfpId]/tree/route.ts`)

**Modified TreeNode Interface:**

```typescript
interface TreeNode {
  // ... existing fields
  tags?: string[]; // Array of tag names - NEW
  children?: TreeNode[];
}
```

**Updated Requirements Query:**

- **Before**: Fetched only basic requirement fields
- **After**: Added `requirement_tags(tag:tags(id, name))` to the Supabase query

```typescript
.select(
  "id, requirement_id_external, title, description, category_id, level, display_order, is_mandatory, is_optional, requirement_tags(tag:tags(id, name))"
)
```

**Added Tag Extraction Logic:**

- Processes the `requirement_tags` relationship array
- Handles both object and array responses from Supabase
- Extracts tag names and adds them to TreeNode objects

```typescript
const tags: string[] = [];
if (req.requirement_tags && Array.isArray(req.requirement_tags)) {
  for (const assoc of req.requirement_tags) {
    const tagData = Array.isArray(assoc.tag) ? assoc.tag[0] : assoc.tag;
    if (tagData && tagData.name) {
      tags.push(tagData.name);
    }
  }
}

// Only include tags if present
...(tags.length > 0 && { tags })
```

### 2. Updated Tree-View Component (`/app/dashboard/rfp/[rfpId]/tree-view/page.tsx`)

**Modified TreeNode Interface:**

```typescript
interface TreeNode {
  // ... existing fields
  tags?: string[]; // Array of tag names - NEW
}
```

**Updated JSON Export Logic:**

- Now includes tags in the exported JSON when they exist
- Conditionally includes tags field (only if tags are present)

```typescript
exportData.push({
  code: node.code,
  title: node.title,
  description: node.description || "",
  weight: Number((realWeight / 100).toFixed(4)),
  category_name: parentCategoryCode,
  is_mandatory: node.is_mandatory,
  is_optional: node.is_optional,
  ...(node.tags &&
    node.tags.length > 0 && {
      tags: node.tags, // NEW
    }),
});
```

### 3. Updated Export Generate Route (`/app/api/rfps/[rfpId]/export/generate/route.ts`)

**Updated Requirements Query:**

- Added `requirement_tags(tag:tags(id, name))` to the Supabase query
- Tags are now available for Word/Excel exports if needed in the future

```typescript
.select(
  `
  id,
  requirement_id_external,
  title,
  description,
  weight,
  category_id,
  requirement_tags(tag:tags(id, name))  // NEW
`
)
```

## Data Flow After Fix

### JSON Export Flow (Tree-View)

```
User clicks "Données (Exigences)" button
  ↓
Tree-view component has tree data from /api/rfps/{rfpId}/tree
  ↓
Tree endpoint queries requirements WITH tags via Supabase
  ↓
Tags are extracted and included in TreeNode objects
  ↓
Export function builds JSON including tags field
  ↓
JSON file downloaded with tags: ["tag1", "tag2", ...]
```

### API Response Flow

```
GET /api/rfps/{rfpId}/tree
  ↓
Returns hierarchical tree with tags in each requirement node:
{
  "type": "requirement",
  "code": "REQ089",
  "tags": ["Notification", "Feature"],
  "children": [...]
}
```

## Example Export Output

Before fix:

```json
{
  "requirements": [
    {
      "code": "REQ089",
      "title": "Notifications",
      "description": "...",
      "weight": 0.0132,
      "category_name": "L3.3",
      "is_mandatory": false,
      "is_optional": false
    }
  ]
}
```

After fix:

```json
{
  "requirements": [
    {
      "code": "REQ089",
      "title": "Notifications",
      "description": "...",
      "weight": 0.0132,
      "category_name": "L3.3",
      "is_mandatory": false,
      "is_optional": false,
      "tags": ["Notification", "Important", "Feature"]
    }
  ]
}
```

## Backward Compatibility

✅ **Fully Backward Compatible**

- Tags field is optional in the output
- Existing JSON files without tags work unchanged
- No breaking changes to any consumer
- Gracefully handles requirements without tags

## Testing Checklist

- [ ] Import requirements with tags
- [ ] Export requirements as JSON (tree-view "Données (Exigences)" button)
- [ ] Verify tags appear in exported JSON
- [ ] Verify tags in hierarchical structure are preserved
- [ ] Verify requirements without tags export correctly
- [ ] Verify existing exports without tags still work
- [ ] Test with multiple tags per requirement
- [ ] Test with special characters in tag names

## Affected Files

| File                                             | Changes                                                 |
| ------------------------------------------------ | ------------------------------------------------------- |
| `/app/api/rfps/[rfpId]/tree/route.ts`            | Added tags to TreeNode interface and requirements query |
| `/app/dashboard/rfp/[rfpId]/tree-view/page.tsx`  | Added tags to TreeNode interface and JSON export logic  |
| `/app/api/rfps/[rfpId]/export/generate/route.ts` | Added tags to requirements query (Word export)          |

## Performance Impact

- **Tree endpoint**: One additional Supabase relationship query (already optimized with batch fetch)
- **JSON export**: No additional API calls (data already fetched from tree endpoint)
- **Expected**: <50ms additional latency per request (minimal)

## Next Steps for Full Export Support

If tags need to be displayed in Word/Excel exports:

1. Identify the column where tags should appear in the template
2. Modify the document generation logic to populate that column with tag names
3. Test with multiple tags per requirement
4. Handle tag styling/formatting in document

## Verification Steps

To verify the fix works:

1. **Import tags with requirements:**

   ```bash
   POST /api/rfps/{rfpId}/requirements/import
   {
     "json": "[{\"code\":\"REQ001\",\"title\":\"Test\",\"description\":\"Test\",\"weight\":0.5,\"category_name\":\"Functional\",\"tags\":[\"Tag1\",\"Tag2\"]}]"
   }
   ```

2. **View tree (should include tags):**

   ```bash
   GET /api/rfps/{rfpId}/tree
   ```

   Response should include: `"tags": ["Tag1", "Tag2"]`

3. **Export JSON:**
   - Go to tree-view page
   - Click "Données (Exigences)" button
   - Download JSON file
   - Open and verify tags field is present

## Related Documentation

- **[TAG_MANAGEMENT_IMPLEMENTATION.md](TAG_MANAGEMENT_IMPLEMENTATION.md)** - Complete implementation details
- **[TAG_MANAGEMENT_TEST.md](TAG_MANAGEMENT_TEST.md)** - Test scenarios
- **[TAG_MANAGEMENT_QUICK_START.md](TAG_MANAGEMENT_QUICK_START.md)** - Quick reference guide
