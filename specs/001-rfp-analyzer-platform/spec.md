# Feature Specification: RFP Analyzer Platform

**Feature Branch**: `001-rfp-analyzer-platform`
**Created**: 2025-11-06
**Last Updated**: 2025-11-07
**Status**: Phase 3 Complete, Phase 4 In Progress
**Input**: User description: "Sur la base de l'expression de besoin V2, construit les specs. Analyse bien le mockup qui a été construit."

---

## 🎯 Implementation Status - Phase 3 COMPLETE ✅

### Authentication & Organization Management (Phases 1-3: T001-T046) - ✅ COMPLETED

#### Phase 1: Setup (T001-T015) - ✅ COMPLETE

- Project initialization with Next.js 14, TypeScript, Tailwind CSS
- shadcn/ui component library integration
- Supabase project setup and configuration
- Database schema creation with migrations
- User, Organization, RFP, Requirement, and Response tables

#### Phase 2: Foundational (T016-T031) - ✅ COMPLETE

- Middleware for session management
- Layout components (RootLayout, DashboardLayout)
- Navigation components (Navbar, Sidebar)
- Theme support (light/dark mode)
- Basic styling and CSS setup

#### Phase 3: Authentication & Organization Management (T032-T046) - ✅ COMPLETE

**User Registration & Authentication (T032-T039)**:

- ✅ Registration form with email/password/fullname fields
- ✅ Supabase Auth email/password authentication
- ✅ Login page and logout functionality
- ✅ Session management via secure HTTP-only cookies
- ✅ Protected dashboard routes with middleware
- ✅ `/api/auth/me` endpoint returning authenticated user profile
- ✅ `/api/auth/register` endpoint for user profile creation

**Organization Management (T040-T046)**:

- ✅ Multi-tenant architecture with Row Level Security (RLS)
- ✅ Organization creation with automatic code generation
- ✅ Organization management page (`/dashboard/organizations`)
- ✅ **NEW: Organization Code System** - 10-digit unique identifier per organization
- ✅ User-organization relationships with roles (admin, member, viewer)
- ✅ Organization code sharing and display
- ✅ Navbar with user profile and organization switcher
- ✅ Theme toggle (light/dark mode) in navbar
- ✅ `useAuth()` hook for authentication state
- ✅ `useOrganization()` hook for organization context management

### Key Architecture Changes - Phase 3

#### Organization Registration Flow (UPDATED)

**Original Design**: Users could create organizations during registration
**Current Design**: Users must enter a 10-digit organization code to join existing organizations

**Why This Change**:

- Prevents unauthorized organization creation
- Ensures proper access control and security
- Allows admins to control who can join their organization
- Better audit trail and data governance

**New Registration Process**:

1. Admin creates organization via `/dashboard/organizations`
2. System generates unique 10-digit `organization_code`
3. Admin shares code with team members (displayed on page, copy button available)
4. New users enter code during registration at `/register`
5. User profile created and automatically linked to organization as **"member"**
6. User can then switch between multiple organizations if member of several

#### Data Model Changes

**organizations Table - NEW COLUMN**:

```sql
ALTER TABLE public.organizations
ADD COLUMN organization_code VARCHAR(10) UNIQUE NOT NULL;
CREATE INDEX idx_organizations_code ON public.organizations(organization_code);
```

**Example Organization Record**:

```json
{
  "id": "a242bfb5-982d-404a-84f3-7837296e9b73",
  "name": "Test Organization",
  "slug": "test-organization",
  "organization_code": "5525548542",
  "subscription_tier": "free",
  "max_users": 10,
  "max_rfps": 5,
  "created_at": "2025-11-07T08:08:28.627Z",
  "updated_at": "2025-11-07T08:08:28.627Z"
}
```

**user_organizations Table - ROLE CONSTRAINTS UPDATED**:

```sql
-- Changed from admin-only to support multiple roles
ALTER TABLE public.user_organizations
DROP CONSTRAINT valid_role;

ALTER TABLE public.user_organizations
ADD CONSTRAINT valid_role CHECK (role IN ('admin', 'member', 'viewer'));
```

**Valid Roles**:

- **admin**: Full access to organization settings, can invite/remove members, manage RFPs
- **member**: Can access organization RFPs and perform evaluations
- **viewer**: Read-only access to organization data

**Role Assignment Rules**:

- User creating organization → automatically **admin**
- User joining via code → automatically **member**
- Admin can change roles via API endpoint `/api/organizations/[id]/members/[userId]`

#### RLS (Row Level Security) Status

**Current Implementation**:

- ✅ `users` table: INSERT (during registration), SELECT (own profile), UPDATE (own profile)
- ✅ `user_organizations` table: INSERT, SELECT, UPDATE, DELETE
- ⚠️ `organizations` table: RLS DISABLED (temporary for MVP testing)
- ✅ Multi-tenant isolation enforced where RLS enabled

**Production Readiness Note**:

- Need to re-enable RLS on `organizations` table before production
- Policy: Users can SELECT organizations they are members of
- Policy: Only admins can UPDATE organization settings
- Recommended: Add audit table for organization changes

#### API Endpoints - Phase 3 Complete

**Authentication Endpoints**:

- `POST /api/auth/register` - Register new user and join organization via code
  - Body: `{ userId, email, fullName, organizationCode }`
  - Returns: User + organization details
  - Error: Invalid code format, organization not found
- `POST /api/auth/login` - Authenticate existing user
  - Body: `{ email, password }`
  - Returns: Access token and user profile
- `POST /api/auth/logout` - Clear session
- `GET /api/auth/me` - Get current authenticated user with all organizations
  - Returns: User profile + array of organizations with roles

**Organization Endpoints**:

- `POST /api/organizations/create` - Create new organization (authenticated only)
  - Body: `{ name }`
  - Returns: Organization with auto-generated code
  - Note: Creator becomes admin
- `GET /api/organizations` - List user's organizations
- `GET /api/organizations/[id]` - Get organization details (admin only)
- `PUT /api/organizations/[id]` - Update organization (admin only)
- `GET /api/organizations/[id]/members` - List organization members
- `POST /api/organizations/[id]/invite` - Invite user via email (admin only)
- `PATCH /api/organizations/[id]/members/[userId]` - Change member role (admin only)
- `DELETE /api/organizations/[id]/members/[userId]` - Remove member (admin only)

#### UI Components - Phase 3

**Pages**:

- `app/(auth)/register/page.tsx` - Registration with organization code input
- `app/(auth)/login/page.tsx` - Login page
- `app/dashboard/page.tsx` - Main dashboard
- `app/dashboard/organizations/page.tsx` - Organization management (NEW)

**Components**:

- `Navbar.tsx` - Top navigation with user menu and theme toggle
- `OrganizationSwitcher.tsx` - Dropdown for switching organizations

**Hooks**:

- `hooks/use-auth.ts` - Authentication state management
- `hooks/use-organization.ts` - Organization context and switching

#### Testing & Validation

**Test Organization Codes** (Production Database):
| Organization | Code |
|---|---|
| Test Organization | 5525548542 |
| My Organization | 8534584434 |
| Test Org | 8726755826 |
| seb's corp | 6664718785 |

**Test Scenarios - All ✅ PASSING**:

1. Register with valid organization code → User added as "member" ✅
2. Register with invalid code format → Error: "Code must be exactly 10 digits" ✅
3. Register with non-existent code → Error: "Organization not found" ✅
4. Create new organization → Code auto-generated and displayed ✅
5. Copy organization code → Clipboard functionality working ✅
6. Switch between organizations → Context updates correctly ✅
7. Dark/light theme toggle → Applies without page reload ✅
8. Logout → Clears session and redirects to login ✅

---

