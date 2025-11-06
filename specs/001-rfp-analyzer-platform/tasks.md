# Tasks: RFP Analyzer Platform

**Input**: Design documents from `/specs/001-rfp-analyzer-platform/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.yaml

**Tests**: Tests are NOT explicitly requested in the feature specification. Test tasks are excluded per specification guidelines.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Based on plan.md, this is a Next.js 14 App Router project with the following structure:
- Frontend components: `components/`, `app/`
- API routes: `app/api/`
- Database: `supabase/migrations/`
- Utilities: `lib/`, `hooks/`, `types/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Next.js 14 project with TypeScript, Tailwind CSS, and ESLint configuration
- [x] T002 [P] Install core dependencies: next@14, react@18, tailwindcss@3, @supabase/supabase-js@2
- [x] T003 [P] Install shadcn/ui CLI and configure components.json with design tokens
- [x] T004 [P] Create environment variables template in .env.example (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- [x] T005 Configure Tailwind dark mode with class strategy in tailwind.config.ts
- [x] T006 [P] Install Lucide React icons package for UI icons
- [x] T007 [P] Install next-themes for theme persistence in next-themes@latest
- [x] T008 Create app/layout.tsx with ThemeProvider wrapper and metadata configuration
- [x] T009 Create app/globals.css with Tailwind directives and CSS variables for theming
- [x] T010 [P] Create lib/utils.ts with cn() utility function for conditional Tailwind classes

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T011 Run supabase/migrations/migrations-multi-tenant.sql to create all 9 database tables with RLS policies
- [x] T012 Create lib/supabase/client.ts with Supabase client initialization (browser client)
- [x] T013 Create lib/supabase/server.ts with Supabase server client for API routes and Server Components
- [x] T014 Generate TypeScript types from Supabase schema in lib/supabase/types.ts using Supabase CLI
- [x] T015 Create types/rfp.ts with RFP, Organization type definitions
- [x] T016 [P] Create types/requirement.ts with Requirement type definitions including hierarchy
- [x] T017 [P] Create types/supplier.ts with Supplier type definitions
- [x] T018 [P] Create types/response.ts with Response, ResponseUpdate type definitions
- [x] T019 [P] Create types/user.ts with User, UserWithRole, OrganizationWithRole type definitions
- [x] T020 Create app/middleware.ts with authentication check for protected routes using Supabase Auth
- [x] T021 Create lib/constants.ts with enum values (statuses, roles, access levels)
- [x] T022 Install @tanstack/react-query for data fetching and caching
- [x] T023 Create app/providers.tsx with QueryClientProvider wrapper for React Query
- [x] T024 [P] Install and initialize shadcn/ui button component in components/ui/button.tsx
- [x] T025 [P] Install and initialize shadcn/ui input component in components/ui/input.tsx
- [x] T026 [P] Install and initialize shadcn/ui textarea component in components/ui/textarea.tsx
- [x] T027 [P] Install and initialize shadcn/ui badge component in components/ui/badge.tsx
- [x] T028 [P] Install and initialize shadcn/ui scroll-area component in components/ui/scroll-area.tsx
- [x] T029 [P] Install and initialize shadcn/ui tabs component in components/ui/tabs.tsx
- [x] T030 [P] Install and initialize shadcn/ui toggle-group component in components/ui/toggle-group.tsx
- [x] T031 [P] Install and initialize shadcn/ui breadcrumb component in components/ui/breadcrumb.tsx

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: Authentication & Multi-Tenant Setup (Priority: P0 - Prerequisite)

**Goal**: Implement user authentication and organization management to enable multi-tenant data isolation

**Independent Test**: User can register with email/password, create an organization, log in, and see their organization context. All data queries respect organization boundaries via RLS.

### Authentication Implementation

- [ ] T032 [P] Create app/(auth)/login/page.tsx with email/password login form
- [ ] T033 [P] Create app/(auth)/register/page.tsx with registration form including organization creation
- [ ] T034 Create app/api/auth/register/route.ts POST endpoint to create user + organization + user_organization link
- [ ] T035 Create app/api/auth/login/route.ts POST endpoint using Supabase Auth signInWithPassword
- [ ] T036 Create app/api/auth/logout/route.ts POST endpoint using Supabase Auth signOut
- [ ] T037 Create app/api/auth/me/route.ts GET endpoint returning user profile and organizations
- [ ] T038 Create hooks/use-auth.ts custom hook for authentication state management
- [ ] T039 Create hooks/use-organization.ts custom hook for current organization context and switching

### Organization Management Implementation

- [ ] T040 [P] Create app/api/organizations/route.ts with GET (list user's orgs) and POST (create org)
- [ ] T041 Create app/api/organizations/[organizationId]/route.ts with GET (org details) and PUT (update org)
- [ ] T042 Create app/api/organizations/[organizationId]/members/route.ts GET endpoint for organization members list
- [ ] T043 Create app/api/organizations/[organizationId]/invite/route.ts POST endpoint to invite user to organization
- [ ] T044 Create app/api/organizations/[organizationId]/members/[userId]/route.ts DELETE and PATCH for member management
- [ ] T045 Create components/OrganizationSwitcher.tsx dropdown component for switching between user's organizations
- [ ] T046 Create components/Navbar.tsx with organization switcher, theme toggle, and user profile menu

**Checkpoint**: Authentication and organization management complete - users can register, log in, and work within organization boundaries

---

## Phase 4: User Story 1 - View and Navigate Requirements Hierarchy (Priority: P1) 🎯 MVP Foundation

**Goal**: Enable users to view, expand/collapse, search, and navigate a 4-level hierarchical requirements tree

**Independent Test**: Load an RFP with 50+ requirements across 4 levels, expand/collapse nodes, search by ID or title, and select requirements to view details. Hierarchy displays correctly with proper indentation and collapse states.

### Database API for Requirements

- [ ] T047 Create lib/supabase/queries.ts with getRequirements() function using recursive CTE for hierarchy
- [ ] T048 Add getRequirementBreadcrumb() function to queries.ts for hierarchical path lookup
- [ ] T049 Create app/api/rfps/[rfpId]/requirements/route.ts GET endpoint returning hierarchical requirements tree
- [ ] T050 Create app/api/requirements/[requirementId]/route.ts GET endpoint with requirement details and breadcrumb

### Requirements Tree Component

- [ ] T051 [P] [US1] Create components/Sidebar.tsx with collapsible sidebar container and search input
- [ ] T052 [US1] Create components/RequirementTree.tsx component with recursive rendering of 4-level hierarchy
- [ ] T053 [US1] Implement expand/collapse logic in RequirementTree with local state per node
- [ ] T054 [US1] Add "Expand All" and "Collapse All" buttons to Sidebar component header
- [ ] T055 [US1] Implement real-time search filtering in RequirementTree by ID and title text
- [ ] T056 [US1] Add visual hierarchy indicators (indentation, chevron icons) to RequirementTree nodes
- [ ] T057 [US1] Implement selected requirement highlighting in RequirementTree with active state
- [ ] T058 [US1] Create hooks/use-requirements.ts with React Query for requirements data fetching and caching

### Requirement Display Component

- [ ] T059 [P] [US1] Create components/RequirementHeader.tsx displaying ID, title, breadcrumb, and completion badge
- [ ] T060 [P] [US1] Create components/RequirementDetails.tsx showing description with bullet point rendering
- [ ] T061 [US1] Add weight percentage display to RequirementDetails component
- [ ] T062 [US1] Create collapsible context section in RequirementDetails with expand/collapse state

### Dashboard Integration

- [ ] T063 [US1] Create app/dashboard/page.tsx main evaluation dashboard with Sidebar + main content area
- [ ] T064 [US1] Implement requirement selection handler passing selected requirement to main view
- [ ] T065 [US1] Add loading skeletons for Sidebar and main content using Tailwind animation classes

**Checkpoint**: At this point, User Story 1 should be fully functional - users can navigate and view all requirements

---

## Phase 5: User Story 2 - Compare Supplier Responses for Single Requirement (Priority: P1) 🎯 MVP Core

**Goal**: Display all supplier responses side-by-side for selected requirement with AI analysis visible

**Independent Test**: Select a requirement and view 4-10 supplier responses in list format showing name, preview, AI score, and status badge. Expand any response to view full text and AI commentary. All responses remain aligned for comparison.

### Database API for Responses

- [ ] T066 Create app/api/rfps/[rfpId]/responses/route.ts GET endpoint with optional requirementId filter
- [ ] T067 Create app/api/responses/[responseId]/route.ts GET endpoint for single response details
- [ ] T068 Add getResponsesForRequirement() function to lib/supabase/queries.ts with supplier join
- [ ] T069 Create hooks/use-responses.ts with React Query for responses data fetching

### Supplier Comparison View

- [ ] T070 [P] [US2] Create components/ComparisonView.tsx container component for supplier response list
- [ ] T071 [US2] Create components/SupplierResponseCard.tsx with collapsed view showing name, preview (2 lines), AI score, status badge
- [ ] T072 [US2] Implement expand/collapse toggle in SupplierResponseCard with chevron icon animation
- [ ] T073 [US2] Add expanded view in SupplierResponseCard with full response text in scrollable textarea
- [ ] T074 [US2] Display AI commentary in expanded view with scrollable area and proper formatting
- [ ] T075 [US2] Add "Copy" button for AI commentary using navigator.clipboard API
- [ ] T076 [US2] Implement vertical alignment of supplier cards for easy comparison
- [ ] T077 [US2] Add loading and error states to ComparisonView for async data loading
- [ ] T078 [US2] Handle edge case: Display "No supplier responses available" when responses array is empty

### AI Score Display

- [ ] T079 [P] [US2] Create components/StarRating.tsx component displaying 1-5 stars as read-only (AI score)
- [ ] T080 [US2] Add AI score badge with "AI: X/5" format in SupplierResponseCard collapsed view

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can navigate requirements and compare all supplier responses

---

## Phase 6: User Story 3 - Manually Score and Flag Supplier Responses (Priority: P1) 🎯 MVP Complete

**Goal**: Enable evaluators to override AI scores, set compliance status, add comments, and mark responses as complete

**Independent Test**: Click stars to set manual score (0-5), select status from toggle group, add text to comment fields, check completion checkbox. All changes persist when navigating away and returning to the requirement.

### Response Update API

- [ ] T081 Create app/api/responses/[responseId]/route.ts PUT endpoint accepting ResponseUpdate payload
- [ ] T082 Implement validation in PUT route for score (0-5), status enum, and required fields
- [ ] T083 Add RLS policy check in PUT route to ensure user has evaluator/owner access to the RFP
- [ ] T084 Update last_modified_by field with current user ID in PUT route
- [ ] T085 Create hooks/use-response-mutation.ts with React Query useMutation for optimistic updates

### Manual Scoring UI

- [ ] T086 [P] [US3] Enhance components/StarRating.tsx to support interactive mode for manual scoring
- [ ] T087 [US3] Implement click handler on stars to set manual score (1-5) with visual feedback
- [ ] T088 [US3] Add "click again to reset" behavior when clicking currently selected star
- [ ] T089 [US3] Display manual score as "X/5" with distinct styling from AI score
- [ ] T090 [US3] Show final score (manual if set, else AI) prominently in SupplierResponseCard

### Status & Completion Controls

- [ ] T091 [P] [US3] Create components/StatusSwitch.tsx using ToggleGroup with 4 options (Pending/Pass/Partial/Fail)
- [ ] T092 [US3] Add semantic icons to StatusSwitch (Clock, CheckCircle, Zap, XCircle) using Lucide React
- [ ] T093 [US3] Implement color coding for each status (gray, green, blue, red) with dark mode support
- [ ] T094 [US3] Add response completion checkbox to SupplierResponseCard header
- [ ] T095 [P] [US3] Create components/RoundCheckbox.tsx with custom round styling and dashed border
- [ ] T096 [US3] Implement auto-check behavior: when status changes to non-Pending, check the checkbox automatically
- [ ] T097 [US3] Update requirement completion badge in RequirementHeader when all responses checked

### Comment Fields

- [ ] T098 [P] [US3] Add "Your Comment" textarea to expanded SupplierResponseCard view
- [ ] T099 [P] [US3] Add "Questions / Doubts" textarea to expanded SupplierResponseCard view
- [ ] T100 [US3] Implement auto-save debounced (500ms) for textarea changes using React hooks
- [ ] T101 [US3] Add character count indicator to textareas if length > 500 characters

### Persistence & Optimistic Updates

- [ ] T102 [US3] Implement optimistic UI updates in use-response-mutation for instant feedback
- [ ] T103 [US3] Add error handling and rollback logic if API call fails
- [ ] T104 [US3] Show toast notification on successful save and error states
- [ ] T105 [US3] Verify data persistence by navigating away and returning to requirement

**Checkpoint**: MVP is COMPLETE - users can view requirements, compare responses, and perform full evaluation workflow

---

## Phase 7: User Story 4 - Navigate Between Requirements During Evaluation (Priority: P2)

**Goal**: Enable sequential navigation through requirements without returning to sidebar

**Independent Test**: Use chevron buttons (<< >>) to move between requirements, observe counter (X/Y) updates, and verify breadcrumb reflects current position. First requirement disables <<, last requirement disables >>.

### Navigation Controls

- [ ] T106 [P] [US4] Create components/RequirementPagination.tsx with previous/next chevron buttons
- [ ] T107 [US4] Add requirement counter display (X/Y format) showing current position in list
- [ ] T108 [US4] Implement next button handler to load next requirement with responses
- [ ] T109 [US4] Implement previous button handler to load previous requirement with responses
- [ ] T110 [US4] Disable previous button when on first requirement (gray out, cursor not-allowed)
- [ ] T111 [US4] Disable next button when on last requirement (gray out, cursor not-allowed)
- [ ] T112 [US4] Update RequirementHeader breadcrumb automatically when navigating
- [ ] T113 [US4] Preserve scroll position at top when navigating between requirements
- [ ] T114 [US4] Add keyboard shortcuts (arrow keys) for previous/next navigation

### Navigation Data Management

- [ ] T115 [US4] Create lib/navigation-utils.ts with functions to get next/previous requirement IDs from tree
- [ ] T116 [US4] Update hooks/use-requirements.ts to include flat list of requirement IDs in hierarchical order
- [ ] T117 [US4] Implement navigation history tracking in session storage for back/forward behavior

**Checkpoint**: All P1 and P2 features complete - users have full evaluation workflow with efficient navigation

---

## Phase 8: User Story 5 - Track Evaluation Progress (Priority: P2)

**Goal**: Visual indicators showing which requirements have been fully evaluated

**Independent Test**: Check all supplier responses for a requirement and observe completion badge change from gray clock to green checkmark. View sidebar tree and see completion badges on all requirements.

### Completion Badge Logic

- [ ] T118 [P] [US5] Create components/CompletionBadge.tsx with two states: complete (green check) and pending (gray clock)
- [ ] T119 [US5] Add dashed border styling to pending badge to match mockup design
- [ ] T120 [US5] Implement completion calculation logic: all responses checked = complete
- [ ] T121 [US5] Display completion badge in RequirementHeader next to title
- [ ] T122 [US5] Display completion badge in RequirementTree for each requirement node
- [ ] T123 [US5] Add real-time update of completion badge when response checkbox state changes
- [ ] T124 [US5] Create database query to calculate completion percentage for entire RFP
- [ ] T125 [US5] Display overall RFP completion percentage in dashboard header (e.g., "65% Complete")

**Checkpoint**: Progress tracking fully functional - evaluators can see completion status at requirement and RFP levels

---

## Phase 9: User Story 6 - View Requirement Context from RFP Document (Priority: P3)

**Goal**: Provide access to original RFP context explaining requirement background

**Independent Test**: Click context section to expand/collapse, view 3-4 paragraphs of contextual text, and click "Open in PDF" button to view source document in new tab.

### Context Display

- [ ] T126 [P] [US6] Create components/ContextSection.tsx with collapsible header and content area
- [ ] T127 [US6] Implement expand/collapse animation using Tailwind transitions
- [ ] T128 [US6] Display context text with proper paragraph formatting (3-4 paragraphs)
- [ ] T129 [US6] Add "Open in PDF" button linking to pdfUrl field from requirement data
- [ ] T130 [US6] Handle missing context gracefully with "No context available" message
- [ ] T131 [US6] Implement scroll-to-context behavior when expanding from collapsed state
- [ ] T132 [US6] Store collapse/expand preference in local storage per user

### PDF Integration

- [ ] T133 [US6] Add PDF URL validation and security check in requirement display logic
- [ ] T134 [US6] Open PDF in new tab with proper window.open() configuration
- [ ] T135 [US6] Handle missing pdfUrl by disabling "Open in PDF" button with tooltip

**Checkpoint**: Context feature complete - evaluators can access RFP background information when needed

---

## Phase 10: User Story 7 - Switch Between Dark and Light Themes (Priority: P3)

**Goal**: Allow users to toggle between dark and light color schemes

**Independent Test**: Click theme toggle icon in navbar and verify entire interface switches between dark/light modes with proper contrast maintained across all components.

### Theme Toggle Implementation

- [ ] T136 [P] [US7] Create components/ThemeToggle.tsx with sun/moon icon button
- [ ] T137 [US7] Integrate next-themes useTheme hook for theme state management
- [ ] T138 [US7] Implement theme toggle handler switching between 'light' and 'dark' modes
- [ ] T139 [US7] Add theme toggle button to Navbar component in top-right corner
- [ ] T140 [US7] Persist theme preference to localStorage via next-themes

### Dark Mode Styling

- [ ] T141 [P] [US7] Audit all components for dark: variant classes in Tailwind
- [ ] T142 [US7] Update Sidebar with dark:bg-slate-900 for consistent dark appearance
- [ ] T143 [US7] Update ComparisonView cards with dark:bg-slate-800 backgrounds
- [ ] T144 [US7] Update RequirementHeader breadcrumb with dark mode text colors
- [ ] T145 [US7] Update StatusSwitch badges with proper dark mode contrast
- [ ] T146 [US7] Update all textareas and inputs with dark mode styling
- [ ] T147 [US7] Verify dark mode contrast ratios meet WCAG AA standards (4.5:1 for text)
- [ ] T148 [US7] Test theme switching with all UI components visible to catch edge cases

**Checkpoint**: Theme switching complete - application supports both light and dark modes throughout

---

## Phase 11: RFP User Assignment & Access Control (Priority: P2)

**Goal**: Enable organization admins to assign specific evaluators to individual RFPs for granular access control

**Independent Test**: Admin assigns users to an RFP with different access levels (owner/evaluator/viewer), assigned users can access the RFP, non-assigned users within the same organization cannot see the RFP.

### RFP Assignment API

- [ ] T149 Create app/api/rfps/[rfpId]/assignments/route.ts with GET (list assignments) and POST (assign user)
- [ ] T150 Create app/api/rfps/[rfpId]/assignments/[userId]/route.ts DELETE endpoint to remove assignment
- [ ] T151 Add RLS policy check in assignments routes to verify requester is owner/admin
- [ ] T152 Update app/api/rfps/route.ts GET to filter RFPs by user assignments via join query

### RFP Assignment UI

- [ ] T153 [P] Create components/RFPAssignmentModal.tsx for assigning users to RFP
- [ ] T154 Create components/RFPAssignmentList.tsx displaying current assignments with access levels
- [ ] T155 Implement user search/select dropdown in RFPAssignmentModal with organization members
- [ ] T156 Add access level selector (owner/evaluator/viewer) in RFPAssignmentModal
- [ ] T157 Add "Manage Access" button to RFP dashboard for owners/admins
- [ ] T158 Implement assignment creation with validation and error handling
- [ ] T159 Implement assignment removal with confirmation dialog

### RFP List & Access Control

- [ ] T160 Create app/dashboard/rfps/page.tsx for listing user's accessible RFPs
- [ ] T161 Filter RFP list by current organization context from OrganizationSwitcher
- [ ] T162 Display access level badge (owner/evaluator/viewer) on each RFP card
- [ ] T163 Add "No RFPs available" empty state when user has no assignments
- [ ] T164 Implement RFP creation flow (admin/evaluator only) with auto-assignment as owner

**Checkpoint**: RFP access control complete - users can only access assigned RFPs, admins can manage assignments

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final quality touches

### Performance & Optimization

- [ ] T165 [P] Implement React.memo for RequirementTree nodes to prevent unnecessary re-renders
- [ ] T166 [P] Add pagination or virtualization to SupplierResponseCard list if > 15 responses
- [ ] T167 [P] Optimize Supabase queries with proper indexes on frequently queried columns
- [ ] T168 Implement lazy loading for requirement context section (fetch on expand)
- [ ] T169 Add React Query cache prefetching for next/previous requirements during navigation
- [ ] T170 Optimize bundle size by analyzing with @next/bundle-analyzer

### Error Handling & Edge Cases

- [ ] T171 [P] Create components/ErrorBoundary.tsx for React error boundary with fallback UI
- [ ] T172 Add error handling for failed Supabase queries with retry logic
- [ ] T173 Handle network offline state with offline indicator in Navbar
- [ ] T174 Implement graceful degradation when AI scores/comments are missing
- [ ] T175 Add validation for extremely long response texts (> 50,000 characters)
- [ ] T176 Handle malformed requirement hierarchy (missing parents) with warning badges

### Accessibility (A11y)

- [ ] T177 [P] Audit all components for proper ARIA labels and roles
- [ ] T178 Add keyboard navigation support (Tab, Enter, Escape) to all interactive elements
- [ ] T179 Ensure all buttons and links have visible focus indicators
- [ ] T180 Add screen reader announcements for requirement navigation and status changes
- [ ] T181 Verify color contrast ratios meet WCAG AA standards in both themes
- [ ] T182 Add skip-to-content link for keyboard navigation users

### Documentation & Developer Experience

- [ ] T183 [P] Create README.md with project setup instructions and architecture overview
- [ ] T184 [P] Document API endpoints in contracts/api.yaml with request/response examples
- [ ] T185 [P] Create CONTRIBUTING.md with code style guidelines and PR process
- [ ] T186 Add JSDoc comments to all utility functions in lib/ directory
- [ ] T187 Create quickstart.md validation script to verify setup steps
- [ ] T188 Add TypeScript strict mode and fix any type errors

### Security Hardening

- [ ] T189 [P] Audit all API routes for proper authentication/authorization checks
- [ ] T190 Implement rate limiting on API routes using middleware
- [ ] T191 Add input sanitization for user-generated content (comments, questions)
- [ ] T192 Verify RLS policies prevent cross-organization data leaks with test queries
- [ ] T193 Add CSRF protection to form submissions
- [ ] T194 Review and update .env.example with security best practices

### Final QA & Deployment Prep

- [ ] T195 [P] Create seed data script in supabase/seed.sql with sample RFP, requirements, suppliers, responses
- [ ] T196 Test complete evaluation workflow end-to-end with seed data
- [ ] T197 Verify all 7 user stories work independently as specified
- [ ] T198 Test multi-tenant isolation: create 2 organizations, verify data separation
- [ ] T199 Test responsive behavior on different screen sizes (1920px, 1440px, 1280px)
- [ ] T200 Create production environment configuration for Vercel deployment
- [ ] T201 Configure Supabase production project with proper RLS policies enabled
- [ ] T202 Run security audit with npm audit and fix vulnerabilities
- [ ] T203 Final code review and refactoring for maintainability
- [ ] T204 Create deployment checklist and rollback plan

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **Auth & Multi-Tenant (Phase 3)**: Depends on Foundational completion - BLOCKS all feature work
- **User Stories (Phases 4-10)**: All depend on Auth & Multi-Tenant completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5 → US6 → US7)
- **RFP Assignment (Phase 11)**: Depends on US1-US3 being complete
- **Polish (Phase 12)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Foundational + Auth complete - No dependencies on other stories
- **User Story 2 (P1)**: Depends on US1 (needs requirement selection) - But independently testable
- **User Story 3 (P1)**: Depends on US2 (needs response display) - But independently testable
- **User Story 4 (P2)**: Depends on US1 (uses requirement tree) - Independently testable
- **User Story 5 (P2)**: Depends on US3 (uses completion state) - Independently testable
- **User Story 6 (P3)**: Depends on US1 (adds to requirement display) - Independently testable
- **User Story 7 (P3)**: No dependencies - Affects all components - Independently testable

### Within Each User Story

- API routes before frontend components that consume them
- Foundational hooks (use-requirements, use-responses) before components
- UI primitives (shadcn/ui) before custom components
- Base components before composite components
- Core functionality before optimization and error handling

### Parallel Opportunities

- **Phase 1 (Setup)**: Tasks T002-T010 can all run in parallel
- **Phase 2 (Foundational)**: Tasks T015-T019 (type definitions) can run in parallel
- **Phase 2 (Foundational)**: Tasks T024-T031 (shadcn/ui components) can all run in parallel
- **Phase 3 (Auth)**: Tasks T032-T033 (login/register pages) can run in parallel
- **Phase 3 (Orgs)**: Tasks T040-T044 (org API routes) can run in parallel after auth API complete
- **User Story 1**: Tasks T051-T052, T059-T061 (UI components) can run in parallel after API routes
- **User Story 2**: Tasks T070-T080 (comparison UI) can run in parallel after response API complete
- **User Story 3**: Tasks T086-T099 (scoring UI components) can run in parallel
- **User Story 4**: Tasks T106-T107 (navigation UI) can run in parallel
- **User Story 5**: Tasks T118-T119 (badge UI) can run in parallel
- **User Story 6**: Tasks T126-T129 (context UI) can run in parallel
- **User Story 7**: Tasks T136-T148 (theming) can be distributed across components
- **Phase 12 (Polish)**: Many tasks marked [P] can run in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# After API routes T047-T050 are complete, launch UI components in parallel:

# Developer A:
Task T051: "Create components/Sidebar.tsx with collapsible sidebar container and search input"
Task T059: "Create components/RequirementHeader.tsx displaying ID, title, breadcrumb, and completion badge"

# Developer B:
Task T052: "Create components/RequirementTree.tsx component with recursive rendering of 4-level hierarchy"
Task T060: "Create components/RequirementDetails.tsx showing description with bullet point rendering"

# Both developers can work simultaneously as these are different files with no conflicts
```

---

## Implementation Strategy

### MVP First (User Stories 1-3 Only)

1. Complete Phase 1: Setup → ~10 tasks, ~2-4 hours
2. Complete Phase 2: Foundational (CRITICAL) → ~21 tasks, ~1-2 days
3. Complete Phase 3: Auth & Multi-Tenant → ~15 tasks, ~1-2 days
4. Complete Phase 4: User Story 1 (View Requirements) → ~19 tasks, ~2-3 days
5. Complete Phase 5: User Story 2 (Compare Responses) → ~15 tasks, ~2-3 days
6. Complete Phase 6: User Story 3 (Manual Scoring) → ~25 tasks, ~3-4 days
7. **STOP and VALIDATE**: Test complete evaluation workflow end-to-end
8. Deploy MVP to staging for stakeholder review

**MVP Delivers**: Evaluators can log in, view hierarchical requirements, compare supplier responses with AI analysis, manually score and flag responses, and track completion. This represents the core value proposition.

### Incremental Delivery (Add P2 Features)

1. Complete Setup + Foundational + Auth → Foundation ready (~3-5 days)
2. Add User Stories 1-3 → Test independently → Deploy MVP (Core evaluation workflow complete)
3. Add User Story 4 (Navigation) → Test independently → Deploy v1.1 (Improved workflow efficiency)
4. Add User Story 5 (Progress Tracking) → Test independently → Deploy v1.2 (Better task management)
5. Add Phase 11 (RFP Assignments) → Test independently → Deploy v1.3 (Better access control)
6. Each increment adds value without breaking previous features

### Full Feature Set (Add P3 Features)

7. Add User Story 6 (Context) → Test independently → Deploy v1.4 (Enhanced context)
8. Add User Story 7 (Dark Mode) → Test independently → Deploy v1.5 (Improved UX)
9. Complete Phase 12 (Polish) → Test all stories → Deploy v2.0 (Production-ready)

### Parallel Team Strategy

With 3 developers after foundational phase complete:

1. **Team completes Setup + Foundational + Auth together** (~1 week)
2. Once Auth & Foundational done:
   - **Developer A**: User Story 1 (Requirements Hierarchy)
   - **Developer B**: User Story 2 (Response Comparison) - starts after US1 T058-T065 complete
   - **Developer C**: User Story 3 (Manual Scoring) - starts after US2 T070-T080 complete
3. After MVP (US1-3):
   - **Developer A**: User Story 4 (Navigation) + User Story 6 (Context)
   - **Developer B**: User Story 5 (Progress) + Phase 11 (Assignments)
   - **Developer C**: User Story 7 (Theming) + Phase 12 (Polish)
4. Stories complete and integrate independently

**Estimated Timeline**:
- **MVP (US1-3)**: ~2-3 weeks with 3 developers
- **Full P1+P2 features**: ~3-4 weeks with 3 developers
- **Production-ready (all features + polish)**: ~4-6 weeks with 3 developers

---

## Notes

- **[P] tasks**: Different files, no dependencies - can run in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **Independent testing**: Each user story should be completable and testable on its own
- **Commit frequency**: Commit after each task or logical group of 2-3 related tasks
- **Checkpoints**: Stop at phase checkpoints to validate story independently before proceeding
- **Avoid**: Vague tasks, same file conflicts, cross-story dependencies that break independence
- **Multi-tenant**: All features must respect organization boundaries via RLS policies
- **Performance**: Target <2s navigation, <500ms search filtering for 200 requirements
- **Accessibility**: Maintain WCAG AA contrast ratios and keyboard navigation throughout
- **Dark mode**: Test all new components in both light and dark themes

---

## Task Summary

- **Total Tasks**: 204
- **Setup Phase**: 10 tasks
- **Foundational Phase**: 21 tasks (CRITICAL BLOCKER)
- **Auth & Multi-Tenant**: 15 tasks (BLOCKER)
- **User Story 1 (P1)**: 19 tasks
- **User Story 2 (P1)**: 15 tasks
- **User Story 3 (P1)**: 25 tasks
- **User Story 4 (P2)**: 12 tasks
- **User Story 5 (P2)**: 8 tasks
- **User Story 6 (P3)**: 10 tasks
- **User Story 7 (P3)**: 13 tasks
- **RFP Assignments (P2)**: 16 tasks
- **Polish Phase**: 40 tasks

**MVP Scope**: Phases 1-6 (User Stories 1-3) = **~105 tasks** for core evaluation workflow
**Full P1+P2**: + Phase 7-8 + Phase 11 = **~151 tasks** for efficient evaluation with access control
**Production-Ready**: All phases = **204 tasks** for complete feature-rich application

**Parallelizable Tasks**: ~60 tasks marked [P] can be distributed across multiple developers
