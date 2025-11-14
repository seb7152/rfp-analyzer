# Data Model: RFP Analyzer Platform

**Date**: 2025-11-06  
**Feature**: RFP Analyzer Platform  
**Status**: Complete

## Overview

This document defines the database schema for the RFP Analyzer Platform. The model supports hierarchical requirements (4 levels), multiple suppliers per RFP, and evaluation tracking with manual overrides of AI analysis.

---

## Entity-Relationship Diagram

```
┌──────────────────┐
│  Organization    │
└────────┬─────────┘
         │
         │ 1:N
         │
         ├────────────────────┬──────────────────┐
         │                    │                  │
         ▼                    ▼                  ▼
┌──────────────┐      ┌──────────┐      ┌──────────────────┐
│     User     │      │   RFP    │      │ User-Org Link    │
└──────┬───────┘      └────┬─────┘      │ (role assignment)│
       │                   │            └──────────────────┘
       │                   │ 1:N
       │                   │
       │                   ├─────────────────┐
       │                   │                 │
       │                   ▼                 ▼
       │            ┌──────────────┐   ┌──────────┐
       │            │ Requirement  │   │ Supplier │
       │            │ (hierarchical)│   └─────┬────┘
       │            └──────┬───────┘         │
       │                   │                 │
       │                   │ self-ref        │
       │                   │ parent_id       │
       │                   │                 │
       │                   ▼                 │
       │            ┌──────────────┐         │
       │            │ Requirement  │         │
       │            │  (child)     │         │
       │            └──────┬───────┘         │
       │                   │                 │
       │                   └─────────┬───────┘
       │                             │
       │                             │ N:M via Response
       │                             │
       │                             ▼
       │                       ┌──────────┐
       └───────────────────────┤ Response │ (last_modified_by)
                               └──────────┘
```

---

## Tables

### 1. `organizations`

Represents a company or business unit using the platform (multi-tenant isolation).

| Column              | Type         | Constraints                             | Description                                                 |
| ------------------- | ------------ | --------------------------------------- | ----------------------------------------------------------- |
| `id`                | UUID         | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique identifier                                           |
| `name`              | TEXT         | NOT NULL                                | Organization name (e.g., "Acme Corp", "Acme - IT Division") |
| `slug`              | VARCHAR(100) | UNIQUE, NOT NULL                        | URL-friendly identifier (e.g., "acme-corp")                 |
| `settings`          | JSONB        | DEFAULT '{}'::jsonb                     | Organization-specific settings and configuration            |
| `subscription_tier` | VARCHAR(50)  | DEFAULT 'free'                          | Enum: 'free', 'pro', 'enterprise'                           |
| `max_users`         | INTEGER      | DEFAULT 10                              | Maximum users allowed (based on subscription)               |
| `max_rfps`          | INTEGER      | DEFAULT 5                               | Maximum active RFPs allowed                                 |
| `created_at`        | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                 | Creation timestamp                                          |
| `updated_at`        | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                 | Last update timestamp                                       |

**Indexes**:

- Primary key on `id`
- Unique index on `slug`
- Index on `subscription_tier`

**Validation Rules**:

- `name` cannot be empty
- `slug` must be unique, lowercase, alphanumeric with hyphens only
- `subscription_tier` must be one of: 'free', 'pro', 'enterprise'
- `max_users` and `max_rfps` must be positive integers

---

### 2. `users`

Represents authenticated users. Linked to Supabase Auth `auth.users` table.

| Column        | Type        | Constraints                            | Description                              |
| ------------- | ----------- | -------------------------------------- | ---------------------------------------- |
| `id`          | UUID        | PRIMARY KEY, REFERENCES auth.users(id) | Supabase Auth user ID                    |
| `email`       | TEXT        | UNIQUE, NOT NULL                       | User email (synced from auth.users)      |
| `full_name`   | TEXT        |                                        | User's full name                         |
| `avatar_url`  | TEXT        |                                        | Profile picture URL                      |
| `preferences` | JSONB       | DEFAULT '{}'::jsonb                    | User preferences (theme, language, etc.) |
| `created_at`  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                | Account creation timestamp               |
| `updated_at`  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                | Last profile update                      |

