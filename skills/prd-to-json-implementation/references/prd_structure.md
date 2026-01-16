# PRD.json Structure Reference

## Complete Schema

```json
{
  "feature": "feature-id",
  "title": "Feature Title",
  "description": "Brief description of feature",
  "reference_document": {
    "specs": ["path/to/spec.md", "path/to/requirements.pdf"],
    "architecture": ["path/to/architecture.md", "path/to/workflow-diagram.png"],
    "tests": ["path/to/test-plan.md", "path/to/test-cases.xlsx"],
    "interface": ["path/to/designs/", "path/to/figma-link", "path/to/mocks/"],
    "api": ["path/to/api-docs.md", "path/to/openapi.yaml"],
    "database": ["path/to/schema.sql", "path/to/erd-diagram.png"],
    "notes": "Additional context, constraints, or important notes"
  },
  "user_stories": [
    {
      "id": "US-N",
      "title": "User Story Title",
      "priority": "P1|P2|P3",
      "completed": false,
      "description": "Detailed user story description",
      "tasks": [
        {
          "id": "US-N-XXX",
          "description": "Task description",
          "prompt": "Implementation instructions",
          "objective": "Expected outcome",
          "completed": false,
          "comments": "Optional notes",
          "test_command": "Test command (optional)"
        }
      ]
    }
  ]
}
```

## Field Descriptions

### Root Level

| Field                | Type   | Required | Description                                     |
| -------------------- | ------ | -------- | ----------------------------------------------- |
| `feature`            | string | Yes      | Feature identifier (e.g., "003-financial-grid") |
| `title`              | string | Yes      | Human-readable feature title                    |
| `description`        | string | Yes      | Brief feature description (1-2 sentences)       |
| `reference_document` | object | No       | Reference documents and context (see below)     |
| `user_stories`       | array  | Yes      | Array of user story objects                     |

### Reference Document Object

| Field          | Type             | Required | Description                                                 |
| -------------- | ---------------- | -------- | ----------------------------------------------------------- |
| `specs`        | array of strings | No       | Paths to specification documents (.md, .pdf, etc.)          |
| `architecture` | array of strings | No       | Paths to architecture docs, diagrams, workflow descriptions |
| `tests`        | array of strings | No       | Paths to test plans, test cases, coverage documents         |
| `interface`    | array of strings | No       | Paths to UI designs, mocks, Figma links, wireframes         |
| `api`          | array of strings | No       | Paths to API documentation, OpenAPI specs, endpoint docs    |
| `database`     | array of strings | No       | Paths to database schemas, ERD diagrams, migration files    |
| `notes`        | string           | No       | Additional context, constraints, or important notes         |

### User Story Object

| Field         | Type    | Required | Description                                      |
| ------------- | ------- | -------- | ------------------------------------------------ |
| `id`          | string  | Yes      | User story ID (e.g., "US-1")                     |
| `title`       | string  | Yes      | User story title                                 |
| `priority`    | string  | Yes      | Priority: "P1" (high), "P2" (medium), "P3" (low) |
| `completed`   | boolean | Yes      | Whether US is fully implemented                  |
| `description` | string  | Yes      | Detailed user story description                  |
| `tasks`       | array   | Yes      | Array of task objects                            |

### Task Object

| Field          | Type    | Required | Description                                               |
| -------------- | ------- | -------- | --------------------------------------------------------- |
| `id`           | string  | Yes      | Task ID (e.g., "US-1-001")                                |
| `description`  | string  | Yes      | Brief task description                                    |
| `prompt`       | string  | Yes      | Detailed implementation instructions                      |
| `objective`    | string  | No       | Clear objective/outcome (recommended)                     |
| `completed`    | boolean | Yes      | Whether task is implemented                               |
| `comments`     | string  | No       | Notes, issues, or obstacles                               |
| `test_command` | string  | No       | Command to verify task (e.g., "npm test -- auth.test.ts") |

## Example PRD.json

