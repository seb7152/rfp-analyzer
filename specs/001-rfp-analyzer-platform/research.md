# Research: RFP Analyzer Platform

**Date**: 2025-11-06  
**Feature**: RFP Analyzer Platform  
**Status**: Complete

## Overview

This document captures the research and technical decisions made during the planning phase. Since the technical stack was fully specified in EXPRESSION_DE_BESOIN_v2.md and verified through the working mockup, minimal additional research was needed. All technology choices are validated and justified below.

---

## Technology Decisions

### Decision 1: Next.js 14 with App Router

**Decision**: Use Next.js 14 with App Router for the full-stack application

**Rationale**:
- **Specified in requirements**: Explicitly listed as the frontend framework
- **Full-stack capability**: API Routes eliminate need for separate backend server
- **Server-side rendering**: Improves initial load performance for large requirement trees
- **File-based routing**: Simplifies project structure and route management
- **React 18 support**: Provides latest React features (concurrent rendering, suspense)
- **Vercel deployment**: Seamless deployment to specified hosting platform
- **TypeScript support**: First-class TypeScript integration

**Alternatives considered**:
- **Create React App (CRA)**: Lacks server-side rendering, no built-in API routes, deprecated
- **Remix**: Strong SSR but less ecosystem maturity, team unfamiliar
- **Vite + React**: Faster dev server but requires separate backend solution

**Validation**: Mockup already built with Next.js 14, demonstrating feasibility

---

### Decision 2: Supabase for Backend and Database

**Decision**: Use Supabase (PostgreSQL + client SDK) for data persistence and future auth

**Rationale**:
- **Specified in requirements**: Explicitly listed as the backend solution
- **PostgreSQL foundation**: Robust relational database for hierarchical requirements
- **Real-time subscriptions**: Future V2 capability for collaborative features
- **Built-in auth**: Supabase Auth ready when needed for V2
- **Row Level Security (RLS)**: Future security layer for multi-tenant access
- **Auto-generated TypeScript types**: Type-safe database access
- **Cloud-hosted**: No infrastructure management needed
- **Free tier**: Sufficient for MVP (2-3 users, 4-5 RFPs/year)

**Alternatives considered**:
- **Firebase**: Less SQL-friendly, more complex for relational data
- **MongoDB**: Document model doesn't fit hierarchical requirements well
- **Direct PostgreSQL**: Requires hosting, auth, and API layer setup

**Validation**: PostgreSQL perfectly supports recursive CTEs for hierarchical queries

---

### Decision 3: Tailwind CSS + shadcn/ui for Styling

**Decision**: Use Tailwind CSS 3.x with shadcn/ui component library

**Rationale**:
- **Specified in requirements**: Explicitly listed as the styling approach
- **Utility-first**: Rapid UI development with inline styles
- **Dark mode support**: Built-in dark mode via class strategy
- **shadcn/ui components**: Copy-paste components, full customization control
- **Type-safe**: Works seamlessly with TypeScript
- **No runtime cost**: Styles compiled at build time
- **Consistent design**: Predefined spacing, colors via Tailwind config
- **Mockup validation**: Entire mockup built with this stack successfully

**Alternatives considered**:
- **CSS Modules**: More boilerplate, harder to maintain consistency
- **Styled Components**: Runtime cost, complexity for simple UX
- **Material-UI**: Too opinionated, doesn't match Vercel aesthetic

**Validation**: Mockup demonstrates full design system feasibility

---

### Decision 4: Jest + React Testing Library for Unit Tests

**Decision**: Use Jest and React Testing Library for component and hook testing

**Rationale**:
- **Industry standard**: Most widely used React testing tools
- **User-centric testing**: RTL encourages testing user behavior, not implementation
- **Next.js integration**: Official Next.js testing setup supports Jest
- **Snapshot testing**: Useful for UI regression detection
- **Coverage reporting**: Built-in code coverage tracking
- **Async testing**: Excellent support for async state updates

