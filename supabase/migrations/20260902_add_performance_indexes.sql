-- Indexes supporting the hot read paths of the dashboard and evaluation pages.
--
-- 1. responses(rfp_id, version_id)
--    The dashboard and the completion percentage both read every response of an
--    RFP for one evaluation version. The existing indexes cover
--    (rfp_id, requirement_id), (rfp_id, supplier_id) and (version_id) alone, so
--    this filter fell back to a scan plus filter.
--
-- 2. responses(version_id, is_checked)
--    /api/rfps/[rfpId]/versions now aggregates completion for every version in
--    one pass over (version_id, supplier_id, is_checked).
--
-- 3. rfp_user_assignments(rfp_id, user_id)
--    The access check filters on both columns at once; two single-column
--    indexes forced a bitmap AND on every API call.

CREATE INDEX IF NOT EXISTS idx_responses_rfp_version
  ON responses(rfp_id, version_id);

CREATE INDEX IF NOT EXISTS idx_responses_version_checked
  ON responses(version_id, supplier_id, is_checked);

CREATE INDEX IF NOT EXISTS idx_rfp_assignments_rfp_user
  ON rfp_user_assignments(rfp_id, user_id);

ANALYZE responses;
ANALYZE rfp_user_assignments;