## 📋 Phase 4: Requirements Hierarchy & Evaluation (T047-T065) - IN PROGRESS

This phase will implement the core RFP evaluation functionality:

- View and navigate hierarchical requirements (Domain → Category → Subcategory → Requirement)
- Compare supplier responses side-by-side
- Score and evaluate supplier responses
- Track evaluation progress

---

## Original Specification (Phases 1-3 Reference)

**Created**: 2025-11-06  
**Status**: Draft  
**Input**: User description: "Sur la base de l'expression de besoin V2, construit les specs. Analyse bien le mockup qui a été construit."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View and Navigate Requirements Hierarchy (Priority: P1)

An evaluation team member needs to explore and understand all requirements from the RFP across multiple hierarchical levels (Domain → Category → Subcategory → Requirement).

**Why this priority**: This is the foundation of the entire platform. Without the ability to view and navigate requirements, users cannot perform any evaluation tasks. This represents the core data structure and navigation pattern that all other features depend on.

**Independent Test**: Can be fully tested by loading a hierarchical requirements tree with 4 levels, expanding/collapsing nodes, searching by requirement ID or title, and selecting a specific requirement to view its details. Delivers immediate value by providing visibility into the RFP structure.

**Acceptance Scenarios**:

1. **Given** the user loads the dashboard with an RFP containing hierarchical requirements, **When** they view the sidebar, **Then** they see a 4-level tree structure (Domain → Category → Subcategory → Requirement) with expandable nodes
2. **Given** the user is viewing the requirements tree, **When** they click "Expand All", **Then** all nodes expand to show all levels
3. **Given** the user is viewing the requirements tree, **When** they click "Collapse All", **Then** all nodes collapse to show only top-level domains
4. **Given** the user enters text in the search field, **When** the search query matches requirement IDs or titles, **Then** the tree filters to show only matching requirements and their parent hierarchy
5. **Given** the user selects a specific requirement from the tree, **When** the selection is made, **Then** the requirement details display in the main content area with full context

---

### User Story 2 - Compare Supplier Responses for Single Requirement (Priority: P1)

An evaluator needs to review and compare responses from all suppliers (4-10 suppliers) for a specific requirement, seeing the AI analysis and adding their own evaluation.

**Why this priority**: This is the primary evaluation workflow. Users spend most of their time comparing supplier responses side-by-side. This story enables the core value proposition: comparative analysis of supplier responses.

**Independent Test**: Can be tested by selecting a requirement and viewing all supplier responses in a comparison view, seeing AI scores and comments, and being able to expand each response for full details. Delivers value by enabling parallel evaluation of all suppliers.

**Acceptance Scenarios**:

1. **Given** a requirement is selected with 4-10 supplier responses, **When** the comparison view loads, **Then** all supplier responses are displayed in a list format showing: supplier name, response excerpt (2-line preview), AI score (1-5 stars), and compliance status badge
2. **Given** the user views supplier responses in the comparison list, **When** they click the expand chevron for a supplier, **Then** the row expands to show: full response text, detailed AI commentary in a scrollable area, status selector, and fields for manual comments and questions
3. **Given** the user expands a supplier response, **When** they view the AI commentary, **Then** they see a "Copy" button to copy the AI analysis to clipboard
4. **Given** multiple supplier responses are visible, **When** the user compares them, **Then** responses remain aligned vertically for easy comparison and each can be independently expanded/collapsed

---

### User Story 3 - Manually Score and Flag Supplier Responses (Priority: P1)

An evaluator needs to override AI scores, set compliance status, add comments, and flag questions/doubts for specific supplier responses.

**Why this priority**: Human judgment is the final decision point. While AI provides initial analysis, evaluators must be able to override scores, set official compliance status, and document their reasoning. This completes the minimum evaluation workflow.

**Independent Test**: Can be tested by selecting a response, clicking stars to set a manual score (0-5), selecting a status from the toggle group (Pending/Pass/Partial/Fail), adding text to comment fields, and verifying all changes persist. Delivers value by capturing human evaluation decisions.