**Alternatives considered**:
- **Vitest**: Faster but newer, less Next.js documentation
- **Testing Library only**: Needs a test runner like Jest anyway
- **Cypress component testing**: Better for E2E, overkill for unit tests

**Validation**: Standard for Next.js projects, well-documented

---

### Decision 5: Playwright for End-to-End Tests

**Decision**: Use Playwright for end-to-end evaluation workflow tests

**Rationale**:
- **Multi-browser support**: Test Chrome, Firefox, Safari from one codebase
- **Fast and reliable**: Fewer flaky tests than alternatives
- **Modern API**: Async/await, auto-waiting for elements
- **Visual comparison**: Screenshot comparison for UI regression
- **Network interception**: Can mock Supabase responses if needed
- **Debugging tools**: Time-travel debugging, trace viewer
- **Next.js compatibility**: Works perfectly with Next.js dev/prod modes

**Alternatives considered**:
- **Cypress**: More established but slower, harder to debug
- **Puppeteer**: Chrome-only, less features than Playwright
- **Selenium**: Outdated API, flaky, slow

**Validation**: Recommended for modern web apps, active development

---

### Decision 6: Supabase Migrations for Database Schema

**Decision**: Use Supabase CLI migrations for database schema management

**Rationale**:
- **Version control**: SQL migrations tracked in Git
- **Reproducible**: Apply same schema across dev, staging, prod
- **Rollback support**: Can revert migrations if needed
- **Team collaboration**: All team members get same schema
- **Direct SQL**: Full PostgreSQL feature access (CTEs, indexes, triggers)
- **Supabase integration**: Auto-generates TypeScript types from schema

**Alternatives considered**:
- **Prisma ORM**: Abstraction layer, less PostgreSQL-specific features
- **TypeORM**: Complex configuration, overkill for MVP
- **Manual SQL**: No version control, error-prone

**Validation**: Official Supabase approach, proven in production

---

### Decision 7: Vercel for Deployment

**Decision**: Deploy to Vercel (frontend + API Routes)

**Rationale**:
- **Specified in requirements**: Explicitly listed as deployment platform
- **Next.js native**: Built by creators of Next.js, optimal integration
- **Edge network**: Fast global content delivery
- **Automatic previews**: PR preview deployments
- **Environment variables**: Secure secrets management
- **Zero config**: Push to Git, auto-deploys
- **Free tier**: Sufficient for MVP scope

**Alternatives considered**:
- **AWS Amplify**: More complex setup, less Next.js-optimized
- **Netlify**: Good but less Next.js focus than Vercel
- **Self-hosted**: Requires infrastructure management

**Validation**: Industry standard for Next.js apps

---

## Architecture Patterns

### Pattern 1: Server Components + Client Components Separation

**Decision**: Use React Server Components for data fetching, Client Components for interactivity

**Rationale**:
- **Next.js 14 default**: App Router uses Server Components by default
- **Performance**: Reduce JavaScript bundle sent to browser
- **Data fetching**: Fetch data closer to data source (Supabase)
- **SEO**: Server-rendered content for better search indexing
- **Selective hydration**: Only interactive components need JavaScript

**Implementation**:
- Sidebar, ComparisonView: Client Components (use state, event handlers)
- Layout, page wrappers: Server Components (fetch initial data)
- API calls: From Server Components when possible, Client Components when user-triggered

---

### Pattern 2: API Route Handlers for Mutations

**Decision**: Use Next.js API Routes for all data mutations (PUT, POST, DELETE)

**Rationale**:
- **Security**: Supabase credentials stay on server, not exposed to browser
- **Validation**: Centralized request validation before database writes
- **Logging**: Single point for audit logging (future requirement)
- **Consistency**: All mutations go through same code path
- **Testing**: Easier to test API endpoints than inline mutations

**Implementation**:
- GET operations: Direct Supabase client from Server Components
- PUT/POST/DELETE: Via API routes (e.g., PUT /api/responses/:id)

---

### Pattern 3: Optimistic UI Updates

