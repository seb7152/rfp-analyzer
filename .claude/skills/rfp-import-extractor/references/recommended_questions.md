# Recommended Questions for User Dialogue

This document provides recommended questions to ask users during the file analysis and extraction process.

## Purpose of Questions

Questions serve to:
1. **Confirm understanding** of the file structure
2. **Clarify ambiguities** in data organization
3. **Get user preferences** on optional fields and mapping
4. **Validate assumptions** before building the extraction script

---

## Phase 1: Initial File Analysis

### Questions About File Structure

**For Excel files:**

1. "I see the following sheets in your Excel file: [list sheets]. Which sheet(s) contain the data you want to extract?"

2. "Looking at sheet '[name]', I see these columns: [list columns]. Can you confirm which columns map to which fields?"
   - Example: "Is column B the requirement title and column C the description?"

3. "I notice [pattern observation]. Is this correct?"
   - Example: "I notice rows 1-3 are headers and data starts at row 4. Is this correct?"
   - Example: "I see some cells are merged for category headers. Should I use these as categories?"

4. "Are there any rows or columns I should skip or ignore?"

**For Word files:**

1. "I see the document uses [Heading 1/Heading 2/etc.] for organization. Do these represent categories or sections?"

2. "I found [X] tables in the document. Do all tables contain requirements, or should I focus on specific ones?"

3. "I notice requirements are formatted as [describe pattern]. Is this consistent throughout the document?"
   - Example: "Requirements seem to follow the pattern 'REQ-XXX: [Title] - [Description]'"

4. "Should I extract text from paragraphs, tables, or both?"

---

## Phase 2: Data Type Identification

### Questions About What to Extract

1. "What type of data does this file contain?"
   - Categories (structure/hierarchy)?
   - Requirements (exigences)?
   - Supplier responses?
   - A combination?

2. "If this file contains supplier responses, how many suppliers are represented?"
   - Are they in separate columns?
   - Separate sheets?
   - Separate files?

3. "For supplier responses: Which supplier should I extract? Or should I extract all of them?"

---

## Phase 3: Field Mapping

### Questions About Required Fields

**For Categories:**

1. "I need to extract: code, title, and level. Can you confirm where each of these is?"
   - "What should I use as the category code?" (column, pattern, etc.)
   - "What determines the hierarchy level?" (heading level, numbering, column, etc.)

2. "Do categories have parent-child relationships? If so, how can I identify them?"

3. "Should I generate category codes automatically, or are they in the file?"

**For Requirements:**

1. "I need to extract: code, title, description, weight, and category. Can you point me to each?"

2. "How should I determine the requirement weight/importance?"
   - Is there a weight column?
   - Should I use a default value (e.g., 0.5 or 1.0)?
   - Is it based on some other field?

3. "How do I know which category each requirement belongs to?"
   - Is there a category column?
   - Should I infer from section headings?
   - Use a default category?

4. "Are there any requirements marked as mandatory or optional? If so, how?"

**For Supplier Responses:**

1. "I see response text in [location]. Is this correct?"

2. "Are there existing scores (AI or manual) in the file? If so, where?"

3. "Should I import the 'status' field? If so, where is it or what should I default to?"

---

## Phase 4: Optional Fields

### Questions About Optional Data

1. "Would you like me to import optional fields such as:"
   - **Categories**: `short_name`, `order`
   - **Requirements**: `is_mandatory`, `is_optional`, `page_number`
   - **Responses**: `question`, `ai_comment`, `manual_comment`, `is_checked`

2. "If page numbers are available, should I extract them?"

3. "Should I set default values for fields that are missing?"
   - Example: "If weight is not specified, should I use 0.5 as default?"

---

## Phase 5: Category Mapping

### Questions About Linking to Existing Data

1. "Should I check if categories already exist in your RFP project?"
   - If yes: "Should I map to existing categories or create new ones?"
   - "How should I match category names?" (exact match, code match, flexible?)