**Indexes**:

- Primary key on `id` (references auth.users)
- Unique index on `email`

**Validation Rules**:

- `email` must be valid email format
- `id` must exist in `auth.users` (foreign key constraint)

**Note**: This extends Supabase's built-in `auth.users` table with application-specific profile data.

---

### 3. `user_organizations`

Links users to organizations with role-based access control (many-to-many).

| Column            | Type        | Constraints                                              | Description                          |
| ----------------- | ----------- | -------------------------------------------------------- | ------------------------------------ |
| `id`              | UUID        | PRIMARY KEY, DEFAULT uuid_generate_v4()                  | Unique identifier                    |
| `user_id`         | UUID        | NOT NULL, REFERENCES users(id) ON DELETE CASCADE         | User being assigned                  |
| `organization_id` | UUID        | NOT NULL, REFERENCES organizations(id) ON DELETE CASCADE | Organization user belongs to         |
| `role`            | VARCHAR(20) | NOT NULL, DEFAULT 'evaluator'                            | Enum: 'admin', 'evaluator', 'viewer' |
| `joined_at`       | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                  | When user joined organization        |
| `invited_by`      | UUID        | REFERENCES users(id)                                     | User who sent the invitation         |

**Indexes**:

- Primary key on `id`
- Composite unique index on `(user_id, organization_id)` - one role per user per org
- Index on `organization_id` for fetching org members
- Index on `user_id` for fetching user's organizations

**Validation Rules**:

- `role` must be one of: 'admin', 'evaluator', 'viewer'
- Cannot have duplicate `(user_id, organization_id)` pairs

**Role Permissions**:

- **admin**: Full access - manage organization, invite users, create/delete RFPs, assign evaluators
- **evaluator**: Can evaluate assigned RFPs, add comments, change scores/statuses
- **viewer**: Read-only access to assigned RFPs, cannot modify evaluations

---

### 4. `rfp_user_assignments`

Links users to specific RFPs for granular access control within an organization.

| Column         | Type        | Constraints                                      | Description                          |
| -------------- | ----------- | ------------------------------------------------ | ------------------------------------ |
| `id`           | UUID        | PRIMARY KEY, DEFAULT uuid_generate_v4()          | Unique identifier                    |
| `rfp_id`       | UUID        | NOT NULL, REFERENCES rfps(id) ON DELETE CASCADE  | RFP being assigned                   |
| `user_id`      | UUID        | NOT NULL, REFERENCES users(id) ON DELETE CASCADE | User being assigned                  |
| `access_level` | VARCHAR(20) | NOT NULL, DEFAULT 'evaluator'                    | Enum: 'owner', 'evaluator', 'viewer' |
| `assigned_at`  | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                          | Assignment timestamp                 |
| `assigned_by`  | UUID        | REFERENCES users(id)                             | User who made the assignment         |

**Indexes**:

- Primary key on `id`
- Composite unique index on `(rfp_id, user_id)` - one assignment per RFP-user pair
- Index on `rfp_id` for fetching RFP team members
- Index on `user_id` for fetching user's assigned RFPs

**Validation Rules**:

- `access_level` must be one of: 'owner', 'evaluator', 'viewer'
- User must be member of same organization as RFP
- Cannot have duplicate `(rfp_id, user_id)` pairs

**Access Level Permissions**:

- **owner**: Full control - edit RFP, assign evaluators, delete RFP
- **evaluator**: Can evaluate responses, add comments, change scores
- **viewer**: Read-only access, cannot modify evaluations

---

### 5. `rfps`

Represents a single Request for Proposal (procurement process).