**Decision**: Use optimistic updates for scores, statuses, and checkboxes

**Rationale**:
- **Responsiveness**: Instant feedback on user actions (Success Criteria SC-004: <2s navigation)
- **UX expectation**: Users expect immediate star rating response
- **Network resilience**: UI updates even if network slow
- **Revert on error**: Can rollback optimistic update if API fails

**Implementation**:
- Update local state immediately on user action
- Send API request in background
- Revert if request fails, show error toast

---

### Pattern 4: Hierarchical Data Loading with React Query

**Decision**: Use TanStack Query (React Query) for data fetching and caching

**Rationale**:
- **Caching**: Avoid re-fetching requirement tree on every navigation
- **Stale-while-revalidate**: Show cached data immediately, update in background
- **Optimistic updates**: Built-in support for optimistic mutations
- **Loading states**: Automatic loading/error state management
- **Prefetching**: Can prefetch next/previous requirements for faster navigation

**Implementation**:
- useQuery for requirements tree, supplier responses
- useMutation for response updates
- Cache key structure: ['rfp', rfpId], ['requirement', reqId], ['responses', rfpId, reqId]

---

## Best Practices Research

### Next.js 14 App Router Best Practices

**Research**: Official Next.js documentation and community patterns

**Key Findings**:
- Use `'use client'` directive only for components that need interactivity
- Avoid prop drilling by fetching data in each Server Component
- Use React Context for theme state (client-side only)
- Leverage route groups `(auth)` for shared layouts
- Use `loading.tsx` for Suspense fallbacks
- Implement error boundaries with `error.tsx` files

**Application to RFP Analyzer**:
- Theme Context for dark/light mode
- Loading skeletons for requirement tree and comparison view
- Error boundaries for Supabase connection failures

---

### Supabase Row Level Security (RLS) for V2

**Research**: Supabase RLS documentation and multi-tenant patterns

**Key Findings**:
- RLS enforces access control at database level
- Policies can check auth.uid() for user-based access
- Can implement organization-level access with user_organizations join table
- MVP: Disable RLS, rely on trust model (2-3 person team)
- V2: Enable RLS, policies like `organization_id = auth.jwt() ->> 'organization_id'`

**Application to RFP Analyzer**:
- MVP: No RLS, shared access to all data
- V2 migration path documented for multi-tenant RLS

---

### PostgreSQL Recursive CTEs for Hierarchical Data

**Research**: PostgreSQL documentation on recursive queries

**Key Findings**:
- `WITH RECURSIVE` can traverse parent-child relationships
- Can fetch entire tree in single query vs N+1 problem
- Can calculate aggregates (e.g., completion percentage) in query
- Performance: Add index on parent_id column

**Application to RFP Analyzer**:
```sql
WITH RECURSIVE requirement_tree AS (
  SELECT * FROM requirements WHERE parent_id IS NULL
  UNION ALL
  SELECT r.* FROM requirements r
  INNER JOIN requirement_tree rt ON r.parent_id = rt.id
)
SELECT * FROM requirement_tree ORDER BY level, position;
```

---

### Dark Mode Implementation with Tailwind

**Research**: Tailwind CSS dark mode documentation and Next.js theme patterns

**Key Findings**:
- Use class strategy: `<html class="dark">` toggles dark mode
- `dark:` prefix for dark mode styles: `dark:bg-slate-950`
- next-themes package for theme persistence (localStorage)
- Avoid flash of incorrect theme with `<ThemeProvider>`

**Application to RFP Analyzer**:
- Install next-themes: `npm install next-themes`
- Wrap app in `<ThemeProvider attribute="class">`
- Theme toggle button updates theme context
- All components styled with `dark:` variants

---

### shadcn/ui Component Customization

**Research**: shadcn/ui documentation and component patterns

**Key Findings**:
- Components copied to project, full ownership
- Customize via `tailwind.config.ts` theme variables
- Use `cn()` utility for conditional classes
- Radix UI primitives provide accessibility

