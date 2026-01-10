---
name: rfp-import-extractor
description: Extract RFP data (categories, requirements, supplier responses) from Excel or Word files and generate validated JSON for import. Use this skill when users need to analyze and extract structured data from documents, create custom extraction scripts, or import RFP data. Triggers include requests like "extract requirements from this Excel file", "analyze this Word document and generate JSON", "import supplier responses from this file", or "convert this RFP document to JSON format".
---

# RFP Import Extractor

Extract structured data from Excel and Word documents to generate validated JSON files for importing into the RFP Analyzer system.

## Overview

This skill guides the process of extracting RFP data from external files and converting it to the JSON format required by the RFP Analyzer. It supports three types of data:

1. **Categories** - Hierarchical structure (domains, sub-domains)
2. **Requirements** - RFP requirements/exigences with details
3. **Supplier Responses** - Vendor responses with scores and evaluations

The skill emphasizes **building custom extraction scripts** tailored to each file's unique structure, then saving those scripts for future reuse.

## Core Workflow

Follow this workflow for every file extraction request:

```
1. Analyze File Structure
   ↓
2. Discuss with User
   ↓
3. Build Custom Extraction Script
   ↓
4. Extract and Validate JSON
   ↓
5. Save Script for Reuse
```

---

## Step 1: Analyze File Structure

Begin by thoroughly analyzing the file structure to understand how data is organized.

### For Excel Files

Use Python libraries like `openpyxl` or `pandas` to explore:

```python
import openpyxl

# Load workbook
wb = openpyxl.load_workbook('file.xlsx')

# List all sheets
print("Sheets:", wb.sheetnames)

# Examine first sheet
ws = wb.active

# Show first 10 rows with column letters
for row in ws.iter_rows(min_row=1, max_row=10, values_only=False):
    print([f"{cell.column_letter}: {cell.value}" for cell in row])

# Check for merged cells
print("Merged cells:", ws.merged_cells.ranges)
```

**Look for:**

- Which sheets contain relevant data
- Column headers and their meanings
- Starting row for data (after headers)
- Merged cells that might indicate groupings
- Empty rows or sections
- Data patterns (tables, hierarchies, pivot-style)

### For Word Files

Use `python-docx` to explore document structure:

```python
from docx import Document

doc = Document('file.docx')

# Show paragraph styles and text
for i, para in enumerate(doc.paragraphs[:20]):
    print(f"{i}: [{para.style.name}] {para.text[:60]}")

# Show tables
print(f"\nFound {len(doc.tables)} tables")
for i, table in enumerate(doc.tables):
    print(f"Table {i}: {len(table.rows)} rows × {len(table.columns)} columns")
    # Show first row (usually headers)
    if table.rows:
        print("  Headers:", [cell.text for cell in table.rows[0].cells])
```

**Look for:**

- Heading levels (Heading 1, 2, 3) used for categories
- Tables containing structured data
- Numbered or bulleted lists
- Text patterns (e.g., "REQ-001: Title - Description")
- How categories and requirements are distinguished

### Common Patterns

Refer to `references/analysis_guidelines.md` for detailed examples of common file patterns, including:

- Simple tables with columns
- Hierarchical sections with headers
- Supplier responses in columns
- Nested categories
- Mixed table and text formats

**IMPORTANT**: Always explore the file FIRST before asking questions. Show the user what you found to demonstrate understanding.

---

## Step 2: Discuss with User

After analyzing the file, engage in a dialogue with the user to confirm understanding and clarify details.

### Confirm Your Understanding

Start by summarizing what you found:

> "I've analyzed your [Excel/Word] file. Here's what I found:
>
> - [Sheet/Section names]
> - [Column/field structure]
> - [Number of items detected]
> - [Data patterns observed]
>
> Can you confirm this is correct?"

### Ask About Category Code Scheme

When extracting categories, **always ask about the code scheme** (unless codes already exist in the file):

> "For the category codes, I recommend using hierarchical numbering (1, 1.1, 1.1.1) based on the hierarchy. This makes parent-child relationships very clear. Should I use this approach, or do you have a different naming scheme in mind?"

**Benefits to mention:**
- Hierarchical codes make parent-child relationships obvious
- Natural reading order (1, 1.1, 1.1.1)
- Scales to any depth
- Intuitive for users

See `references/json_schemas.md` for **Recommended Code Scheme** details.

### Ask Targeted Questions

Refer to `references/recommended_questions.md` for comprehensive question lists. Key questions include:

**Phase 1 - Structure Confirmation:**

1. "Which sheet/section contains the data you want to extract?"
2. "Can you confirm the column/field mappings I identified?"
3. "Should I skip any rows, columns, or sections?"

