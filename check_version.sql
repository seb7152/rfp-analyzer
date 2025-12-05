-- Check versions for the specific RFP
SELECT 
  v.id,
  v.version_number,
  v.version_name,
  v.is_active,
  COUNT(DISTINCT vss.supplier_id) as supplier_count,
  COUNT(CASE WHEN vss.shortlist_status = 'active' THEN 1 END) as active_suppliers
FROM evaluation_versions v
LEFT JOIN version_supplier_status vss ON v.id = vss.version_id
WHERE v.rfp_id = '1f8d89fd-547c-4db5-96c2-c9447226952e'
GROUP BY v.id, v.version_number, v.version_name, v.is_active
ORDER BY v.version_number;
