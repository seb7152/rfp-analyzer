-- Migration: Fix missing version_supplier_status records
-- Purpose: Ensure all suppliers have status records for their version
-- Fixes cases where supplier statuses weren't created during initial migration

-- For each version, create supplier status records for suppliers that don't have them yet
INSERT INTO version_supplier_status (version_id, supplier_id, is_active, shortlist_status)
SELECT 
  v.id,
  s.id,
  true,
  'active'
FROM evaluation_versions v
INNER JOIN suppliers s ON s.rfp_id = v.rfp_id
LEFT JOIN version_supplier_status vss ON vss.version_id = v.id AND vss.supplier_id = s.id
WHERE vss.id IS NULL  -- Only insert if the record doesn't exist
ON CONFLICT (version_id, supplier_id) DO NOTHING;