**Application to RFP Analyzer**:
- Custom RoundCheckbox: Extend Checkbox primitive with border-dashed styles
- StatusSwitch: Use ToggleGroup with custom icons and colors
- All components support dark mode via theme variables

---

## Performance Optimization Research

### Large List Rendering (50-200 Requirements)

**Research**: React performance patterns for large lists

**Key Findings**:
- Virtualization (react-window) only needed for 1000+ items
- 200 items with proper key props performs fine
- Collapse by default: Only render visible nodes
- Lazy load response details: Don't fetch all responses upfront

**Application to RFP Analyzer**:
- Tree starts collapsed: Only 3 domain nodes visible initially
- Fetch responses only when requirement selected
- No virtualization needed for MVP (< 200 requirements)

---

### Search Performance (500ms target for 200 items)

**Research**: Client-side search optimization

**Key Findings**:
- 200 items: Linear search O(n) is fast enough
- Use `useMemo` to cache filtered results
- Debounce search input (300ms) to reduce re-renders
- Index by ID: O(1) lookup for direct navigation

**Application to RFP Analyzer**:
- Search filters pre-loaded requirement tree
- useMemo for filtered results
- No backend search needed for MVP

---

### Bundle Size Optimization

**Research**: Next.js bundle optimization

**Key Findings**:
- Analyze bundle: `npm run build` shows page sizes
- Code splitting: Next.js auto-splits per page
- Dynamic imports: Use `next/dynamic` for heavy components
- Tree shaking: Remove unused Tailwind classes via PurgeCSS

**Application to RFP Analyzer**:
- Dashboard page < 100KB JavaScript (target)
- Lucide icons: Import only used icons
- shadcn/ui: Only copy needed components

---

## Security Research

### Supabase API Key Exposure

**Research**: Supabase security best practices

**Key Findings**:
- Anon key is safe to expose (public key)
- Service key must stay server-side only (API routes)
- RLS policies enforce access even with anon key
- Environment variables: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY

**Application to RFP Analyzer**:
- MVP: Anon key in browser (no RLS)
- V2: Enable RLS before production multi-tenant

---

### SQL Injection Prevention

**Research**: Supabase client query safety

**Key Findings**:
- Supabase JS client uses parameterized queries
- No string concatenation of SQL
- TypeScript types prevent invalid queries
- Input validation still needed for business logic

**Application to RFP Analyzer**:
- Use Supabase `.select()`, `.insert()`, `.update()` methods
- Validate user input (scores 0-5, statuses in enum)
- No raw SQL from user input

---

## Open Questions Resolved

### Q: Should we implement real-time subscriptions for multi-user updates?
**A**: No, deferred to V2. MVP uses last-write-wins with optimistic updates. Supabase subscriptions ready when needed.

### Q: How to handle PDF context linking?
**A**: Store PDF URL and page number in requirement context. "Open in PDF" button opens URL in new tab. In-app PDF viewer deferred to V2.

### Q: Should we cache requirement tree in localStorage?
**A**: No, React Query cache is sufficient. Tree fetch is fast (<200ms) and tree doesn't change during evaluation. Avoid stale data issues.

### Q: TypeScript strict mode?
**A**: Yes, use strict mode for better type safety. Fix any type errors during implementation. Benefits outweigh migration cost.

---

## Implementation Priorities

Based on research, the recommended implementation order:

1. **Database schema and migrations** (Supabase)
2. **API routes for data mutations** (Next.js)
3. **Basic page structure** (App Router)
4. **Requirements tree component** (Sidebar)
5. **Comparison view** (main feature)
6. **Scoring and status UI** (interactive elements)
7. **Dark mode** (theme system)
8. **Testing** (Jest + Playwright)
9. **Deployment** (Vercel)

---

## Conclusion

All technology choices are validated and aligned with the specified stack (Next.js 14, Supabase, Tailwind, shadcn/ui). The mockup proves feasibility. No blockers identified. Ready to proceed to Phase 1: Data Model and Contracts.
