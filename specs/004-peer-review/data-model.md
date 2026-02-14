# Data Model: Peer Review System

**Feature**: 004-peer-review
**Date**: 2026-02-13

---

## Schéma — Modifications DB

### 1. Table `rfps` — nouvelle colonne

```sql
ALTER TABLE rfps
  ADD COLUMN peer_review_enabled BOOLEAN NOT NULL DEFAULT false;
```

**Impact**: Aucune migration de données nécessaire (DEFAULT false). Aucune modification de contraintes existantes.

---

### 2. Nouvelle table `requirement_review_status`

```sql
CREATE TABLE requirement_review_status (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Références
  requirement_id UUID NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
  version_id     UUID NOT NULL REFERENCES evaluation_versions(id) ON DELETE CASCADE,

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'draft',

  -- Audit soumission
  submitted_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at   TIMESTAMPTZ,

  -- Audit validation
  reviewed_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,

  -- Commentaire de rejet
  rejection_comment TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (requirement_id, version_id),

  CONSTRAINT valid_review_status
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'))
);

CREATE INDEX idx_review_status_requirement ON requirement_review_status(requirement_id);
CREATE INDEX idx_review_status_version     ON requirement_review_status(version_id);
CREATE INDEX idx_review_status_status      ON requirement_review_status(version_id, status);

-- Trigger updated_at
CREATE TRIGGER update_requirement_review_status_updated_at
  BEFORE UPDATE ON requirement_review_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 3. RLS Policies

```sql
ALTER TABLE requirement_review_status ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les membres de l'organisation
CREATE POLICY "Members can view review statuses"
  ON requirement_review_status FOR SELECT
  USING (
    requirement_id IN (
      SELECT req.id FROM requirements req
      INNER JOIN rfps r ON req.rfp_id = r.id
      WHERE r.organization_id = (auth.jwt() ->> 'organization_id')::UUID
    )
  );

-- Insertion/modification : membres assignés au RFP (évaluateur ou owner)
CREATE POLICY "Evaluators can insert review statuses"
  ON requirement_review_status FOR INSERT
  WITH CHECK (
    requirement_id IN (
      SELECT req.id FROM requirements req
      INNER JOIN rfp_user_assignments rua ON req.rfp_id = rua.rfp_id
      WHERE rua.user_id = auth.uid()
        AND rua.access_level IN ('owner', 'evaluator', 'admin')
    )
  );

CREATE POLICY "Evaluators can update review statuses"
  ON requirement_review_status FOR UPDATE
  USING (
    requirement_id IN (
      SELECT req.id FROM requirements req
      INNER JOIN rfp_user_assignments rua ON req.rfp_id = rua.rfp_id
      WHERE rua.user_id = auth.uid()
        AND rua.access_level IN ('owner', 'evaluator', 'admin')
    )
  );
```

> **Note**: La logique de transition (qui peut passer à quel statut) est appliquée dans le handler API, pas uniquement via RLS, pour supporter des règles conditionnelles (ex: seul owner peut approuver).

---

## Entités TypeScript

### `PeerReviewStatus`

```typescript
export type PeerReviewStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
```

### `RequirementReviewStatus`

```typescript
export interface RequirementReviewStatus {
  id: string;
  requirement_id: string;
  version_id: string;
  status: PeerReviewStatus;
  submitted_by: string | null;
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_comment: string | null;
  created_at: string;
  updated_at: string;
}
```

### `UpdateReviewStatusRequest`

```typescript
export interface UpdateReviewStatusRequest {
  status: 'submitted' | 'approved' | 'rejected';
  rejection_comment?: string;  // requis si status = 'rejected'
}
```

---

## Matrice de transitions

| Statut actuel | Nouveau statut | Rôles autorisés         | Conditions               |
|---------------|----------------|-------------------------|--------------------------|
| `draft`       | `submitted`    | evaluator, owner, admin | —                        |
| `rejected`    | `submitted`    | evaluator, owner, admin | (resoumission après correction) |
| `submitted`   | `approved`     | owner, admin            | —                        |
| `submitted`   | `rejected`     | owner, admin            | rejection_comment facultatif |
| `approved`    | `draft`        | ❌ non autorisé         | —                        |
| `approved`    | `submitted`    | ❌ non autorisé         | —                        |

---

## Statut implicite

Une exigence sans ligne dans `requirement_review_status` pour la version active a un statut implicite `draft`. Le frontend gère ce cas : si aucun enregistrement n'est trouvé → afficher badge `draft`.

---

## Requête agrégée pour CategoryAnalysisTable

```sql
SELECT
  req.category_id,
  COUNT(*) FILTER (WHERE rrs.status = 'approved') AS approved_count,
  COUNT(req.id) AS total_count
FROM requirements req
LEFT JOIN requirement_review_status rrs
  ON rrs.requirement_id = req.id
  AND rrs.version_id = $versionId
WHERE req.rfp_id = $rfpId
  AND req.level = 4  -- leaf nodes uniquement
GROUP BY req.category_id;
```