**Acceptance Scenarios**:

1. **Given** a supplier response is displayed, **When** the evaluator clicks on a star (1-5), **Then** the manual score is set to that star level and displayed as "X/5"
2. **Given** the evaluator has set a manual score, **When** they click the currently selected star again, **Then** the score resets to 0
3. **Given** an expanded supplier response, **When** the evaluator selects a status (Pending/Pass/Partial/Fail) from the toggle group, **Then** the status badge updates and the response checkbox auto-checks (except for "Pending" status)
4. **Given** the evaluator clicks the response checkbox, **When** it's checked, **Then** the checkbox displays a green checkmark and the requirement's completion badge updates if all responses are now checked
5. **Given** an expanded supplier response, **When** the evaluator enters text in "Your Comment" or "Questions/Doubts" fields, **Then** the text is saved and associated with that specific response

---

### User Story 4 - Navigate Between Requirements During Evaluation (Priority: P2)

An evaluator needs to quickly move through requirements sequentially without returning to the sidebar, maintaining evaluation flow and context.

**Why this priority**: While not absolutely essential for MVP, pagination significantly improves workflow efficiency. Evaluators typically work through requirements sequentially, and having to use the sidebar for each navigation would be tedious. This enhances user experience without adding complex functionality.

**Independent Test**: Can be tested by using chevron buttons (<< >>) to move to previous/next requirements, viewing the counter (X/Y), and verifying breadcrumb updates. Delivers value by enabling faster sequential evaluation.

**Acceptance Scenarios**:

1. **Given** the user is viewing a requirement, **When** they click the right chevron (>>), **Then** the next requirement loads with its supplier responses
2. **Given** the user is viewing a requirement, **When** they click the left chevron (<<), **Then** the previous requirement loads with its supplier responses
3. **Given** the user is on the first requirement, **When** they view the navigation controls, **Then** the left chevron is disabled
4. **Given** the user is on the last requirement, **When** they view the navigation controls, **Then** the right chevron is disabled
5. **Given** the user navigates between requirements, **When** the page loads, **Then** the breadcrumb updates to show the current requirement's hierarchical path

---

### User Story 5 - Track Evaluation Progress (Priority: P2)

An evaluator needs to see which requirements have been fully evaluated (all suppliers reviewed) to track progress through the RFP.

**Why this priority**: Progress tracking helps evaluators know what work remains and ensures complete coverage. While the evaluation can function without this, it significantly improves task management for larger RFPs with many requirements.

**Independent Test**: Can be tested by checking/unchecking supplier responses and observing the requirement completion badge change from gray/pending to green/complete. Delivers value by providing visual feedback on evaluation progress.

**Acceptance Scenarios**:

1. **Given** a requirement where all supplier responses are checked, **When** the requirement header is displayed, **Then** a green checkmark badge appears next to the requirement title
2. **Given** a requirement where some supplier responses are unchecked, **When** the requirement header is displayed, **Then** a gray clock badge with dashed border appears next to the requirement title
3. **Given** the user checks the last unchecked response, **When** the checkbox is checked, **Then** the requirement badge immediately updates from gray/pending to green/complete
4. **Given** the user is viewing the sidebar tree, **When** requirements have different completion states, **Then** each requirement shows its completion badge in the tree view

---

### User Story 6 - View Requirement Context from RFP Document (Priority: P3)

An evaluator needs to see the original context from the RFP document explaining why the requirement exists and what background information is relevant.

**Why this priority**: Context helps evaluators make better decisions, but the core evaluation can proceed without it. This is a quality-of-life feature that provides deeper understanding but isn't blocking for basic evaluation tasks.

**Independent Test**: Can be tested by clicking the context section toggle to expand/collapse, viewing 3-4 paragraphs of context text, and clicking "Open in PDF" to view the source document. Delivers value by providing background for better evaluation decisions.

