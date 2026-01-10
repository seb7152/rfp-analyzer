# Building Custom Extraction Scripts

This guide covers creating Python scripts tailored to extract RFP data from Excel and Word files.

## Script Template

Use this template as the foundation for every extraction script:

```python
#!/usr/bin/env python3
"""
Custom extraction script for [FILE_NAME]

Purpose: Extract [data type] from [file type]
File structure: [brief description]
Created: [DATE]

Usage:
    python extract_[description].py input_file.xlsx output.json
"""

import json
import sys
# Import libraries as needed: openpyxl, pandas, python-docx, etc.

def extract_data(file_path):
    """
    Extract [categories/requirements/responses] from the file.

    Returns:
        List of dictionaries matching the JSON schema
    """
    data = []

    # Your custom extraction logic here based on file structure
    # Example for Excel:
    # wb = openpyxl.load_workbook(file_path)
    # ws = wb['SheetName']
    # for row in ws.iter_rows(min_row=2, values_only=True):
    #     item = {
    #         "code": row[0],
    #         "title": row[1],
    #         # ... map other fields
    #     }
    #     data.append(item)

    return data

def main():
    if len(sys.argv) != 3:
        print("Usage: python script.py <input_file> <output_json>")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    print(f"Extracting from {input_file}...")

    # Extract data
    data = extract_data(input_file)

    print(f"Extracted {len(data)} items")

    # Save to JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Saved to {output_file}")
    print("\nNext step: Validate with 'python validate_json.py'")

if __name__ == "__main__":
    main()
```

## Extraction Guidelines

### Handle Edge Cases

When parsing files, always handle these common issues:

- **Empty cells** → Use `None` or skip depending on context
- **Merged cells** → Track the current value from the top-left cell
- **Whitespace** → Use `.strip()` on all string values
- **Missing required fields** → Log warning and skip the item
- **Special characters** → Ensure UTF-8 encoding throughout

### Field Mapping by Data Type

#### Categories

```python
category = {
    "id": row[0],              # Required - unique identifier
    "code": row[1],            # Required - must be unique
    "title": row[2],           # Required - display name
    "level": int(row[3]),      # Required - positive integer (1, 2, 3...)
    "short_name": row[4],      # Required - abbreviated name (max 50 chars, displayed in UI)
    "parent_id": row[5] or None,  # Optional - reference to parent category
}
```

**Validation notes:**

- Both `id` and `code` must be unique within the category set
- `short_name` is REQUIRED and must be 1-50 characters (used in the UI)
- `level` must be a positive integer
- Top-level categories should have `parent_id` as `null`
- **IMPORTANT**: `parent_id` must EXACTLY match the `id` of the parent category (case-sensitive, not `code` or `title`)
- If using hierarchies, the parent category must exist in the same import with a matching `id`

#### Requirements

```python
requirement = {
    "code": row[0],            # Required - unique code per RFP
    "title": row[1],           # Required - brief title
    "description": row[2],     # Required - detailed explanation
    "weight": float(row[3]),   # Required - 0.0 to 1.0 range
    "category_name": row[4],   # Required - category code or title
    "tags": row[5].split(",") if row[5] else [],  # Optional - comma-separated
    "is_mandatory": row[6] if row[6] else False,  # Optional - boolean
    "is_optional": row[7] if row[7] else False,   # Optional - boolean
    "page_number": int(row[8]) if row[8] else None,  # Optional - positive int
}
```

**Validation notes:**

- Requirement `code` values must be unique
- `weight` must be between 0 and 1 (use 0.5 as default if missing)
- `category_name` can be either a category code or title (both work)
- Tags should be non-empty strings, max 100 characters each
- If is_mandatory and is_optional are both true, that's typically a data error

#### Supplier Responses

```python
response = {
    "requirement_id_external": row[0],  # Required - requirement code
    "response_text": row[1],   # Optional - supplier's answer
    "ai_score": float(row[2]) if row[2] else None,  # Optional - 0-5 range
    "ai_comment": row[3],      # Optional - AI evaluation notes
    "manual_score": float(row[4]) if row[4] else None,  # Optional - 0-5 range
    "manual_comment": row[5],   # Optional - human evaluation notes
    "status": row[6],          # Optional - pending/pass/partial/fail
    "is_checked": bool(row[7]) if row[7] else False,  # Optional - reviewed flag
}
```