| Column            | Type        | Constraints                                              | Description                                  |
| ----------------- | ----------- | -------------------------------------------------------- | -------------------------------------------- |
| `id`              | UUID        | PRIMARY KEY, DEFAULT uuid_generate_v4()                  | Unique identifier                            |
| `organization_id` | UUID        | NOT NULL, REFERENCES organizations(id) ON DELETE CASCADE | Owner organization                           |
| `title`           | TEXT        | NOT NULL                                                 | RFP name (e.g., "Infrastructure Cloud 2025") |
| `description`     | TEXT        |                                                          | Detailed RFP description                     |
| `status`          | VARCHAR(20) | NOT NULL, DEFAULT 'in_progress'                          | Enum: 'in_progress', 'completed', 'archived' |
| `created_at`      | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                  | Creation timestamp                           |
| `updated_at`      | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                  | Last update timestamp                        |
| `created_by`      | UUID        | NOT NULL, REFERENCES users(id)                           | User who created the RFP                     |

**Indexes**:

- Primary key on `id`
- Index on `organization_id` for filtering by organization
- Index on `status` for filtering active RFPs
- Index on `created_by` for user activity tracking

**Validation Rules**:

- `status` must be one of: 'in_progress', 'completed', 'archived'
- `title` cannot be empty
- `organization_id` must reference valid organization
- `created_by` must be member of the organization

---

### 6. `requirements`

Represents evaluable criteria in a 4-level hierarchy (Domain → Category → Subcategory → Requirement).

| Column                    | Type         | Constraints                                        | Description                                                         |
| ------------------------- | ------------ | -------------------------------------------------- | ------------------------------------------------------------------- |
| `id`                      | UUID         | PRIMARY KEY, DEFAULT uuid_generate_v4()            | Unique identifier                                                   |
| `rfp_id`                  | UUID         | NOT NULL, FOREIGN KEY → rfps(id) ON DELETE CASCADE | Parent RFP                                                          |
| `requirement_id_external` | VARCHAR(50)  | NOT NULL                                           | External ID from N8N (e.g., "REQ-001", "DOM-1")                     |
| `title`                   | TEXT         | NOT NULL                                           | Requirement name                                                    |
| `description`             | TEXT         |                                                    | Multi-line description with bullet points                           |
| `context`                 | TEXT         |                                                    | Background info (3-4 paragraphs) from RFP document                  |
| `parent_id`               | UUID         | FOREIGN KEY → requirements(id) ON DELETE CASCADE   | Parent requirement (NULL for root level)                            |
| `level`                   | INTEGER      | NOT NULL, CHECK (level BETWEEN 1 AND 4)            | Hierarchy level: 1=Domain, 2=Category, 3=Subcategory, 4=Requirement |
| `weight`                  | DECIMAL(5,4) | NOT NULL, CHECK (weight BETWEEN 0 AND 1)           | Importance weight (0.0 to 1.0)                                      |
| `position_in_pdf`         | JSONB        |                                                    | PDF location metadata: {page, coordinates}                          |
| `pdf_url`                 | TEXT         |                                                    | Link to PDF document for context                                    |
| `created_at`              | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                            | Creation timestamp                                                  |
| `updated_at`              | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                            | Last update timestamp                                               |
| `created_by`              | VARCHAR(255) |                                                    | Future: User ID (V2)                                                |

**Indexes**:

- Primary key on `id`
- Index on `rfp_id` for filtering by RFP
- Index on `parent_id` for hierarchy traversal
- Index on `level` for filtering leaf nodes
- Composite index on `(rfp_id, requirement_id_external)` for lookups
- Index on `(rfp_id, level)` for efficient tree queries

**Validation Rules**:

- `level` must be 1, 2, 3, or 4
- `weight` must be between 0.0 and 1.0
- `parent_id` must be NULL for level 1, non-NULL for levels 2-4
- `requirement_id_external` must be unique within an RFP

**State Transitions**: N/A (requirements are static during evaluation)

**Recursive Query Example**:

```sql
WITH RECURSIVE requirement_tree AS (
  -- Base case: root requirements (level 1)
  SELECT id, rfp_id, requirement_id_external, title, parent_id, level,
         weight, ARRAY[id] AS path
  FROM requirements
  WHERE rfp_id = $1 AND parent_id IS NULL

  UNION ALL

  -- Recursive case: children
  SELECT r.id, r.rfp_id, r.requirement_id_external, r.title, r.parent_id,
         r.level, r.weight, rt.path || r.id
  FROM requirements r
  INNER JOIN requirement_tree rt ON r.parent_id = rt.id
)
SELECT * FROM requirement_tree
ORDER BY path;
```

---

### 7. `suppliers`

Represents vendors responding to an RFP.

| Column                 | Type         | Constraints                                        | Description                          |
| ---------------------- | ------------ | -------------------------------------------------- | ------------------------------------ |
| `id`                   | UUID         | PRIMARY KEY, DEFAULT uuid_generate_v4()            | Unique identifier                    |
| `rfp_id`               | UUID         | NOT NULL, FOREIGN KEY → rfps(id) ON DELETE CASCADE | Parent RFP                           |
| `supplier_id_external` | VARCHAR(50)  | NOT NULL                                           | External ID from N8N (e.g., "SUP-A") |
| `name`                 | TEXT         | NOT NULL                                           | Supplier company name                |
| `contact_name`         | VARCHAR(255) |                                                    | Contact person name                  |
| `contact_email`        | VARCHAR(255) |                                                    | Contact email                        |
| `contact_phone`        | VARCHAR(50)  |                                                    | Contact phone                        |
| `created_at`           | TIMESTAMPTZ  | NOT NULL, DEFAULT NOW()                            | Creation timestamp                   |

**Indexes**:

- Primary key on `id`
- Index on `rfp_id` for filtering by RFP
- Composite unique index on `(rfp_id, supplier_id_external)`

**Validation Rules**:

- `name` cannot be empty
- `contact_email` must be valid email format (if provided)
- `supplier_id_external` must be unique within an RFP

---

### 8. `responses`

Represents a single supplier's answer to a specific requirement. Core evaluation entity.

| Column             | Type        | Constraints                                                | Description                                           |
| ------------------ | ----------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| `id`               | UUID        | PRIMARY KEY, DEFAULT uuid_generate_v4()                    | Unique identifier                                     |
| `rfp_id`           | UUID        | NOT NULL, FOREIGN KEY → rfps(id) ON DELETE CASCADE         | Parent RFP (denormalized for queries)                 |
| `requirement_id`   | UUID        | NOT NULL, FOREIGN KEY → requirements(id) ON DELETE CASCADE | Requirement being answered                            |
| `supplier_id`      | UUID        | NOT NULL, FOREIGN KEY → suppliers(id) ON DELETE CASCADE    | Supplier providing response                           |
| `response_text`    | TEXT        |                                                            | Full response text from supplier                      |
| `ai_score`         | INTEGER     | CHECK (ai_score BETWEEN 0 AND 5)                           | AI-generated score (0-5 stars)                        |
| `ai_comment`       | TEXT        |                                                            | AI-generated analysis commentary                      |
| `manual_score`     | INTEGER     | CHECK (manual_score BETWEEN 0 AND 5)                       | Evaluator's manual score (0-5 stars, NULL if not set) |
| `status`           | VARCHAR(20) | NOT NULL, DEFAULT 'pending'                                | Enum: 'pending', 'pass', 'partial', 'fail'            |
| `is_checked`       | BOOLEAN     | NOT NULL, DEFAULT false                                    | Completion checkbox state                             |
| `manual_comment`   | TEXT        |                                                            | Evaluator's comments                                  |
| `question`         | TEXT        |                                                            | Evaluator's questions/doubts                          |
| `last_modified_by` | UUID        | REFERENCES users(id)                                       | User who last modified this response                  |
| `created_at`       | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                    | Creation timestamp                                    |
| `updated_at`       | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                    | Last update timestamp                                 |

