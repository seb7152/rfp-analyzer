# Evaluation Versioning System - Implementation Status

## Overview
This document tracks the implementation of the evaluation versioning system for progressive RFP evaluation with supplier shortlisting.

## Completed ✅

### Phase 1: Database & Migration
- [x] Migration `023_add_evaluation_versions.sql` created and applied
- [x] Tables created:
  - `evaluation_versions` - Main versioning table
  - `version_supplier_status` - Supplier status tracking per version
  - `version_changes_log` - Audit trail for all version actions
- [x] Modified `responses` table:
  - Added `version_id` (NOT NULL after migration)
  - Added `is_snapshot` for tracking copied responses
  - Added `original_response_id` for response lineage
  - Updated unique constraint to `(requirement_id, supplier_id, version_id)`
- [x] Data migrated: All existing RFPs now have "Version initiale"

### Phase 2: TypeScript Types
- [x] Added comprehensive types to `lib/supabase/types.ts`:
  - `EvaluationVersion`
  - `VersionSupplierStatus`
  - `VersionChangesLog`
  - `VersionWithSuppliers`
  - `VersionStats`
  - `VersionDetailResponse`
  - Request/Response types

### Phase 3: API Endpoints
- [x] Version Management:
  - `GET /api/rfps/[rfpId]/versions` - List versions with stats
  - `POST /api/rfps/[rfpId]/versions` - Create new version with automatic response copying
  - `GET /api/rfps/[rfpId]/versions/[versionId]` - Get version details
  - `PUT /api/rfps/[rfpId]/versions/[versionId]` - Update version metadata
  - `POST /api/rfps/[rfpId]/versions/[versionId]/finalize` - Finalize version (read-only)
  - `POST /api/rfps/[rfpId]/versions/[versionId]/activate` - Activate version

- [x] Supplier Status Management:
  - `PUT /api/rfps/[rfpId]/versions/[versionId]/suppliers/[supplierId]/status` - Update supplier status (remove/restore)

### Phase 4: React Components & Hooks
- [x] `contexts/VersionContext.tsx` - Centralized version state management
- [x] `hooks/use-versions.ts` - Hook for accessing version context
- [x] `components/VersionSelector.tsx` - Global version selector dropdown
- [x] `components/RFPSummary/VersionsTab.tsx` - Versions management interface
  - Create new versions with optional response copying
  - View version statistics
  - Finalize versions
  - List all versions with timeline

### Phase 5: UI Integration
- [x] Summary page:
  - Added "Versions" tab with GitBranch icon
  - Integrated VersionsTab component
  - Wrapped with VersionProvider
  - Full version management interface available

- [x] Evaluate page:
  - Integrated VersionSelector in header
  - Wrapped with VersionProvider
  - Users can switch between versions during evaluation

## In Progress 🔄

### Modify Existing Endpoints to Support `versionId`
The following endpoints need to be updated to accept `?versionId=` query parameter:
- `/api/rfps/[rfpId]/dashboard` - Filter metrics by version
- `/api/rfps/[rfpId]/suppliers` - Exclude removed suppliers
- `/api/rfps/[rfpId]/responses` - Filter responses by version
- `/api/rfps/[rfpId]/export/preview` - Preview for specific version
- `/api/rfps/[rfpId]/export/generate` - Export specific version

**Default behavior**: If `versionId` not specified, use active version

## Remaining Tasks 📋

### 1. Modify SuppliersTab for Version Filtering
**File**: `components/RFPSummary/SuppliersTab.tsx`

**Changes needed**:
- Accept `versionId` from VersionContext
- Filter suppliers by version_supplier_status
- Show two sections:
  - Active suppliers (status = 'active' or 'shortlisted')
  - Removed suppliers (status = 'removed') with reason and date
- Add buttons to remove/restore suppliers in version
- Create dialog for removal with optional justification text

**Component to create**: `components/SupplierStatusDialog.tsx`

### 2. Modify Evaluate Page to Filter Removed Suppliers
**Files**:
- `app/dashboard/rfp/[rfpId]/evaluate/page.tsx`
- `components/Sidebar.tsx` - Update supplier list filtering
- `components/ComparisonView.tsx` - Filter suppliers in comparison

**Changes needed**:
- Read versionId from VersionContext
- Fetch version_supplier_status to get removed suppliers
- Filter suppliers in sidebar to exclude removed ones
- Update ComparisonView supplier dropdown to exclude removed suppliers
- Show message if no suppliers are active in current version

### 3. Update API Endpoints for Version Filtering

#### Dashboard Endpoint
```typescript
// GET /api/rfps/[rfpId]/dashboard?versionId=<uuid>
// Should filter:
// - Only count evaluated responses in this version
// - Only count active suppliers in this version
// - Rankings based on version-specific responses
```

