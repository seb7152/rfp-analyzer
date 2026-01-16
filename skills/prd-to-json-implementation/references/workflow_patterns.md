# Common Implementation Patterns

This reference provides reusable patterns for common PRD implementation scenarios.

## Pattern: API Endpoint Creation

### Task Prompt Template

```
Create POST/GET/PUT/DELETE /api/[path]/[endpoint] in [file-path].

**Request:**
- Accept [param1], [param2], ... in request body/query params
- Validate [validation rules]
- [Additional request handling]

**Business Logic:**
- [Step 1]: [Description]
- [Step 2]: [Description]
- [Step 3]: [Description]

**Database Operations:**
- Query [table] with [conditions]
- Insert/Update [table] with [values]
- Handle errors appropriately

**Response:**
- Return [data] on success (status code)
- Return [error] on failure (status code)
- Include proper error messages

**Security:**
- Validate user permissions using [auth-method]
- Sanitize inputs
- Use prepared statements
```

### Example Task

```json
{
  "id": "US-1-001",
  "description": "Create user profile API endpoint",
  "prompt": "Create GET /api/users/[userId]/profile in src/app/api/users/[userId]/profile/route.ts.\n\n**Authentication:**\n- Verify JWT token from Authorization header\n- Validate token belongs to requested userId (or has admin role)\n\n**Database Query:**\n- Fetch user from users table where id = userId\n- Include: name, email, avatar_url, bio, created_at\n- Exclude: password, sensitive fields\n\n**Response:**\n- Return user object on success (200)\n- Return 401 if authentication fails\n- Return 404 if user not found\n- Return 500 for database errors",
  "objective": "Secure API endpoint returning user profile data",
  "completed": false,
  "test_command": "npm test -- user-profile.test.ts"
}
```

## Pattern: Database Schema/Migration

### Task Prompt Template

```
Create Supabase migration [migration-number]_[description].sql in [directory].

**Table: [table_name]**
- id: UUID PRIMARY KEY DEFAULT gen_random_uuid()
- [field1]: [type] [constraints]
- [field2]: [type] [constraints]
- ...
- created_at: TIMESTAMP DEFAULT NOW()
- updated_at: TIMESTAMP DEFAULT NOW()

**Indexes:**
- Index on [field1] for performance
- Index on [field2] for query optimization

**Foreign Keys:**
- [field3] REFERENCES [table]([column]) ON DELETE [behavior]

**RLS Policies:**
- Enable ROW LEVEL SECURITY
- Policy: [policy-name] - [description]
  - USING ([condition])
  - WITH CHECK ([condition])

**Validation:**
- Add CHECK constraint: [constraint]
- Add UNIQUE constraint on [fields]
```

### Example Task

````json
{
  "id": "US-1-001",
  "description": "Create tasks table with RLS",
  "prompt": "Create migration 010_create_tasks.sql in supabase/migrations/.\n\n**Table:**\n```sql\nCREATE TABLE tasks (\n  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n  title VARCHAR(255) NOT NULL,\n  description TEXT,\n  status VARCHAR(20) NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),\n  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,\n  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,\n  priority INTEGER DEFAULT 1 CHECK (priority IN (1, 2, 3)),\n  due_date TIMESTAMP,\n  created_at TIMESTAMP DEFAULT NOW(),\n  updated_at TIMESTAMP DEFAULT NOW()\n);\n```\n\n**Indexes:**\n```sql\nCREATE INDEX idx_tasks_user_id ON tasks(user_id);\nCREATE INDEX idx_tasks_project_id ON tasks(project_id);\nCREATE INDEX idx_tasks_status ON tasks(status);\n```\n\n**RLS:**\n```sql\nALTER TABLE tasks ENABLE ROW LEVEL SECURITY;\n\n-- Users can see their own tasks\nCREATE POLICY \"Users can view own tasks\" ON tasks\n  FOR SELECT USING (auth.uid() = user_id);\n\n-- Users can insert their own tasks\nCREATE POLICY \"Users can insert own tasks\" ON tasks\n  FOR INSERT WITH CHECK (auth.uid() = user_id);\n\n-- Users can update their own tasks\nCREATE POLICY \"Users can update own tasks\" ON tasks\n  FOR UPDATE USING (auth.uid() = user_id)\n  WITH CHECK (auth.uid() = user_id);\n\n-- Users can delete their own tasks\nCREATE POLICY \"Users can delete own tasks\" ON tasks\n  FOR DELETE USING (auth.uid() = user_id);\n```",
  "objective": "Tasks table with proper constraints and RLS policies",
  "completed": false
}
````

## Pattern: React Component Creation

### Task Prompt Template