**Validation notes:**

- `requirement_id_external` links the response to a requirement code
- Scores must be 0-5 with 0.5 increments (0, 0.5, 1.0, 1.5, etc.)
- Valid statuses: `pending`, `pass`, `partial`, `fail`
- Multiple responses can exist for the same requirement (multi-supplier)

### Logging and Debugging

Add strategic logging to help debug extraction issues:

```python
# Log progress at regular intervals
if row_num % 100 == 0:
    print(f"Processing row {row_num}...")

# Warn on skipped items
if not code:
    print(f"WARNING: Skipping row {row_num} - missing code")
    continue

# Log data quality issues
if len(title) > 500:
    print(f"WARNING: Row {row_num} - title exceeds 500 chars")

# Show summary at end
print(f"\nExtracted {len(data)} items:")
print(f"  - Codes: {[item['code'] for item in data[:5]]}...")
print(f"  - Categories: {set(item.get('category_name') for item in data)}")
```

### Common Extraction Patterns

#### Pattern 1: Direct Column Mapping (Simple Table)

Most straightforward - data is already in columns with clear headers.

```python
import openpyxl

def extract_data(file_path):
    wb = openpyxl.load_workbook(file_path)
    ws = wb['Requirements']  # or wb.active

    data = []
    headers = [cell.value for cell in ws[1]]  # Get headers
    code_col = headers.index("Code")  # Find column index
    title_col = headers.index("Title")

    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=False), start=2):
        code = row[code_col].value
        title = row[title_col].value

        if not code:  # Skip empty rows
            continue

        item = {
            "code": str(code).strip(),
            "title": str(title).strip() if title else "",
            # ... map other fields
        }
        data.append(item)

    return data
```

#### Pattern 2: Hierarchical Sections (Tracking Current Category)

When categories are defined by styled headers, track the current category.

```python
import openpyxl
from openpyxl.styles import Font

def extract_data(file_path):
    wb = openpyxl.load_workbook(file_path)
    ws = wb.active

    data = []
    current_category = None

    for row in ws.iter_rows(min_row=1, values_only=False):
        # Check if this is a bold header (category)
        if row[0].font and row[0].font.bold:
            current_category = row[0].value
            continue

        # Regular data row
        code = row[0].value
        title = row[1].value

        if code and current_category:
            item = {
                "code": code,
                "title": title,
                "category_name": current_category,
                # ... other fields
            }
            data.append(item)

    return data
```

#### Pattern 3: Supplier Responses in Columns

When multiple suppliers are represented as columns.

```python
def extract_responses(file_path, supplier_name):
    """Extract responses for a specific supplier"""
    import openpyxl

    wb = openpyxl.load_workbook(file_path)
    ws = wb['Responses']

    data = []

    # Find the supplier column
    headers = [cell.value for cell in ws[1]]
    supplier_col = headers.index(supplier_name)

    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=False), start=2):
        requirement_code = row[0].value  # First column is requirement code
        response_text = row[supplier_col].value

        if requirement_code:
            item = {
                "requirement_id_external": requirement_code,
                "response_text": str(response_text).strip() if response_text else "",
                # ... other fields
            }
            data.append(item)

    return data
```

#### Pattern 4: Word Document with Heading-Based Categories

Extract from Word documents using heading levels.

```python
from docx import Document

def extract_data(file_path):
    """Extract requirements from Word document using heading hierarchy"""
    doc = Document(file_path)

    data = []
    current_category = None

    for para in doc.paragraphs:
        # Identify categories from Heading 1
        if para.style.name == 'Heading 1':
            current_category = para.text
            continue

        # Extract requirements from regular paragraphs or tables
        if para.style.name == 'Normal' and para.text.strip():
            # Assume format: "REQ-001: Title - Description"
            if para.text.startswith("REQ-"):
                parts = para.text.split(":", 1)
                code = parts[0].strip()
                rest = parts[1].strip() if len(parts) > 1 else ""

                title, description = rest.split("-", 1) if "-" in rest else (rest, "")

                item = {
                    "code": code,
                    "title": title.strip(),
                    "description": description.strip(),
                    "category_name": current_category or "General",
                    # ... other fields
                }
                data.append(item)

    return data
```

#### Pattern 5: Generating Hierarchical Category Codes