**Indexes**:

- Primary key on `id`
- Composite index on `(rfp_id, requirement_id)` for loading responses by requirement
- Composite index on `(rfp_id, supplier_id)` for supplier profile views
- Composite unique index on `(requirement_id, supplier_id)` to enforce 1 response per requirement-supplier pair
- Index on `status` for filtering by compliance

**Validation Rules**:

- `ai_score` must be 0-5 (NULL allowed if AI analysis failed)
- `manual_score` must be 0-5 (NULL if not set by evaluator)
- `status` must be one of: 'pending', 'pass', 'partial', 'fail'
- `is_checked` automatically set to true when status changes to non-pending
- Cannot have duplicate (requirement_id, supplier_id) pairs

**Computed Fields** (not stored, computed at query time):

- `final_score`: `COALESCE(manual_score, ai_score)` - manual score takes precedence

**State Transitions**:

```
pending → pass/partial/fail (evaluator sets status)
  ↓
is_checked auto-set to true when status != 'pending'

Manual override:
any status + is_checked = false (evaluator unchecks)
```

---

### 9. `response_audit`

Audit log for tracking changes to response evaluations.

| Column        | Type        | Constraints                                             | Description                                    |
| ------------- | ----------- | ------------------------------------------------------- | ---------------------------------------------- |
| `id`          | UUID        | PRIMARY KEY, DEFAULT uuid_generate_v4()                 | Unique identifier                              |
| `response_id` | UUID        | NOT NULL, FOREIGN KEY → responses(id) ON DELETE CASCADE | Response being modified                        |
| `field_name`  | VARCHAR(50) | NOT NULL                                                | Field changed (e.g., 'manual_score', 'status') |
| `old_value`   | TEXT        |                                                         | Previous value                                 |
| `new_value`   | TEXT        |                                                         | New value                                      |
| `modified_by` | UUID        | NOT NULL, REFERENCES users(id)                          | User who made change                           |
| `modified_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()                                 | Change timestamp                               |

**Indexes**:

- Primary key on `id`
- Index on `response_id` for fetching audit trail
- Index on `modified_at` for time-based queries

**Note**: MVP does not implement audit logging. Table schema defined for V2 migration.

---

## Relationships

### One-to-Many

- **Organization → RFPs**: One organization has many RFPs  
  `organizations.id ← rfps.organization_id`

- **Organization → User-Org Links**: One organization has many user memberships  
  `organizations.id ← user_organizations.organization_id`

- **User → User-Org Links**: One user can belong to many organizations  
  `users.id ← user_organizations.user_id`

- **User → RFP-User Assignments**: One user can be assigned to many RFPs  
  `users.id ← rfp_user_assignments.user_id`

- **User → Created RFPs**: One user creates many RFPs  
  `users.id ← rfps.created_by`

- **User → Modified Responses**: One user modifies many responses  
  `users.id ← responses.last_modified_by`

- **RFP → Requirements**: One RFP has many requirements  
  `rfps.id ← requirements.rfp_id`

- **RFP → Suppliers**: One RFP has many suppliers  
  `rfps.id ← suppliers.rfp_id`

- **RFP → RFP-User Assignments**: One RFP has many assigned users  
  `rfps.id ← rfp_user_assignments.rfp_id`

- **Requirement → Child Requirements**: One requirement has many children (self-referential)  
  `requirements.id ← requirements.parent_id`

- **Requirement → Responses**: One requirement has many responses (one per supplier)  
  `requirements.id ← responses.requirement_id`

- **Supplier → Responses**: One supplier has many responses (one per requirement)  
  `suppliers.id ← responses.supplier_id`

### Many-to-Many

- **Users ↔ Organizations**: Via `user_organizations` table  
  One user can belong to multiple organizations, one organization has multiple users

- **Users ↔ RFPs**: Via `rfp_user_assignments` table  
  One user can be assigned to multiple RFPs, one RFP can have multiple assigned users

- **Requirements ↔ Suppliers**: Via `responses` table  
  One requirement answered by many suppliers, one supplier answers many requirements

---

## Sample Data Structure

```json
{
  "rfp": {
    "id": "uuid-1",
    "title": "Infrastructure Cloud 2025",
    "status": "in_progress"
  },
  "requirements": [
    {
      "id": "uuid-req-1",
      "rfp_id": "uuid-1",
      "requirement_id_external": "DOM-1",
      "title": "Infrastructure et Sécurité",
      "level": 1,
      "weight": 0.25,
      "parent_id": null
    },
    {
      "id": "uuid-req-2",
      "rfp_id": "uuid-1",
      "requirement_id_external": "CAT-1.1",
      "title": "Sécurité des données",
      "level": 2,
      "weight": 0.15,
      "parent_id": "uuid-req-1"
    },
    {
      "id": "uuid-req-3",
      "rfp_id": "uuid-1",
      "requirement_id_external": "REQ-001",
      "title": "Chiffrement TLS 1.3",
      "description": "Le système doit utiliser TLS 1.3...",
      "context": "Conformément à la réglementation RGPD...",
      "level": 4,
      "weight": 0.08,
      "parent_id": "uuid-req-2"
    }
  ],
  "suppliers": [
    {
      "id": "uuid-sup-1",
      "rfp_id": "uuid-1",
      "supplier_id_external": "SUP-A",
      "name": "TechCorp Solutions"
    }
  ],
  "responses": [
    {
      "id": "uuid-resp-1",
      "rfp_id": "uuid-1",
      "requirement_id": "uuid-req-3",
      "supplier_id": "uuid-sup-1",
      "response_text": "Nous utilisons TLS 1.3 pour toutes les communications...",
      "ai_score": 4,
      "ai_comment": "Réponse complète et bien documentée.",
      "manual_score": 5,
      "status": "pass",
      "is_checked": true,
      "manual_comment": "Excellente réponse, certification à jour",
      "question": null
    }
  ]
}
```

---

## Queries

### Common Query Patterns

#### 1. Get all requirements for an RFP (hierarchical)

```sql
WITH RECURSIVE requirement_tree AS (
  SELECT id, rfp_id, requirement_id_external, title, description,
         parent_id, level, weight, 1 AS sort_order
  FROM requirements
  WHERE rfp_id = $1 AND parent_id IS NULL

  UNION ALL

  SELECT r.id, r.rfp_id, r.requirement_id_external, r.title,
         r.description, r.parent_id, r.level, r.weight,
         rt.sort_order + 1
  FROM requirements r
  INNER JOIN requirement_tree rt ON r.parent_id = rt.id
)
SELECT * FROM requirement_tree
ORDER BY sort_order, requirement_id_external;
```

#### 2. Get all responses for a specific requirement with supplier info

```sql
SELECT
  r.id,
  r.response_text,
  r.ai_score,
  r.ai_comment,
  r.manual_score,
  r.status,
  r.is_checked,
  r.manual_comment,
  r.question,
  COALESCE(r.manual_score, r.ai_score) AS final_score,
  s.name AS supplier_name,
  s.supplier_id_external