```
Create [ComponentName] component in [file-path].

**Props:**
- [prop1]: [type] - [description]
- [prop2]: [type] - [description]
- ...

**State:**
- [state1]: [type] - [purpose]
- [state2]: [type] - [purpose]

**UI Structure:**
- [Element 1]: [description]
- [Element 2]: [description]
- ...

**Behavior:**
- [Interaction 1]: [description and handler]
- [Interaction 2]: [description and handler]
- ...

**Styling:**
- Use Tailwind CSS classes
- Follow design system conventions
- [Specific styling requirements]

**Accessibility:**
- Add ARIA labels where needed
- Ensure keyboard navigation
- Use semantic HTML
```

### Example Task

```json
{
  "id": "US-1-005",
  "description": "Create task list component",
  "prompt": "Create TaskList component in src/components/tasks/TaskList.tsx.\n\n**Props:**\n- tasks: Task[] - Array of task objects\n- onStatusChange: (taskId: string, status: string) => void\n- onDelete: (taskId: string) => void\n\n**State:**\n- filter: 'all' | 'active' | 'completed'\n\n**UI Structure:**\n- Filter tabs: All / Active / Completed\n- List of TaskItem components\n- Empty state when no tasks\n\n**Behavior:**\n- Filter tasks by selected filter\n- Pass status change to parent\n- Pass delete to parent\n- Show confirmation dialog before delete\n\n**Styling:**\n- Use card layout for list\n- Hover effects on tasks\n- Color-coded status badges\n- Responsive (stack on mobile)\n\n**Accessibility:**\n- Filter tabs as radio group\n- Focus states on interactive elements\n- Proper ARIA labels",
  "objective": "Reusable task list component with filtering",
  "completed": false,
  "test_command": "npm test -- TaskList.test.tsx"
}
```

## Pattern: Form Validation

### Task Prompt Template

````
Create [FormName] component with validation in [file-path].

**Fields:**
1. [field-name]\n   - Type: [type]\n   - Validation: [rules]\n   - Error message: [text]\n\n2. [field-name]\n   - Type: [type]\n   - Validation: [rules]\n   - Error message: [text]\n\n**Validation Library:**\n- Use [library-name] (e.g., react-hook-form, zod, yup)\n\n**Validation Rules:**\n- [rule 1]: [description]\n- [rule 2]: [description]\n\n**Submission:**\n- Validate all fields\n- Call [API endpoint/function] on valid submit\n- Show error/success feedback\n- Disable submit button during submission\n\n**UX Requirements:**\n- Show inline validation errors\n- Validate on blur or on change\n- Clear errors on field change\n```

### Example Task
```json
{
  "id": "US-1-003",
  "description": "Create login form with validation",
  "prompt": "Create LoginForm component in src/components/auth/LoginForm.tsx.\n\n**Fields:**\n1. email\n   - Type: email\n   - Required: true\n   - Validation: Valid email format\n   - Error: \"Please enter a valid email address\"\n\n2. password\n   - Type: password\n   - Required: true\n   - Validation: Min 8 characters\n   - Error: \"Password must be at least 8 characters\"\n\n**Library:**\n- Use react-hook-form with zod schema\n\n**Submission:**\n- Validate all fields\n- Call POST /api/auth/login with email and password\n- Store JWT in localStorage on success\n- Show error message on failure\n- Disable submit button during API call\n- Redirect to dashboard on success\n\n**UX:**\n- Show inline validation errors on blur\n- Clear errors when user starts typing\n- Show password toggle visibility\n- Remember me checkbox",
  "objective": "Functional login form with client-side validation",
  "completed": false,
  "test_command": "npm test -- LoginForm.test.tsx"
}
````

## Pattern: Testing Setup

### Task Prompt Template

````
Create tests for [component/function/API] in [test-file-path].

**Test Scenarios:**
1. [Scenario 1]: [Expected behavior]\n2. [Scenario 2]: [Expected behavior]\n3. [Scenario 3]: [Expected behavior]\n\n**Test Library:**\n- Use [library] (e.g., Jest, Vitest, React Testing Library)\n\n**Test Structure:**\n```typescript\ndescribe('[Component/Function Name]', () => {\n  test('[description]', () => {\n    // Arrange\n    \n    // Act\n    \n    // Assert\n  });\n});\n```\n\n**Coverage:**\n- Happy path (normal operation)\n- Edge cases\n- Error handling\n- Integration scenarios"
````

### Example Task