2. "If a category doesn't exist yet, should I:"
   - Create it automatically?
   - Skip requirements in that category?
   - Use a default category?

3. "For requirements: Should I use category codes or category titles in `category_name`?"
   - Note: The system accepts both, but user preference may vary

---

## Phase 6: Validation & Confirmation

### Questions Before Building the Script

1. "Before I build the extraction script, let me confirm my understanding:"
   - [Summarize file structure]
   - [Summarize field mappings]
   - [Summarize any assumptions]
   - "Is this correct?"

2. "I'll be extracting [X] items. Does that sound right based on your file?"

3. "Where would you like me to save the output JSON file(s)?"

4. "Should I save this extraction script for future reuse? If so, what should I name it?"
   - Suggest a name: `extract_[description]_[date].py`

---

## Phase 7: Post-Extraction

### Questions After Extraction

1. "I've extracted [X] items. Would you like me to:"
   - Show you a preview of the JSON?
   - Validate it using `validate_json.py`?
   - Import it immediately?

2. "Would you like me to save this extraction script in `scripts/extractions/` for reuse?"

3. "Do you need to extract data from similar files? If so, I can adapt this script for them."

---

## Question Strategies

### Do's

✅ **Ask open-ended questions** to understand context:
   - "How is this file organized?"
   - "What's the best way to identify categories?"

✅ **Confirm observations** before assuming:
   - "I notice... Is this correct?"
   - "It looks like... Can you confirm?"

✅ **Offer options** when there are multiple valid approaches:
   - "Should I use option A or option B?"
   - "Would you prefer X or Y?"

✅ **Summarize understanding** periodically:
   - "Let me make sure I understand..."
   - "So, to summarize..."

### Don'ts

❌ **Don't assume** without asking:
   - Bad: "I'll use column A as the code."
   - Good: "Should I use column A as the code, or is it in a different column?"

❌ **Don't ask too many questions at once**:
   - Break questions into logical phases
   - Wait for answers before moving forward

❌ **Don't use technical jargon** without explanation:
   - Bad: "Should I normalize the schema using BCNF?"
   - Good: "Should I restructure the data to avoid duplicates?"

❌ **Don't make the user do the work**:
   - Bad: "Can you write a regex to extract codes?"
   - Good: "I'll write a regex to extract codes. Can you confirm this pattern: REQ-XXX?"

---

## Example Dialogue Flow

**User**: "I have an Excel file with requirements I need to import."

**Agent**: "Great! Let me analyze the file structure first."

[Reads file]

**Agent**: "I see your Excel file has 2 sheets: 'Requirements' and 'Suppliers'. The 'Requirements' sheet has these columns: Code, Category, Title, Description, Weight. Is this the sheet you want to import?"

**User**: "Yes, the Requirements sheet."

**Agent**: "Perfect. I can see the following:
- Column A: Requirement codes (REQ001, REQ002, ...)
- Column B: Category names
- Column C: Requirement titles
- Column D: Descriptions
- Column E: Weights (0.0 to 1.0)

Can you confirm this is correct?"

**User**: "Yes, that's right."

**Agent**: "Great! A few questions:
1. Should I import the categories as-is from column B, or should I map them to existing categories in your project?
2. Are there any optional fields you'd like me to extract (like page numbers or mandatory flags)?
3. What should I name the output JSON file?"

[User provides answers]

**Agent**: "Perfect! Let me build the extraction script now..."

[Builds and runs script]

**Agent**: "I've extracted 47 requirements and saved them to requirements.json. Would you like me to validate the JSON before importing?"

**User**: "Yes, please validate."

[Runs validation]

**Agent**: "✅ Validation successful! The JSON is valid. Should I save this extraction script as `extract_requirements_project_2024.py` for future reuse?"

This flow demonstrates:
- Progressive disclosure (one phase at a time)
- Confirmation at each step
- Clear, non-technical communication
- Offering next steps proactively