FROM responses r
INNER JOIN suppliers s ON r.supplier_id = s.id
WHERE r.requirement_id = $1
ORDER BY s.name;
```

#### 3. Get requirement completion status

```sql
SELECT
  req.id,
  req.title,
  COUNT(resp.id) AS total_responses,
  COUNT(resp.id) FILTER (WHERE resp.is_checked = true) AS checked_responses,
  CASE
    WHEN COUNT(resp.id) = 0 THEN 'no_responses'
    WHEN COUNT(resp.id) FILTER (WHERE resp.is_checked = true) = COUNT(resp.id) THEN 'complete'
    ELSE 'pending'
  END AS completion_status
FROM requirements req
LEFT JOIN responses resp ON req.id = resp.requirement_id
WHERE req.rfp_id = $1 AND req.level = 4
GROUP BY req.id, req.title
ORDER BY req.requirement_id_external;
```

#### 4. Get supplier summary across all requirements

```sql
SELECT
  s.id,
  s.name,
  COUNT(r.id) AS total_responses,
  AVG(COALESCE(r.manual_score, r.ai_score)) AS avg_score,
  COUNT(r.id) FILTER (WHERE r.status = 'pass') AS pass_count,
  COUNT(r.id) FILTER (WHERE r.status = 'partial') AS partial_count,
  COUNT(r.id) FILTER (WHERE r.status = 'fail') AS fail_count,
  COUNT(r.id) FILTER (WHERE r.status = 'pending') AS pending_count