```json
{
  "id": "US-1-006",
  "description": "Create unit tests for login API",
  "prompt": "Create tests in src/app/api/auth/login.test.ts.\n\n**Test Library:**\n- Use Jest with Supabase mock\n\n**Test Scenarios:**\n\n1. Successful login with valid credentials\n   - Status: 200\n   - Returns JWT token\n   - Token is valid\n\n2. Login with invalid password\n   - Status: 401\n   - Returns error message\n\n3. Login with non-existent email\n   - Status: 401\n   - Returns error message\n\n4. Login with invalid email format\n   - Status: 400\n   - Returns validation error\n\n5. Login with missing fields\n   - Status: 400\n   - Returns validation error\n\n**Setup:**\n- Mock Supabase client\n- Create test user in database\n- Clean up after tests\n\n**Coverage:**\n- All status codes tested\n- Error messages verified\n- JWT token structure validated",
  "objective": "Comprehensive test coverage for login endpoint",
  "completed": false,
  "test_command": "npm test -- login.test.ts"
}
```

## Pattern: Type Definition (TypeScript)

### Task Prompt Template

```
Create TypeScript types for [domain] in [file-path].

**Types to define:**\n- [Type1]: [description with fields]\n- [Type2]: [description with fields]\n\n**Base Types:**\n- [Shared type]: [description]\n\n**Derived Types:**\n- [Union type]: [description]\n- [Utility type]: [description]\n\n**Export:**\n- Export all types\n- Provide default exports for common types\n\n**Validation:**\n- Use proper TypeScript types\n- Add JSDoc comments\n- Mark optional fields with `?`"
```

### Example Task

````json
{
  "id": "US-1-001",
  "description": "Create TypeScript types for tasks",
  "prompt": "Create types in src/types/tasks.ts.\n\n**Types:**\n```typescript\n/**\n * Task priority levels\n */\nexport type TaskPriority = 1 | 2 | 3;\n\n/**\n * Task status\n */\nexport type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled';\n\n/**\n * Base task interface\n */\nexport interface Task {\n  id: string;\n  title: string;\n  description?: string;\n  status: TaskStatus;\n  priority: TaskPriority;\n  due_date?: Date;\n  created_at: Date;\n  updated_at: Date;\n}\n\n/**\n * Task with user details\n */\nexport interface TaskWithUser extends Task {\n  user_id: string;\n  user: {\n    id: string;\n    name: string;\n    email: string;\n  };\n}\n\n/**\n * Task with project details\n */\nexport interface TaskWithProject extends Task {\n  project_id: string;\n  project: {\n    id: string;\n    name: string;\n  };\n}\n\n/**\n * Full task with all relations\n */\nexport interface FullTask extends TaskWithUser, TaskWithProject {}\n```\n\n**Exports:**\n- Default export: Task\n- Named exports: all types\n\n**JSDoc:**\n- Add comments to all types\n- Explain enum/union values",
  "objective": "Complete TypeScript type definitions for task domain",
  "completed": false
}
````

## Pattern: Git Workflow with Stashes

### Stashing After User Story Completion

```bash
# After completing all tasks in a US
git add specs/[feature-id]/prd.json  # Save updated PRD.json
git add .                             # Stage all changes
git stash save "Complete US-[N]: [User Story Title]"
```

### Unstacking Before Final Commit

```bash
# List all stashes
git stash list

# Unstack in order (oldest first)
git stash pop stash@{0}  # US-1
git stash pop stash@{0}  # US-2 (now at index 0)
git stash pop stash@{0}  # US-3 (now at index 0)

# After all stashes applied
npm test && npm run lint
git commit -m "feat([feature-id]): Implement [feature title] - All US completed"
```

## Pattern: Running Tests

### Before Each Commit (Final Only)

```bash
# Run all tests
npm test

# Run linting
npm run lint

# TypeScript typecheck (if applicable)
npm run typecheck

# Or combined (check package.json for script)
npm test && npm run lint
```

### Running Specific Tests

```bash
# Run test file
npm test -- login.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="Login"

# Run with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## Pattern: Error Handling in Tasks

### When Task Fails

1. Add comment to task:

```json
{
  "id": "US-1-003",
  "completed": false,
  "comments": "Blocked: Waiting for database migration approval. Expected migration ID: 010_create_tasks.sql"
}
```

2. Save PRD.json

3. If blocking: Stop implementation and notify user
4. If non-blocking: Continue to next task

### When Task Succeeds with Issues

```json
{
  "id": "US-1-003",
  "completed": true,
  "comments": "Implemented but requires additional security headers. Ticket filed: SEC-123"
}
```

## Pattern: Task Dependencies

If task B depends on task A, make this explicit in the prompt:

```json
{
  "id": "US-1-002",
  "prompt": "Create the login UI component.\n\n**Dependencies:**\n- Requires US-1-001 (login API endpoint) to be complete\n- API endpoint provides POST /api/auth/login\n\n\n**Implementation:**\n..."
}
```
