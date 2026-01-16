---
name: prd-to-json-implementation
description: Transform PRD specifications into structured PRD.json files with reference documents, or implement existing PRD.json user stories. Use when user asks to convert PRD to PRD.json with decomposition into user stories and tasks, or implement one or multiple user stories from an existing PRD.json. Handles creating PRD.json with reference_document metadata, implementing tasks sequentially with status updates, running tests including TypeScript, stashing after each completed US, and making a single final commit.
---

# PRD to JSON Implementation

## Overview

Transform product requirement documents (PRDs) or specifications into structured PRD.json files and systematically implement all user stories. This skill manages the complete workflow from requirement decomposition to final implementation with automated testing and git management.

## When to Use This Skill

This skill supports two primary workflows:

### Workflow 1: Create PRD.json from PRD/Spec

Trigger when user asks to:

- "Transform PRD to PRD.json" or "create PRD.json from spec"
- "Create a prd.json from this document"
- "Decompose this PRD into user stories"
- User provides a PRD/spec and wants it structured

**Outcome:** Creates `specs/[feature-id]/prd.json` with:

- User stories decomposed into tasks
- Reference documents listed in `reference_document` field
- All tasks have prompts, objectives, and status fields

### Workflow 2: Implement User Stories from Existing PRD.json

Trigger when user asks to:

- "Implement PRD" or "implement the PRD.json"
- "Implement US-1 and US-2" or "implement user story X"
- "Continue implementation" or "complete the remaining tasks"
- User provides a path to an existing PRD.json

**Outcome:** Implements tasks sequentially, updates statuses, runs tests, stashes after each US, creates final commit

**IMPORTANT:**

- Always start by reading the PRD.json file
- Always load all reference documents into context before implementing
- Keep reference documents in context throughout implementation

## PRD.json Structure

The PRD.json file follows this schema:

```json
{
  "feature": "feature-id",
  "title": "Feature Title",
  "description": "Brief description",
  "reference_document": {
    "specs": ["path/to/spec.md", "path/to/another-spec.pdf"],
    "architecture": ["path/to/architecture.md"],
    "tests": ["path/to/test-plan.md"],
    "interface": ["path/to/designs/", "path/to/mocks/"],
    "api": ["path/to/api-docs.md"],
    "database": ["path/to/schema.sql"],
    "notes": "Additional context or notes"
  },
  "user_stories": [
    {
      "id": "US-N",
      "title": "User Story Title",
      "priority": "P1|P2|P3",
      "completed": false,
      "description": "User story description",
      "tasks": [
        {
          "id": "US-N-XXX",
          "description": "Task description",
          "prompt": "Detailed prompt for implementation",
          "objective": "Clear objective/outcome",
          "completed": false,
          "comments": "Optional notes or issues",
          "test_command": "Test command to run (e.g., 'npm test')"
        }
      ]
    }
  ]
}
```

## Workflow

### Phase 1: Create PRD.json

1. **Read the source PRD/spec** (if provided)
   - Extract feature name, title, description
   - Identify all user stories and requirements
   - Capture priority levels (P1, P2, P3)
   - Identify all reference documents (specs, architecture, tests, interface, api, database)

2. **Load reference documents into context**
   - BEFORE creating PRD.json, read all reference documents listed in the source
   - Use these documents to inform the task decomposition and implementation
   - Include all reference file paths in the `reference_document` field

3. **Structure into PRD.json**

4. **Structure into PRD.json**
   - Generate US-1, US-2, ... sequentially
   - Decompose each US into tasks (US-1-001, US-1-002, ...)
   - For each task:
     - `description`: What needs to be done
     - `prompt`: Specific implementation instructions
     - `objective`: Expected outcome
     - `completed`: false (initially)
     - `test_command`: How to verify the task (optional but recommended)

5. **Save PRD.json** in `specs/[feature-id]/prd.json`

### Phase 2: Systematic Implementation

**IMPORTANT:** Process user stories and tasks SEQUENTIALLY. Do not skip ahead.

**BEFORE starting implementation:**