```json
{
  "feature": "user-authentication",
  "title": "User Authentication",
  "description": "Secure login and registration with JWT tokens",
  "user_stories": [
    {
      "id": "US-1",
      "title": "User Login",
      "priority": "P1",
      "completed": false,
      "description": "Users can log in with email and password",
      "tasks": [
        {
          "id": "US-1-001",
          "description": "Create login API endpoint",
          "prompt": "Create POST /api/auth/login in src/app/api/auth/login/route.ts. Accept email and password. Validate email format and password length >= 8. Return JWT token on success, 401 on invalid credentials.",
          "objective": "Functional login endpoint returning valid JWT",
          "completed": false,
          "test_command": "npm test -- login.test.ts"
        },
        {
          "id": "US-1-002",
          "description": "Create login UI component",
          "prompt": "Create LoginForm component in src/components/auth/LoginForm.tsx. Include email and password inputs with validation. On submit, call /api/auth/login. Store JWT in localStorage on success. Show error message on failure.",
          "objective": "Functional login form with error handling",
          "completed": false,
          "test_command": "npm test -- LoginForm.test.tsx"
        }
      ]
    },
    {
      "id": "US-2",
      "title": "User Registration",
      "priority": "P1",
      "completed": false,
      "description": "New users can register an account",
      "tasks": [
        {
          "id": "US-2-001",
          "description": "Create registration API endpoint",
          "prompt": "Create POST /api/auth/register in src/app/api/auth/register/route.ts. Accept email, password, name. Validate email format, password length >= 8. Hash password with bcrypt. Insert into users table. Return JWT token on success.",
          "objective": "Functional registration endpoint with password hashing",
          "completed": false,
          "test_command": "npm test -- register.test.ts"
        }
      ]
    }
  ]
}
```

## Naming Conventions

### Feature IDs

- Use kebab-case: `user-authentication`, `financial-grid`
- Optionally include numeric prefix: `003-financial-grid`
- Must be directory-safe (no special characters)

### User Story IDs

- Format: `US-N` where N is sequential (1, 2, 3...)
- Example: `US-1`, `US-2`, `US-3`

### Task IDs

- Format: `US-N-XXX` where N is US number, XXX is sequential task number
- Example: `US-1-001`, `US-1-002`, `US-2-001`
- Use zero-padding: `001`, `002`, not `1`, `2`

## Best Practices

### Prompts

- Be specific and actionable
- Include file paths when applicable
- Reference existing code/infrastructure
- Specify expected behavior, not just "create X"

**Bad prompt:**

```
Create a login endpoint
```

**Good prompt:**

```
Create POST /api/auth/login in src/app/api/auth/login/route.ts. Accept email and password in request body. Validate email format with regex. Validate password minimum 8 characters. Use bcrypt to verify against users table. Return JWT token on success (200). Return 401 if credentials invalid, 400 if validation fails.
```

### Objectives

- Clear, measurable outcome
- One sentence max
- Focus on "what" not "how"

**Bad objective:**

```
Create the login endpoint
```

**Good objective:**

```
Functional login endpoint returning valid JWT token on successful authentication
```

### Test Commands

- Use test file names if possible
- Include filters for specific tests
- Make it runnable from project root

**Examples:**

```
npm test -- auth.test.ts
npm run test:unit -- US-1-001
npm test -- --testNamePattern="Login"
```

### Comments

- Use for issues, obstacles, or decisions
- Be concise
- Include relevant context

**Example comments:**

```
Waiting for design team to provide login form mockup
API endpoint implemented but needs additional security headers
Requires clarification on password complexity requirements
```

## Priority Levels

| Priority | Meaning   | When to Use                                                |
| -------- | --------- | ---------------------------------------------------------- |
| **P1**   | Critical  | Core functionality, blocking issues, must have for release |
| **P2**   | Important | Nice to have, moderate impact, important but not blocking  |
| **P3**   | Low       | Nice to have, low impact, can defer                        |

## Implementation Order

Always implement user stories and tasks in the order they appear in PRD.json:

1. US-1 tasks (001, 002, 003...)
2. US-2 tasks (001, 002, 003...)
3. Continue until all tasks complete

**Never skip ahead** - dependencies are implicit in the ordering.