When extracting categories with a hierarchy, automatically generate codes using hierarchical numbering (1, 1.1, 1.1.1, etc.).

```python
def extract_categories_with_hierarchical_codes(file_path):
    """Extract categories and assign hierarchical codes based on level"""
    import openpyxl

    wb = openpyxl.load_workbook(file_path)
    ws = wb['Categories']

    data = []

    # Track code counters per level
    level_counters = {}  # {level: count}
    parent_ids = {}  # {level: id}

    for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=False), start=2):
        title = row[0].value
        level = int(row[1].value) if row[1].value else 1

        if not title:
            continue

        # Initialize counter for this level if needed
        if level not in level_counters:
            level_counters[level] = 1
        else:
            level_counters[level] += 1

        # Reset deeper level counters
        levels_to_reset = [l for l in level_counters if l > level]
        for l in levels_to_reset:
            del level_counters[l]

        # Generate hierarchical code
        code_parts = []
        for l in range(1, level + 1):
            code_parts.append(str(level_counters.get(l, 1)))
        code = ".".join(code_parts)

        # Determine parent_id: reference the ID of the parent category (not code or title)
        parent_id = parent_ids.get(level - 1) if level > 1 else None

        # Generate ID (same as code for simplicity)
        id_val = code

        # Generate short_name: abbreviate title (max 50 chars)
        title_str = str(title).strip()
        short_name = title_str[:50]  # Use up to 50 chars from title
        # Optionally: create acronym from title words
        # Example: "User Management" → "UM"
        # words = title_str.split()
        # short_name = "".join(w[0].upper() for w in words if w)[:50]

        item = {
            "id": id_val,
            "code": code,
            "title": title_str,
            "short_name": short_name,  # Required field
            "level": level,
            "parent_id": parent_id,
        }
        data.append(item)

        # Track this level's ID for child categories
        parent_ids[level] = id_val

    return data
```

**Output example:**

```json
[
  {
    "id": "1",
    "code": "1",
    "title": "Functional Requirements",
    "short_name": "Functional Requirements",
    "level": 1,
    "parent_id": null
  },
  {
    "id": "1.1",
    "code": "1.1",
    "title": "User Management",
    "short_name": "User Management",
    "level": 2,
    "parent_id": "1"
  },
  {
    "id": "1.1.1",
    "code": "1.1.1",
    "title": "Authentication",
    "short_name": "Authentication",
    "level": 3,
    "parent_id": "1.1"
  },
  {
    "id": "1.2",
    "code": "1.2",
    "title": "Data Management",
    "short_name": "Data Management",
    "level": 2,
    "parent_id": "1"
  }
]
```

## Testing Your Script

Before running on the full file, test with a small sample:

```bash
# Test with first 5 items manually
python script.py sample_5_rows.xlsx test_output.json

# Check the output
cat test_output.json | head -n 50

# Validate structure
python validate_json.py test_output.json requirements

# Validate against categories (recommended)
python validate_json.py test_output.json requirements categories.json
```

The validator will output a summary table showing:

- Total requirements extracted
- Requirements per category
- Any validation errors or warnings

## Common Issues and Solutions

| Issue              | Symptom                           | Solution                                          |
| ------------------ | --------------------------------- | ------------------------------------------------- |
| Encoding errors    | "UnicodeDecodeError"              | Add `encoding='utf-8'` when opening files         |
| Merged cells       | Wrong values extracted            | Track merged ranges and use top-left cell value   |
| Empty rows         | "None" appearing in output        | Check `if cell.value` before processing           |
| Wrong data type    | "weight must be a number"         | Convert to float: `float(row[3])`                 |
| Category not found | Validation error on category_name | Ensure category exists or ask user about mapping  |
| Duplicate codes    | Validation fails                  | Check source data or add suffix logic (REQ001_v2) |
| Special characters | JSON encoding errors              | Use `ensure_ascii=False` in json.dump()           |

## Performance Tips

For large files:

```python
# Use pandas for better performance with large datasets
import pandas as pd

df = pd.read_excel(file_path, sheet_name='Requirements')

data = []
for _, row in df.iterrows():
    if pd.notna(row['code']):  # Skip NaN values
        item = {
            "code": str(row['code']).strip(),
            "title": str(row['title']).strip(),
            # ... map fields
        }
        data.append(item)
```

For very large files (>50MB), consider streaming or chunking the extraction.