1. Read the PRD.json file
2. Check the `reference_document` field
3. Load ALL reference documents into context (specs, architecture, tests, interface, api, database)
4. Keep these documents in context throughout implementation

For each user story (in order):

- For each task (in order):
  1. Read the task's `prompt` field
  2. Consult reference documents for context and patterns
  3. Implement according to the prompt
  4. Run tests (if `test_command` provided)
  5. Update task's `completed` to true in PRD.json
  6. Add `comments` if issues found or notes needed
  7. Save PRD.json after each task completion

After completing ALL tasks in a user story:

1. Verify the user story is fully functional
2. Run test suite for the feature (if applicable)
3. Update user story's `completed` to true
4. **Stash changes**: `git stash save "Complete US-[N]"`
5. Save PRD.json

### Phase 3: Final Commit

After ALL user stories are completed:

1. Unstash all changes: `git stash list` → `git stash pop` for each stash (in order)
2. Run complete test suite: `npm test && npm run lint` (or appropriate commands)
3. Verify TypeScript compiles: `npm run typecheck` (if TypeScript project)
4. Create single commit with message: `"feat([feature-id]): Implement [feature title] - All US completed"`
5. Report completion summary

## Testing Strategy

**Before each commit** (before final commit only, after unstacking):

- Run project's test command (check package.json or ask user)
- Run lint command if available
- Run TypeScript typecheck if TypeScript project
- If tests fail:
  - Fix issues
  - Update task's `comments` with resolution notes
  - Re-run tests until all pass

## Git Management

**Stash Strategy:**

- Stash after EACH completed user story (not after each task)
- Use descriptive stash messages: `"Complete US-1: [US title]"`
- This creates atomic units that can be unstacked sequentially

**Final Commit:**

- Unstack all stashes in order (oldest first)
- Run full test suite before committing
- Create ONE commit with all changes

## Example Prompt in Task

A task prompt should be specific and actionable:

```json
{
  "id": "US-1-001",
  "description": "Create the user authentication API endpoint",
  "prompt": "Create POST /api/auth/login endpoint in src/app/api/auth/login/route.ts. Accept email and password in request body. Validate email format and password minimum 8 characters. Return JWT token on success, 401 on invalid credentials. Use the project's existing authentication utilities.",
  "objective": "Functional login endpoint that returns valid JWT",
  "completed": false,
  "test_command": "npm test -- auth/login.test.ts"
}
```

## Error Handling

If a task fails or cannot be implemented:

1. Add detailed `comments` to the task explaining the issue
2. Set `completed` to false
3. Move to next task (if non-blocking) OR stop entire implementation (if blocking)
4. Ask user for guidance on blocking issues

## Verification Checklist

Before marking a user story complete:

- [ ] All tasks in US completed (`completed: true`)
- [ ] All tests pass (if tests exist)
- [ ] Code follows project conventions
- [ ] No TypeScript errors (if applicable)
- [ ] Changes stashed
- [ ] PRD.json saved

## Critical: Always Use Reference Documents

**Before any implementation, ALWAYS:**

1. Read the PRD.json file
2. Extract all paths from `reference_document` field
3. Load ALL reference documents into context using the Read tool
4. Keep these documents accessible throughout implementation

**Why this matters:**

- Reference documents contain architecture decisions, API specs, database schemas, UI designs
- Implementation without context leads to inconsistencies and rework
- Reference documents provide patterns and best practices used in the project

**Example loading:**

```bash
# Read PRD.json first
read specs/003-financial-grid/prd.json

# Then load all references
read docs/architecture/financial-grid.md
read supabase/migrations/023_create_financial_template_lines.sql
read docs/api/financial-grid.md
```

## Resources

### scripts/

- **`validate_prd_json.py`** - Validate PRD.json structure
- **`update_status.py`** - Helper to update task status

### references/

- **`prd_structure.md`** - Detailed PRD.json schema with examples
- **`workflow_patterns.md`** - Common implementation patterns

### assets/

- **`prd_template.json`** - Empty PRD.json template