**Phase 2 - Data Type:**

1. "What type of data should I extract: categories, requirements, supplier responses, or a combination?"
2. "If this contains supplier responses, which supplier(s) should I extract?"

**Phase 3 - Field Mapping:**

1. "How should I determine [required field] from the file?"
2. "For fields not in the file (like weight), should I use default values?"
3. "How do I identify which category each requirement belongs to?"

**Phase 4 - Optional Fields:**

1. "Would you like me to import optional fields such as:"
   - **Requirements**: `tags`, `is_mandatory`, `is_optional`, `page_number`
   - **Categories**: `short_name`, `order`
   - **Responses**: `question`, `ai_comment`, `manual_comment`, `is_checked`
2. "If tags are available in the file, should I extract them? How are they formatted (comma-separated, pipe-separated, etc.)?"
3. "Should I set default values for missing fields?"

**Phase 5 - Category Mapping:**

1. "Should I map to existing categories or create new ones?"
2. "Should I use category codes or titles in the output JSON?"

**Phase 6 - Validation:**

1. "Before I build the script, let me confirm my understanding: [summarize]. Is this correct?"
2. "Where should I save the output JSON file?"
3. "What should I name the extraction script for future reuse?"

**Best Practices:**

- Ask questions in phases, not all at once
- Wait for answers before proceeding
- Use the user's terminology, not jargon
- Offer options when multiple approaches are valid
- Confirm assumptions rather than making them

---

## Step 3: Build Custom Extraction Script

Create a Python script tailored to the specific file structure. Each file is unique, so avoid generic solutions.

For complete guidance on building extraction scripts, including:

- Script templates and structure
- Field mapping for each data type
- Common extraction patterns (direct mapping, hierarchical, multi-supplier, etc.)
- Handling edge cases (merged cells, empty rows, special characters)
- Logging, testing, and debugging strategies
- Performance tips for large files

See **`references/script-building-guide.md`** for comprehensive details.

---

## Step 4: Extract and Validate JSON

Run the extraction script and validate the output.

### Execute Extraction

```bash
# Run the custom script
python extract_requirements_acme_2024.py input.xlsx requirements.json

# Check output
cat requirements.json | head -n 20
```

### Validate JSON

Use the validation script to ensure the JSON matches the expected schema:

```bash
# Validate categories
python scripts/validate_json.py categories.json categories

# Validate requirements
python scripts/validate_json.py requirements.json requirements

# Validate requirements against categories (recommended)
python scripts/validate_json.py requirements.json requirements categories.json

# Validate supplier responses
python scripts/validate_json.py responses.json responses
```

The validator checks:

- ✅ Valid JSON syntax
- ✅ Required fields present
- ✅ Field types correct (strings, numbers, booleans)
- ✅ Value constraints (weights 0-1, scores 0-5, etc.)
- ✅ Unique codes
- ✅ Valid enum values (status, etc.)
- ✅ **STRICT mode**: Rejects unknown fields (e.g., "lot", "notes", etc.)
- ✅ **Category validation**: Verifies category_name matches existing categories (when categories.json provided)

**For requirements import, always provide categories.json to validate category references!**

**If validation fails:**

1. Review error messages
2. Fix the extraction script logic
3. Re-run extraction
4. Validate again

**Preview the Data:**

Show the user a preview of the extracted data:

```python
# Show first few items
import json
with open('output.json') as f:
    data = json.load(f)

print(f"Extracted {len(data)} items. First 3:")
for item in data[:3]:
    print(json.dumps(item, indent=2))
```

Ask: "Does this look correct? Should I proceed with the full extraction?"

---

## Step 5: Save Script for Reuse

After successful extraction, save the script for future use.

### Recommended Location

```
scripts/
  extractions/
    extract_requirements_acme_rfp_2024.py
    extract_responses_techcorp_excel_jan.py
    extract_categories_project_y_word.py
```

If the directory doesn't exist, create it:

```bash
mkdir -p scripts/extractions
```

### Naming Convention

Use descriptive names:

- `extract_[data_type]_[source]_[date].py`

Examples:

- `extract_requirements_acme_rfp_2024.py`
- `extract_responses_vendor_x_excel.py`
- `extract_categories_cahier_word.py`

### Documentation

Ensure the script header includes:

```python
"""
Extraction script for [Project/Source Name]

Original file: original_filename.xlsx
Purpose: Extract requirements from Acme Corp RFP 2024
File structure: Excel with 3 sheets, 'Requirements' sheet has
                columns: Code, Title, Description, Weight, Category
Created: 2024-01-10
Last used: 2024-01-10

Usage:
    python extract_requirements_acme_rfp_2024.py input.xlsx output.json

Notes:
    - Data starts at row 2 (row 1 is headers)
    - Weight is in percentage format, needs division by 100
    - Category column uses full category names, not codes
"""
```