FROM suppliers s
LEFT JOIN responses r ON s.id = r.supplier_id
WHERE s.rfp_id = $1
GROUP BY s.id, s.name
ORDER BY avg_score DESC;
```

#### 5. Update response with manual evaluation

```sql
UPDATE responses
SET
  manual_score = $2,
  status = $3,
  is_checked = CASE
    WHEN $3 != 'pending' THEN true
    ELSE is_checked
  END,
  manual_comment = $4,
  question = $5,
  updated_at = NOW()
WHERE id = $1
RETURNING *;
```

#### 6. Get requirement breadcrumb path

```sql
WITH RECURSIVE breadcrumb AS (
  SELECT id, requirement_id_external, title, parent_id, level,
         ARRAY[requirement_id_external] AS path
  FROM requirements
  WHERE id = $1

  UNION ALL

  SELECT r.id, r.requirement_id_external, r.title, r.parent_id, r.level,
         r.requirement_id_external || b.path
  FROM requirements r
  INNER JOIN breadcrumb b ON r.id = b.parent_id
)
SELECT requirement_id_external, title, level
FROM breadcrumb
ORDER BY level;
```

---

## Migrations

### Migration 001: Initial Schema with Multi-Tenant Support

**File**: `supabase/migrations/001_initial_schema.sql`

⚠️ **Updated**: The migration has been updated to include multi-tenant support with organizations, users, and RLS policies. See [migrations-multi-tenant.sql](./migrations-multi-tenant.sql) for the complete schema.

**Key Changes**:

- Added `organizations` table for multi-tenant isolation
- Added `users` table extending Supabase Auth
- Added `user_organizations` for role-based access (admin/evaluator/viewer)
- Added `rfp_user_assignments` for granular RFP access control
- Updated `rfps` table with `organization_id` and `created_by` (UUID references)
- Updated `responses` table with `last_modified_by` (UUID reference)
- Added `response_audit` table for change tracking
- Enabled Row Level Security (RLS) on all tables
- Added RLS policies for organization-based data isolation
- Added helper functions for user permissions

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- RFPs table
CREATE TABLE rfps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  organization_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  CONSTRAINT valid_status CHECK (status IN ('in_progress', 'completed', 'archived'))
);

CREATE INDEX idx_rfps_status ON rfps(status);
CREATE INDEX idx_rfps_organization ON rfps(organization_id);

-- Requirements table
CREATE TABLE requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  requirement_id_external VARCHAR(50) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  context TEXT,
  parent_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 4),
  weight DECIMAL(5,4) NOT NULL CHECK (weight BETWEEN 0 AND 1),
  position_in_pdf JSONB,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  UNIQUE (rfp_id, requirement_id_external)
);

CREATE INDEX idx_requirements_rfp ON requirements(rfp_id);
CREATE INDEX idx_requirements_parent ON requirements(parent_id);
CREATE INDEX idx_requirements_level ON requirements(level);
CREATE INDEX idx_requirements_rfp_level ON requirements(rfp_id, level);
CREATE INDEX idx_requirements_rfp_external ON requirements(rfp_id, requirement_id_external);

-- Suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  supplier_id_external VARCHAR(50) NOT NULL,
  name TEXT NOT NULL,
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (rfp_id, supplier_id_external)
);

CREATE INDEX idx_suppliers_rfp ON suppliers(rfp_id);

-- Responses table
CREATE TABLE responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rfp_id UUID NOT NULL REFERENCES rfps(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  response_text TEXT,
  ai_score INTEGER CHECK (ai_score BETWEEN 0 AND 5),
  ai_comment TEXT,
  manual_score INTEGER CHECK (manual_score BETWEEN 0 AND 5),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_checked BOOLEAN NOT NULL DEFAULT false,
  manual_comment TEXT,
  question TEXT,
  last_modified_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requirement_id, supplier_id),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'pass', 'partial', 'fail'))
);

CREATE INDEX idx_responses_rfp_requirement ON responses(rfp_id, requirement_id);
CREATE INDEX idx_responses_rfp_supplier ON responses(rfp_id, supplier_id);
CREATE INDEX idx_responses_requirement_supplier ON responses(requirement_id, supplier_id);
CREATE INDEX idx_responses_status ON responses(status);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rfps_updated_at BEFORE UPDATE ON rfps
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON requirements
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_responses_updated_at BEFORE UPDATE ON responses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Type Generation

After migration, generate TypeScript types:

```bash
npx supabase gen types typescript --project-id <project-id> > lib/supabase/types.ts
```

This generates types like:

```typescript
export type RFP = Database["public"]["Tables"]["rfps"]["Row"];
export type Requirement = Database["public"]["Tables"]["requirements"]["Row"];
export type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
export type Response = Database["public"]["Tables"]["responses"]["Row"];
```

---

## Validation Rules Summary

| Entity      | Field                         | Rule                                                      |
| ----------- | ----------------------------- | --------------------------------------------------------- |
| RFP         | status                        | Must be 'in_progress', 'completed', or 'archived'         |
| RFP         | title                         | Cannot be empty                                           |
| Requirement | level                         | Must be 1, 2, 3, or 4                                     |
| Requirement | weight                        | Must be between 0.0 and 1.0                               |
| Requirement | parent_id                     | NULL for level 1, non-NULL for levels 2-4                 |
| Requirement | requirement_id_external       | Unique within RFP                                         |
| Supplier    | name                          | Cannot be empty                                           |
| Supplier    | contact_email                 | Valid email format (if provided)                          |
| Supplier    | supplier_id_external          | Unique within RFP                                         |
| Response    | ai_score                      | 0-5 or NULL                                               |
| Response    | manual_score                  | 0-5 or NULL                                               |
| Response    | status                        | Must be 'pending', 'pass', 'partial', or 'fail'           |
| Response    | (requirement_id, supplier_id) | Unique pair - one response per requirement-supplier combo |

---

## Performance Considerations

1. **Hierarchical Queries**: Use recursive CTEs with path arrays for efficient traversal
2. **Indexes**: All foreign keys indexed, composite indexes for common query patterns
3. **Denormalization**: `rfp_id` in responses for faster filtering (avoids join through requirements)
4. **Pagination**: Add LIMIT/OFFSET to large result sets (not needed for MVP < 200 requirements)
5. **Caching**: React Query caches requirement tree and responses for 5 minutes

---

## Future Enhancements (V2)

1. **Row Level Security (RLS)**: Enable policies for multi-tenant access control
2. **Audit Logging**: Implement `response_audit` table for change tracking
3. **Computed Columns**: Add materialized views for supplier rankings
4. **Full-Text Search**: Add GIN index on response_text for advanced search
5. **Soft Deletes**: Add `deleted_at` timestamp instead of hard deletes
6. **Versioning**: Track requirement changes over time (immutable history)

---

## Conclusion

The data model supports all MVP requirements with proper relationships, indexes, and validation rules. The hierarchical structure uses standard PostgreSQL recursive CTEs for efficient querying. Ready for contract generation and implementation.