#### Suppliers Endpoint
```typescript
// GET /api/rfps/[rfpId]/suppliers?versionId=<uuid>&includeStats=true
// Should:
// - Exclude suppliers with status = 'removed'
// - Include removal_reason for removed suppliers (optional)
// - Filter stats to this version only
```

#### Responses Endpoint
```typescript
// GET /api/rfps/[rfpId]/responses?versionId=<uuid>
// Should filter responses to specific version
```

#### Export Endpoints
```typescript
// GET /api/rfps/[rfpId]/export/preview?versionId=<uuid>
// GET /api/rfps/[rfpId]/export/generate?versionId=<uuid>
// Should:
// - Only export responses from specified version
// - Exclude removed suppliers
// - Include version info in export
```

### 4. Integration Testing
**Test scenarios**:
- [ ] Create version → copy responses → verify response count
- [ ] Remove supplier → verify hidden in evaluate page
- [ ] Finalize version → verify read-only behavior
- [ ] Switch versions → verify data isolation
- [ ] Create version without copying → verify no responses
- [ ] Activate version → verify other versions deactivated
- [ ] Inherit supplier status → verify status copied
- [ ] Export from specific version → verify correct data

### 5. Documentation & Deployment
- [ ] Write user guide for versioning feature
- [ ] Create migration guide for existing projects
- [ ] Performance testing with large datasets
- [ ] PR review and merge to main

## Architecture Notes

### Version Workflow
1. **Initial State**: "Version initiale" created automatically with all suppliers active
2. **Version Creation**: New version with optional response copying:
   - If copying: All responses copied with `is_snapshot=true`
   - Supplier status inherited (if `inherit_supplier_status=true`)
   - Previous version deactivated
3. **Supplier Removal**: Mark supplier as 'removed' in version:
   - Responses still in DB but hidden from UI
   - Justification stored in `removal_reason`
   - Audit trail logged
4. **Version Finalization**: Make version read-only:
   - Can still create new versions from finalized version
   - Cannot modify scores or supplier statuses

### Key Design Decisions
- **Response Copying**: Responses are actual copies (not references) to allow independent modifications
- **Soft Delete for Suppliers**: Suppliers marked as 'removed' rather than deleted to preserve audit trail
- **Optional Justification**: Removal reason is optional to reduce friction
- **Active Version Default**: APIs default to active version if `versionId` not specified
- **Immutable Finalized Versions**: Prevents accidental modifications after review

## Database Schema

```sql
-- Main version table
evaluation_versions {
  id: UUID
  rfp_id: UUID
  version_number: INTEGER
  version_name: TEXT
  description: TEXT
  is_active: BOOLEAN
  parent_version_id: UUID (nullable)
  created_at, created_by
  finalized_at, finalized_by
}

-- Supplier status per version
version_supplier_status {
  id: UUID
  version_id: UUID
  supplier_id: UUID
  shortlist_status: 'active' | 'shortlisted' | 'removed'
  removal_reason: TEXT (nullable)
  removed_at, removed_by
  created_at
}

-- Audit trail
version_changes_log {
  id: UUID
  version_id: UUID
  rfp_id: UUID
  action: 'version_created' | 'version_finalized' | 'version_activated' |
          'supplier_removed' | 'supplier_restored' | 'responses_copied'
  details: JSONB
  created_at, created_by
}
```

## Testing Checklist

- [ ] Database migration applies successfully
- [ ] Version creation with response copying works
- [ ] Version creation without copying works
- [ ] Supplier removal with reason works
- [ ] Supplier restoration works
- [ ] Version finalization prevents modifications
- [ ] Version activation deactivates others
- [ ] VersionContext provides correct state
- [ ] VersionSelector updates URL and reloads data
- [ ] VersionsTab displays all versions
- [ ] Removed suppliers hidden in Evaluate page
- [ ] Dashboard metrics filtered by version
- [ ] Export respects version selection
- [ ] Audit trail logs all actions

## Notes for Next Implementation Phase

1. **Priority Order**:
   1. Modify dashboard endpoint for version filtering
   2. Modify suppliers endpoint to exclude removed suppliers
   3. Update Sidebar and ComparisonView
   4. Create SuppliersTab modifications
   5. Run integration tests

2. **Time Estimation**:
   - API endpoint updates: 2-3 hours
   - Component modifications: 2-3 hours
   - Testing: 2-3 hours

3. **Deployment Strategy**:
   - Test on staging first
   - Create PR for review
   - Deploy to production after approval
   - Monitor for issues
   - Gather user feedback
