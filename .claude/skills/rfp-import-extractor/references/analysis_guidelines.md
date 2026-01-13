# File Analysis Guidelines

This document provides guidance on how to analyze Excel and Word files to extract RFP data.

## General Workflow

1. **Read and explore** the file structure
2. **Identify patterns** and data organization
3. **Discuss findings** with the user to confirm understanding
4. **Build a custom extraction script** tailored to this specific file structure
5. **Validate the extracted JSON** using `validate_json.py`
6. **Save the script** for future reuse

---

## Analyzing Excel Files

### Initial Exploration

When given an Excel file, perform these steps:

1. **List all sheets**

   ```python
   import openpyxl
   wb = openpyxl.load_workbook('file.xlsx')
   print(wb.sheetnames)
   ```

2. **Examine each sheet's structure**
   - Check the first few rows for headers
   - Identify which columns contain what data
   - Look for merged cells or special formatting
   - Note any empty rows or sections

3. **Look for patterns**
   - **Table format**: Data in columns with headers (most common)
   - **Hierarchical sections**: Groups separated by bold/colored headers
   - **Multiple tables**: Several tables in one sheet
   - **Pivot-style**: Suppliers in columns, requirements in rows (or vice versa)

### Common Excel Patterns

#### Pattern 1: Simple Table with Requirements

```
| Code   | Category | Title              | Description          | Weight |
|--------|----------|--------------------|---------------------|--------|
| REQ001 | Security | User Authentication| Must support SSO... | 0.9    |
| REQ002 | Security | Data Encryption    | All data must be... | 0.8    |
```

**Extraction approach**: Direct column mapping

#### Pattern 2: Hierarchical Sections

```
[Bold] Security Requirements
REQ001 | User Authentication | Must support SSO...
REQ002 | Data Encryption     | All data must be...

[Bold] Performance Requirements
REQ003 | Response Time       | < 2 seconds...
```

**Extraction approach**: Track current category from bold/styled rows

#### Pattern 3: Supplier Responses in Columns

```
| Code   | Requirement      | Supplier A | Supplier B | Supplier C |
|--------|------------------|------------|------------|------------|
| REQ001 | Authentication   | Yes, via SAML | OAuth 2.0 | SSO ready |
| REQ002 | Data Encryption  | AES-256    | TLS 1.3   | Full encryption |
```

**Extraction approach**: Iterate columns for each supplier

#### Pattern 4: Nested Categories in Columns

```
| Level 1 | Level 2    | Code   | Title       | Description |
|---------|------------|--------|-------------|-------------|
| Functional | Security | REQ001 | Auth        | ...         |
| Functional | Security | REQ002 | Encryption  | ...         |
| Functional | UI/UX    | REQ003 | Dashboard   | ...         |
```

**Extraction approach**: Build category hierarchy first, then extract requirements

### Excel Libraries

Recommended Python libraries:

- **openpyxl**: Best for .xlsx files, supports reading cell styles
- **pandas**: Great for table-like data, easy data manipulation
- **xlrd**: For older .xls files

---

## Analyzing Word Documents

### Initial Exploration

When given a Word document, perform these steps:

1. **Extract document structure**

   ```python
   from docx import Document
   doc = Document('file.docx')

   for para in doc.paragraphs[:20]:  # First 20 paragraphs
       print(f"Style: {para.style.name} | Text: {para.text[:50]}")
   ```

2. **Identify organizational elements**
   - Heading levels (Heading 1, 2, 3) for hierarchy
   - Tables for structured data
   - Numbered/bulleted lists
   - Text styles (bold, colors) for emphasis

3. **Map the structure**
   - Which heading levels represent categories?
   - Where are requirements defined?
   - Are requirements in tables or paragraphs?

### Common Word Patterns

#### Pattern 1: Headings as Categories, Tables as Requirements

```
# 1. Security Requirements (Heading 1)

| Code   | Requirement              | Description          |
|--------|--------------------------|---------------------|
| REQ001 | User Authentication      | Must support SSO... |
| REQ002 | Data Encryption          | All data must be... |

# 2. Performance Requirements (Heading 1)
...
```

**Extraction approach**:

- Track current category from Heading 1
- Extract requirements from tables under each heading

#### Pattern 2: Numbered Paragraphs