**Acceptance Scenarios**:

1. **Given** a requirement is selected, **When** the context section is collapsed, **Then** it shows "Contexte du cahier des charges" with a chevron-down icon
2. **Given** the context section is collapsed, **When** the user clicks the section header, **Then** it expands to reveal 3-4 paragraphs of contextual information
3. **Given** the context section is expanded, **When** the user clicks the section header again, **Then** it collapses to hide the context text
4. **Given** the context section is expanded, **When** the user views the content, **Then** they see a button labeled "Open in PDF" to view the source document

---

### User Story 7 - Switch Between Dark and Light Themes (Priority: P3)

Users need to toggle between dark mode and light mode to match their environment and visual preferences.

**Why this priority**: Theme switching improves usability and reduces eye strain, but it's purely aesthetic. The platform is fully functional in either mode, making this a nice-to-have enhancement rather than core functionality.

**Independent Test**: Can be tested by clicking the moon/sun icon in the navbar and verifying the entire interface switches color schemes with proper contrast maintained. Delivers value through improved visual comfort.

**Acceptance Scenarios**:

1. **Given** the user is in light mode, **When** they click the moon icon in the navbar, **Then** the entire interface switches to dark mode with proper contrast (dark backgrounds, light text)
2. **Given** the user is in dark mode, **When** they click the sun icon in the navbar, **Then** the entire interface switches to light mode with proper contrast (light backgrounds, dark text)
3. **Given** the user switches themes, **When** the theme changes, **Then** all UI components (sidebar, badges, buttons, textareas) update their colors appropriately

---

### User Story 8 - Trigger AI Analysis for Supplier Responses (Priority: P2)

Evaluators need to trigger AI analysis for supplier responses that were imported without AI scores, allowing on-demand analysis from within the application.

**Why this priority**: While AI analysis can be done externally via N8N, providing in-app triggering improves workflow efficiency and reduces context switching. This is a productivity enhancement that doesn't block core evaluation functionality.

**Independent Test**: From the RFP dashboard, select responses without AI analysis, click "Analyze with AI" action button, and verify that the analysis is queued. After processing, AI scores and commentary should appear in the comparison view. Delivers value through streamlined workflow.

**Acceptance Scenarios**:

1. **Given** an RFP has imported responses without AI analysis, **When** the evaluator views the dashboard table, **Then** they see an "Analyze with AI" action button for that RFP
2. **Given** the evaluator clicks "Analyze with AI", **When** the analysis is triggered, **Then** the system sends a webhook to N8N with RFP and response IDs, and shows a "Processing..." status
3. **Given** AI analysis is in progress, **When** the evaluator views responses, **Then** they see a loading indicator and can continue working on other requirements
4. **Given** AI analysis completes, **When** the evaluator refreshes or returns to the responses, **Then** AI scores and commentary are displayed alongside manual evaluation fields
5. **Given** some responses already have AI analysis, **When** triggering analysis, **Then** only responses without `ai_score` and `ai_comment` are processed (skip already analyzed)

**Technical Approach**:

- Dashboard action button triggers POST `/api/rfps/[rfpId]/analyze`
- Backend webhook to N8N workflow with payload: `{ rfpId, responseIds[] }`
- N8N processes each response and updates via PUT `/api/responses/[responseId]`
- Real-time updates via polling or optimistic UI updates
- Track analysis status in database (pending/processing/completed/failed)

---

### Edge Cases

- What happens when a requirement has zero supplier responses (no one bid on this requirement)?
  - Display the requirement with a message "No supplier responses available for this requirement"
  - Disable comparison features but keep requirement details visible

- What happens when a supplier response text is extremely long (10,000+ characters)?
  - Display a preview in collapsed view with ellipsis
  - Show full text in expanded view with scrollable textarea
  - Ensure textarea is resizable for user control

- What happens when the AI fails to provide a score or comment for a response?
  - Display "N/A" or "0" for missing AI scores
  - Show "No AI analysis available" in the comment area
  - Allow manual scoring to proceed independently

