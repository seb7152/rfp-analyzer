# API Contracts: Peer Review System

**Feature**: 004-peer-review
**Date**: 2026-02-13

---

## Endpoint 1 — Activer/désactiver le peer review

**Réutilise** le handler PATCH existant : `app/api/rfps/[rfpId]/route.ts`

```
PATCH /api/rfps/{rfpId}
```

**Auth**: Requis (session cookie)
**Permissions**: `access_level IN ('owner', 'admin')`

**Request body** (partiel — ajout au PATCH existant):

```json
{
  "peer_review_enabled": true
}
```

**Response 200**:

```json
{
  "rfp": {
    "id": "uuid",
    "peer_review_enabled": true,
    "...": "autres champs rfp existants"
  }
}
```

**Errors**:

- `401` Unauthorized
- `403` Forbidden (non owner/admin)
- `404` RFP not found

---

## Endpoint 2 — Récupérer tous les statuts peer review d'un RFP

```
GET /api/rfps/{rfpId}/review-statuses?versionId={versionId}
```

**Nouveau fichier**: `app/api/rfps/[rfpId]/review-statuses/route.ts`

**Auth**: Requis
**Permissions**: `access_level IN ('owner', 'evaluator', 'viewer', 'admin')`

**Query params**:
| Param | Type | Requis | Description |
|-------|------|--------|-------------|
| `versionId` | UUID | Oui | Version d'évaluation active |

**Response 200**:

```json
{
  "statuses": [
    {
      "id": "uuid",
      "requirement_id": "uuid",
      "version_id": "uuid",
      "status": "draft | submitted | approved | rejected",
      "submitted_by": "uuid | null",
      "submitted_at": "ISO8601 | null",
      "reviewed_by": "uuid | null",
      "reviewed_at": "ISO8601 | null",
      "rejection_comment": "string | null",
      "created_at": "ISO8601",
      "updated_at": "ISO8601"
    }
  ]
}
```

**Note**: Les exigences sans enregistrement dans la table ont un statut implicite `draft` côté client.

---

## Endpoint 3 — Mettre à jour le statut peer review d'une exigence

```
PATCH /api/rfps/{rfpId}/requirements/{requirementId}/review-status
```

**Nouveau fichier**: `app/api/rfps/[rfpId]/requirements/[requirementId]/review-status/route.ts`

**Auth**: Requis
**Permissions**: Dépend de la transition (voir matrice)

**Request body**:

```json
{
  "status": "submitted | approved | rejected",
  "version_id": "uuid",
  "rejection_comment": "string (optionnel, pour rejected)"
}
```

**Logique de transition serveur**:

```
draft      → submitted  : evaluator | owner | admin
rejected   → submitted  : evaluator | owner | admin
submitted  → approved   : owner | admin uniquement
submitted  → rejected   : owner | admin uniquement
Autres transitions → 400 Bad Request
```

**Response 200**:

```json
{
  "review_status": {
    "id": "uuid",
    "requirement_id": "uuid",
    "version_id": "uuid",
    "status": "submitted",
    "submitted_by": "uuid",
    "submitted_at": "ISO8601",
    "reviewed_by": null,
    "reviewed_at": null,
    "rejection_comment": null,
    "updated_at": "ISO8601"
  }
}
```

**Errors**:

- `400` Transition invalide (message explicite)
- `400` Peer review non activé sur ce RFP
- `401` Unauthorized
- `403` Permissions insuffisantes pour cette transition
- `404` Requirement ou RFP non trouvé

---

## Types TypeScript partagés

**Fichier** : `types/peer-review.ts` (nouveau)

```typescript
export type PeerReviewStatus = "draft" | "submitted" | "approved" | "rejected";

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

export interface UpdateReviewStatusRequest {
  status: Exclude<PeerReviewStatus, "draft">;
  version_id: string;
  rejection_comment?: string;
}
```
