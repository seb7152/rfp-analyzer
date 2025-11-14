# Implementation Plan: RFP Analyzer Platform

**Branch**: `001-rfp-analyzer-platform` | **Date**: 2025-11-06 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/001-rfp-analyzer-platform/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The RFP Analyzer Platform enables evaluation teams to compare and score supplier responses to structured RFP requirements. The primary workflow involves navigating a 4-level hierarchical tree of requirements, viewing all supplier responses side-by-side for each requirement, and adding manual scores, compliance statuses, and comments. The platform is a full-stack web application built with Next.js 14, using Supabase for data persistence and integrating with external N8N workflows that pre-process PDFs and generate AI analysis.

## Technical Context

**Language/Version**: TypeScript 5.x / JavaScript ES2022+ with Next.js 14 (React 18)  
**Primary Dependencies**:

- Frontend: Next.js 14, React 18, Tailwind CSS 3.x, shadcn/ui components, Lucide React (icons)
- Backend: Next.js API Routes, Supabase JS Client 2.x, PostgreSQL 15+ (via Supabase)
- External: N8N workflows (PDF parsing, AI scoring - out of scope for this implementation)

**Storage**: PostgreSQL 15+ via Supabase (cloud-hosted)  
**Testing**: Jest + React Testing Library (unit), Playwright (E2E), Vitest (optional for faster unit tests)  
**Target Platform**: Modern web browsers (Chrome, Firefox, Edge, Safari) on desktop/laptop  
**Deployment**: Vercel (frontend + API routes), Supabase Cloud (database + auth future)  
**Project Type**: Web application (frontend + backend)  
**Performance Goals**:

- Page load < 2s on 3G connection
- Search filtering < 500ms for 200 requirements
- Navigation between requirements < 2s
- Support 50-200 requirements per RFP
- Handle 10,000+ character response texts

**Constraints**:

- Multi-tenant from day 1: Organization-based data isolation with Row Level Security (RLS)
- User authentication via Supabase Auth (email/password, OAuth providers)
- Role-based access control: admin, evaluator, viewer roles per organization
- RFP-level access control: assign specific evaluators to RFPs
- No real-time collaborative editing (last-write-wins approach for MVP)
- No PDF parsing or AI analysis in-app (handled by N8N)
- No mobile optimization in MVP (desktop-first)
- Dark mode support mandatory
- Must work with pre-processed data from N8N workflows

**Scale/Scope**:

- Multiple organizations (companies/business units) in single database
- 10-50 users per organization (free tier: 10 users)
- 2-3 concurrent evaluators per RFP
- 5-20 active RFPs per organization (free tier: 5 RFPs)
- 50-200 requirements per RFP
- 4-10 suppliers per RFP
- 200-2000 total responses per RFP evaluation
- Support for consultant users belonging to multiple organizations

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

### Pre-Design Check (Phase 0)

**Status**: ⚠️ No constitution defined yet

The constitution file (`.specify/memory/constitution.md`) is currently empty/template. Since this is the first feature being specified, no gates can be evaluated. Proceeding with best practices:

- ✅ Clear separation of concerns (N8N for processing, app for evaluation UI)
- ✅ Technology choices documented and justified
- ✅ Testing strategy to be defined in Phase 1
- ✅ API contracts to be generated in Phase 1

### Post-Design Check (After Phase 1)

**Status**: ✅ PASS (No constitution to violate)

**Design Artifacts Completed**:

- ✅ [research.md](./research.md) - All technology decisions documented with rationale
- ✅ [data-model.md](./data-model.md) - Complete database schema with indexes and validation
- ✅ [contracts/api.yaml](./contracts/api.yaml) - OpenAPI 3.0 spec for all API routes
- ✅ [quickstart.md](./quickstart.md) - Developer onboarding guide
- ✅ [CLAUDE.md](../CLAUDE.md) - Agent context updated with tech stack

**Best Practices Applied**:

- ✅ **Separation of Concerns**: Clear boundaries between frontend components, API routes, and database
- ✅ **Type Safety**: TypeScript strict mode, auto-generated types from Supabase schema
- ✅ **Testing Strategy**: Unit tests (Jest + RTL), E2E tests (Playwright), integration tests for API routes
- ✅ **API Design**: RESTful conventions, proper status codes, error handling
- ✅ **Database Design**: Normalized schema, proper indexes, foreign key constraints
- ✅ **Performance**: Recursive CTEs for hierarchy, React Query for caching, optimistic updates
- ✅ **Security**: Environment variables for secrets, Supabase RLS ready for V2
- ✅ **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation (via shadcn/ui)
- ✅ **Documentation**: Comprehensive guides for developers, clear API contracts

**Note**: After this feature is implemented and team establishes patterns, a constitution should be created to codify these practices for future features.

## Project Structure

### Documentation (this feature)

```text
specs/001-rfp-analyzer-platform/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api.yaml        # OpenAPI 3.0 spec for Next.js API routes
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application structure (Next.js 14 App Router)
app/
├── (auth)/              # Future: Auth-protected routes
│   └── dashboard/       # Main evaluation dashboard
│       └── page.tsx
├── api/                 # Next.js API routes
│   ├── rfps/
│   │   └── [id]/
│   │       ├── route.ts              # GET /api/rfps/:id
│   │       ├── requirements/
│   │       │   └── route.ts          # GET /api/rfps/:id/requirements
│   │       └── responses/
│   │           └── route.ts          # GET /api/rfps/:id/responses
│   ├── requirements/
│   │   └── [id]/
│   │       └── route.ts              # GET /api/requirements/:id
│   └── responses/
│       └── [id]/
│           └── route.ts              # PUT /api/responses/:id (update scores, comments)
├── layout.tsx           # Root layout with theme provider
├── page.tsx            # Landing page (redirects to dashboard)
└── globals.css         # Tailwind base styles

components/
├── ui/                  # shadcn/ui primitives
│   ├── badge.tsx
│   ├── button.tsx
│   ├── input.tsx
│   ├── textarea.tsx
│   ├── breadcrumb.tsx
│   ├── scroll-area.tsx
│   ├── tabs.tsx
│   └── toggle-group.tsx
├── custom/              # Custom components
│   ├── round-checkbox.tsx
│   └── status-switch.tsx
├── Navbar.tsx           # Top navigation with tabs and theme toggle
├── Sidebar.tsx          # Requirements tree navigation
└── ComparisonView.tsx   # Main supplier comparison interface

lib/
├── supabase/
│   ├── client.ts        # Supabase client initialization
│   ├── types.ts         # TypeScript types from database schema
│   └── queries.ts       # Reusable database queries
├── utils.ts             # Utility functions (cn, formatters)
└── constants.ts         # App constants (status values, etc.)

hooks/
├── use-requirements.ts  # React hooks for requirements data
├── use-responses.ts     # React hooks for responses data
└── use-theme.ts         # Theme management hook

types/
├── rfp.ts              # RFP type definitions
├── requirement.ts      # Requirement type definitions
├── supplier.ts         # Supplier type definitions
└── response.ts         # Response type definitions

public/
├── fonts/              # Custom fonts (if any)
└── images/             # Static assets

supabase/
├── migrations/         # Database migrations
│   └── 001_initial_schema.sql
└── seed.sql           # Seed data for development

tests/
├── unit/
│   ├── components/     # Component unit tests
│   ├── hooks/         # Hook tests
│   └── lib/           # Library function tests
├── integration/
│   └── api/           # API route integration tests
└── e2e/
    └── evaluation-flow.spec.ts  # End-to-end evaluation workflow

# Config files (repository root)
next.config.js          # Next.js configuration
tailwind.config.ts      # Tailwind CSS configuration
tsconfig.json          # TypeScript configuration
package.json           # Dependencies and scripts
.env.local             # Environment variables (Supabase URL, keys)
```

**Structure Decision**: Selected web application structure (Option 2 variant using Next.js App Router). This aligns with the documented tech stack (Next.js 14 + Supabase) and provides:

- Co-located frontend and backend (Next.js API Routes)
- Server-side rendering capabilities for better performance
- File-based routing via App Router
- Component organization following shadcn/ui patterns
- Clear separation between UI primitives, custom components, and business logic

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution defined yet, no violations to track.