- What happens when a user tries to navigate past the first/last requirement?
  - Disable the corresponding chevron button (gray out)
  - Prevent the action with no error message needed

- What happens when search returns no matching requirements?
  - Display "No requirements found matching '[query]'" in the sidebar
  - Show a "Clear search" button to reset the tree

- What happens when the requirement hierarchy is incomplete or malformed (missing parent)?
  - Display orphaned requirements at the root level with a warning badge
  - Log an error for administrators to fix data integrity

- What happens when two evaluators are viewing/editing the same RFP simultaneously?
  - Use a last-write-wins approach: whoever saves their changes last will overwrite any previous changes to the same data
  - No conflict detection or warnings are displayed
  - Acceptable for small teams (2-3 evaluators) who coordinate their work verbally or via external communication
  - Users are expected to communicate and divide evaluation work to avoid conflicts
  - Note: Real-time collaborative editing with conflict resolution is deferred to V2

## Requirements _(mandatory)_

### Functional Requirements

#### Navigation & Structure

- **FR-001**: System MUST display requirements in a 4-level hierarchy (Domain → Category → Subcategory → Requirement) in a sidebar navigation tree
- **FR-002**: System MUST allow users to expand and collapse individual nodes in the requirements tree by clicking on them
- **FR-003**: System MUST provide "Expand All" and "Collapse All" buttons to control the entire tree state simultaneously
- **FR-004**: System MUST support real-time search filtering of requirements by ID (e.g., "REQ-001") or title text
- **FR-005**: System MUST highlight the currently selected requirement in the sidebar tree
- **FR-006**: System MUST display a breadcrumb trail showing the full hierarchical path to the current requirement (e.g., "DOM-1 / CAT-1.1 / SUB-1.1.1 / REQ-001")

#### Requirement Display

- **FR-007**: System MUST display requirement details including: unique ID, title, multi-line description with bullet point support, and weighting percentage
- **FR-008**: System MUST provide a collapsible context section containing 3-4 paragraphs of background information from the RFP document
- **FR-009**: System MUST display a completion status badge for each requirement (green checkmark when all suppliers reviewed, gray clock when pending)
- **FR-010**: System MUST provide pagination controls (previous/next chevrons and X/Y counter) to navigate between requirements sequentially

#### Supplier Response Comparison

- **FR-011**: System MUST display all supplier responses (4-10) for the selected requirement in a vertically aligned comparison list
- **FR-012**: System MUST show for each supplier response in collapsed view: supplier name, 2-line response text preview, AI score (1-5 stars), and status badge
- **FR-013**: System MUST allow users to expand individual supplier responses to view full details without affecting other rows
- **FR-014**: System MUST display in expanded view: full response text (scrollable/resizable textarea), AI commentary in scrollable area, status selector, and comment/question fields
- **FR-015**: System MUST provide a "Copy" button to copy AI commentary to clipboard

#### Scoring & Evaluation

- **FR-016**: System MUST display AI-generated scores as 1-5 stars with numeric display (e.g., "4/5")
- **FR-017**: System MUST allow users to manually set scores by clicking stars, with the ability to reset to 0 by clicking the current score again
- **FR-018**: System MUST prioritize manual scores over AI scores when both exist (final score = manual if set, otherwise AI)
- **FR-019**: System MUST provide a status toggle group with 4 options: Pending (gray, clock icon), Pass (green, checkmark), Partial (blue, lightning), Fail (red, X)
- **FR-020**: System MUST auto-check the response completion checkbox when any status except "Pending" is selected
- **FR-021**: System MUST allow users to manually check/uncheck response completion checkboxes independently of status
- **FR-022**: System MUST update the requirement completion badge when all supplier responses for that requirement are checked

#### Comments & Documentation