```
1. Security Requirements
   1.1 User Authentication - Must support SSO...
   1.2 Data Encryption - All data must be...
2. Performance Requirements
   2.1 Response Time - Must be < 2 seconds...
```

**Extraction approach**:

- Parse numbered items
- Extract category from top-level numbers
- Extract requirements from sub-numbers

#### Pattern 3: Mixed Tables and Text

```
1. Security

The system must meet the following security requirements:

REQ001: User Authentication
Must support SSO with SAML 2.0...

REQ002: Data Encryption
All sensitive data...
```

**Extraction approach**:

- Use regex to find requirement codes (REQ\d+)
- Extract text following each code
- Track category from headings

#### Pattern 4: Complex Tables with Supplier Responses

```
| Requirement | Description | Supplier A Response | Supplier B Response |
|-------------|-------------|---------------------|---------------------|
| REQ001      | Auth        | SAML 2.0 supported  | OAuth available     |
```

**Extraction approach**: Similar to Excel Pattern 3

### Word Libraries

Recommended Python libraries:

- **python-docx**: Best for .docx files, supports paragraphs, tables, and styles
- **mammoth**: Converts to HTML, good for complex formatting
- **docx2txt**: Simple text extraction (no formatting)

---

## Building the Extraction Script

### Script Structure Template

```python
#!/usr/bin/env python3
"""
Custom extraction script for [FILE_NAME]

Purpose: Extract [categories/requirements/responses] from [describe file]
Created: [DATE]
"""

import json
# Import relevant libraries (openpyxl, python-docx, pandas, etc.)

def extract_categories(file_path):
    """Extract categories from the file"""
    categories = []

    # Your extraction logic here

    return categories

def extract_requirements(file_path):
    """Extract requirements from the file"""
    requirements = []

    # Your extraction logic here

    return requirements

def extract_responses(file_path, supplier_name):
    """Extract supplier responses from the file"""
    responses = []

    # Your extraction logic here

    return responses

def main():
    file_path = "path/to/file"

    # Extract data
    # categories = extract_categories(file_path)
    # requirements = extract_requirements(file_path)
    # responses = extract_responses(file_path, "Supplier A")

    # Save to JSON
    # with open('output.json', 'w', encoding='utf-8') as f:
    #     json.dump(requirements, f, indent=2, ensure_ascii=False)

    print("Extraction complete!")

if __name__ == "__main__":
    main()
```

### Extraction Best Practices

1. **Handle encoding properly**: Use `encoding='utf-8'` when reading/writing files
2. **Validate as you extract**: Check for required fields immediately
3. **Log skipped items**: Print warnings for rows/items that couldn't be parsed
4. **Make it reusable**: Use functions with parameters, not hardcoded values
5. **Add comments**: Explain non-obvious logic
6. **Test incrementally**: Run on a small subset first

### Common Challenges

**Empty cells/fields**:

- Use `.strip()` to remove whitespace
- Check if cell is `None` before processing
- Provide default values for optional fields

**Merged cells in Excel**:

- Merged cells only have value in the top-left cell
- Other cells in the merge return `None`
- Track the "current" value for merged category headers

**Inconsistent formatting**:

- Use regex for flexible pattern matching
- Strip extra spaces, normalize case
- Handle variations (e.g., "REQ-001" vs "REQ001")

**Missing data**:

- Decide whether to skip or use defaults
- Log missing items for user review
- Validate critical fields are present

---

## Saving Extraction Scripts

### Recommended Location

Save extraction scripts in the project for reuse:

```
scripts/
  extractions/
    extract_rfp_vendor_x_2024.py
    extract_cahier_charges_project_y.py
    extract_supplier_responses_vendor_z.py
```

### Naming Convention

Use descriptive names that indicate:

- What is being extracted (rfp, requirements, responses)
- Source/context (vendor name, project, date)
- File type (excel, word)

Examples:

- `extract_requirements_acme_rfp_2024.py`
- `extract_responses_techcorp_excel.py`
- `extract_categories_word_cahier.py`

### Documentation in Script

Include at the top of each script:

```python
"""
Extraction script for [Project/Source Name]

File: [original_filename.xlsx]
Purpose: Extract [what] from [where]
Structure: [brief description of file structure]
Created: [DATE]
Last used: [DATE]

Usage:
    python extract_rfp_vendor_x.py input.xlsx output.json
"""
```

This makes it easy to reuse the script months later!