### Inform the User

> "I've saved the extraction script as `scripts/extractions/extract_[name].py`.
> You can reuse this script for similar files in the future by running:
>
> `python scripts/extractions/extract_[name].py input_file.xlsx output.json`"

---

## JSON Schema Reference

For complete schema details, see `references/json_schemas.md`.

### Quick Reference

**Categories:**

- Required: `id`, `code`, `title`, `level`
- Optional: `short_name`, `parent_id`, `order`

**Requirements:**

- Required: `code`, `title`, `description`, `weight`, `category_name`
- Optional: `tags`, `is_mandatory`, `is_optional`, `page_number`, `rf_document_id`

**Supplier Responses:**

- Required: `requirement_id_external`
- Optional: `response_text`, `ai_score`, `ai_comment`, `manual_score`, `manual_comment`, `question`, `status`, `is_checked`

---

## Resources

### Scripts

- **validate_json.py** - Validates extracted JSON against expected schemas for categories, requirements, and responses
- **extractions/extract_requirements_simple_excel.py** - Reusable template for extracting requirements from Excel files with simple table structure (columns with headers)
- **extractions/extract_responses_supplier_columns.py** - Reusable template for extracting supplier responses from Excel files where responses are organized as columns (one per supplier)

### References

- **script-building-guide.md** - Comprehensive guide for building custom extraction scripts, including templates, patterns, edge cases, and debugging tips
- **json_schemas.md** - Complete JSON schema definitions with examples and validation rules
- **analysis_guidelines.md** - Detailed guide on analyzing Excel and Word files, common patterns, and extraction best practices
- **recommended_questions.md** - Comprehensive list of questions to ask users during the extraction process

---

## Common Scenarios

### Scenario 1: Extract Requirements from Excel

**User Request:** "Extract requirements from this Excel file"

**Process:**

1. Load and explore the Excel file
2. Identify sheet with requirements and column structure
3. Confirm with user: "I see columns A-E containing Code, Title, Description, Weight, Category. Is this correct?"
4. Ask about optional fields and category mapping
5. Build extraction script
6. Run and validate
7. Save script as `extract_requirements_[source].py`

### Scenario 2: Extract Supplier Responses from Excel

**User Request:** "Import supplier responses from this file"

**Process:**

1. Analyze file structure (multiple suppliers in columns? separate sheets?)
2. Confirm: "I see 3 suppliers (columns D, E, F) with responses. Should I extract all of them?"
3. Ask: "Are there scores in the file, or should I only import response text?"
4. Build extraction script (iterate columns for each supplier)
5. Generate separate JSON for each supplier or combined
6. Validate all outputs
7. Save script

### Scenario 3: Extract Categories from Word

**User Request:** "Analyze this Word document and extract the category structure"

**Process:**

1. Explore document structure (headings, tables, numbering)
2. Confirm: "I see Heading 1 for top-level categories and Heading 2 for sub-categories. Is this the structure?"
3. Ask: "Should I use the heading numbers as codes (e.g., '1.1', '1.2')?"
4. Build extraction script using heading levels
5. Run and validate
6. Save script

---

## Best Practices

1. **Always analyze BEFORE asking** - Show the user you understand the file
2. **Build custom scripts** - Don't try to create a one-size-fits-all extractor
3. **Validate early and often** - Run validation after extraction
4. **Document thoroughly** - Future you (or the user) will thank you
5. **Save scripts** - Every extraction script is reusable
6. **Confirm assumptions** - Ask rather than assume
7. **Test incrementally** - Extract 5 items first, then scale up

---

## Troubleshooting

**Problem:** "Validation fails with missing required fields"

- Check if the extraction script is mapping fields correctly
- Verify the source data actually contains those fields
- Add default values for optional fields

**Problem:** "Duplicate code errors"

- Ensure requirement/category codes are unique in the source
- Add logic to append suffixes if needed (e.g., REQ001_2)

**Problem:** "Category not found errors"

- Confirm category names match existing categories in the RFP
- Ask user if they want to create new categories
- Use category codes instead of titles for more reliable matching

**Problem:** "Encoding errors with special characters"

- Always use `encoding='utf-8'` when reading/writing files
- Use `ensure_ascii=False` when writing JSON

**Problem:** "Script works on sample but fails on full file"

- Check for edge cases: empty cells, merged cells, unexpected formats
- Add defensive checks (`if cell is not None`, `.strip()`, etc.)
- Log skipped rows for review