- **FR-023**: System MUST provide a "Your Comment" textarea field for evaluator notes on each supplier response
- **FR-024**: System MUST provide a "Questions / Doubts" textarea field for flagging unclear or concerning aspects of each response
- **FR-025**: System MUST preserve all manual inputs (scores, statuses, comments, questions, checkboxes) when navigating between requirements

#### Theme & Appearance

- **FR-026**: System MUST support both light and dark color themes with a toggle button in the navbar
- **FR-027**: System MUST use dark backgrounds (slate-900) for the sidebar in all themes
- **FR-028**: System MUST ensure proper contrast ratios for text readability in both themes
- **FR-029**: System MUST display status badges with consistent sizing and appropriate semantic colors (green=pass, blue=partial, red=fail, gray=pending)

#### Data Integration

- **FR-030**: System MUST accept requirement data with attributes: id, title, description, context, weight, level (1-4), parentId
- **FR-031**: System MUST accept supplier data with attributes: id, name, contact information
- **FR-032**: System MUST accept response data with attributes: requirementId, supplierId, responseText, aiScore (0-5), aiComment, status
- **FR-033**: System MUST handle missing or incomplete data gracefully (e.g., missing AI scores, empty response text)

#### Multi-Tenant & Access Control

- **FR-034**: System MUST support multiple organizations (companies or business units) in a single database instance
- **FR-035**: System MUST isolate RFP data by organization - users can only access RFPs belonging to their organization
- **FR-036**: System MUST support user authentication and maintain user sessions
- **FR-037**: System MUST assign users to specific organizations with role-based access
- **FR-038**: System MUST support multiple users per organization with different access levels (admin, evaluator, viewer)
- **FR-039**: System MUST allow organization admins to invite users to their organization
- **FR-040**: System MUST allow assignment of specific evaluators to individual RFPs for access control
- **FR-041**: System MUST track which user created/modified each RFP, requirement, and response evaluation
- **FR-042**: System MUST prevent cross-organization data access through database-level Row Level Security (RLS) policies

### Key Entities _(include if feature involves data)_

- **Organization**: Represents a company or business unit using the platform. Contains: unique ID, name, settings/configuration, subscription tier, and creation date. Provides multi-tenant isolation - all RFPs, users, and data are scoped to an organization. Supports multiple business units within a company as separate organizations.

- **User**: Represents an authenticated user of the platform. Contains: unique ID, email, name, authentication credentials (managed by Supabase Auth), and profile information. Users belong to one or more organizations with specific roles (admin, evaluator, viewer). Users can be assigned to specific RFPs within their organization.

- **User-Organization Assignment**: Links users to organizations with role-based access control. Contains: user ID, organization ID, role (admin/evaluator/viewer), and join date. One user can belong to multiple organizations (e.g., consultant working with multiple clients). Role determines permissions within the organization.

- **RFP (Request for Proposal)**: Represents a single procurement process with a unique identifier, title, description, creation date, and organizational owner. Contains a hierarchical structure of requirements and a list of participating suppliers. Status tracks whether evaluation is in progress, completed, or archived. Belongs to exactly one organization and can have assigned evaluators for access control.

- **RFP-User Assignment**: Links evaluators to specific RFPs for granular access control. Contains: RFP ID, user ID, access level (owner/evaluator/viewer), and assignment date. Only assigned users can view/edit the RFP. Enables collaboration control within an organization.

- **Requirement**: Represents a single evaluable criterion within the RFP, organized in a 4-level hierarchy (Domain/Category/Subcategory/Requirement). Contains: unique ID (e.g., "REQ-001"), title, multi-line description, contextual background (3-4 paragraphs), weight (decimal 0-1 representing importance), level (1-4), and optional parentId for hierarchy. Leaf nodes (level 4) are the actual evaluable requirements. Inherits organization from parent RFP.

- **Supplier**: Represents a vendor responding to the RFP. Contains: unique ID, name, and optional contact information. Each supplier submits responses to multiple requirements. Typically 4-10 suppliers per RFP. Inherits organization from parent RFP.

- **Response**: Represents a single supplier's answer to a specific requirement. Contains: unique ID, requirementId (foreign key), supplierId (foreign key), full response text, AI-generated score (0-5), AI-generated commentary, manual score (0-5, optional), compliance status (pending/pass/partial/fail), completion checkbox state (boolean), evaluator comments, and evaluator questions/doubts. Tracks last_modified_by user ID for audit trail. The relationship is: one requirement + one supplier = one response. Inherits organization from parent RFP.

- **Evaluation Session**: Represents the work session of an evaluator. Tracks: user identifier, current RFP, currently selected requirement, theme preference (light/dark), and sidebar expansion state. Maintains local state for unsaved changes during navigation.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Evaluators can view and navigate a complete RFP with 50-200 requirements organized in 4 hierarchical levels without performance degradation
- **SC-002**: Users can complete evaluation of a single requirement (reviewing 8 supplier responses, setting scores, and adding comments) in under 5 minutes
- **SC-003**: The comparison view displays all supplier responses for a requirement simultaneously, allowing parallel comparison without scrolling between sections
- **SC-004**: Evaluators can navigate from one requirement to the next using pagination controls in under 2 seconds
- **SC-005**: 100% of manual evaluation data (scores, statuses, comments, checkboxes) persists when navigating between requirements
- **SC-006**: The search function filters requirements in real-time with results appearing in under 500ms for queries on datasets up to 200 requirements
- **SC-007**: All response textareas are resizable, allowing users to expand view areas for responses containing 10,000+ characters
- **SC-008**: The requirement completion tracking shows accurate status (100% accuracy) based on supplier response checkbox states
- **SC-009**: Theme switching (light/dark) applies to 100% of UI components without page reload or visual glitches
- **SC-010**: Users can successfully expand, view, and copy AI commentary for any response using the provided UI controls

## Assumptions

- **Data Source**: Requirements, suppliers, and responses are pre-processed by N8N workflows before being loaded into the application. The application does not handle PDF parsing or AI analysis directly.

- **External Processing**: AI scoring and commentary are generated externally (via N8N) and provided as complete data. The application treats AI scores as read-only inputs.

- **Single RFP Context**: The UI focuses on evaluating one RFP at a time. Multi-RFP dashboard and switching is considered a V2 feature.

- **User Management**: User authentication and organization-based multi-tenancy are implemented from the start using Supabase Auth. This ensures scalability and proper data isolation for multiple companies/BUs.

- **Data Persistence**: All evaluation data (manual scores, comments, statuses) is saved to a backend database. The specification assumes a reliable persistence layer exists but does not define the specific technology.

- **Response Volume**: Each requirement typically receives 4-10 supplier responses. The UI is optimized for this range but should handle edge cases (0 responses, 15+ responses).

- **Real-time Collaboration**: The MVP assumes sequential evaluation work. If multiple evaluators work simultaneously on the same RFP, a last-write-wins approach is acceptable. Real-time collaborative editing is deferred to V2.

- **PDF Integration**: The "Open in PDF" button for requirement context will link to an external PDF viewer or GCP storage location. In-app PDF rendering is out of scope for MVP.

- **Browser Support**: The application targets modern desktop browsers (Chrome, Firefox, Edge, Safari) on desktop/laptop screens. Mobile responsiveness is acknowledged in the requirements but not prioritized for MVP.

- **Network Reliability**: The application assumes reliable network connectivity. Offline mode and conflict resolution for intermittent connections are out of scope for MVP.

- **Requirement Weighting**: Weights are displayed but not editable in the MVP. Modification of weights is deferred to V2.

- **Scoring Scale**: The 0-5 star scale is the primary scoring mechanism. Conversion to /20 scale for final calculations is handled externally or in future features.

- **Historical Tracking**: The MVP focuses on current evaluation state. Full audit history of who changed what and when is considered a V2 feature for the response_audit table.
