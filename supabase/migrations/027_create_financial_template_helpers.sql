-- Migration: Helpers for financial template lines
-- Description: RPCs for descendants and subtotals
-- US: US-1-007, US-1-009

-- Function to get all descendants of a line
CREATE OR REPLACE FUNCTION get_line_descendants(line_id UUID)
RETURNS TABLE(id UUID) AS $$
  WITH RECURSIVE descendants AS (
    SELECT ftl.id
    FROM financial_template_lines ftl
    WHERE ftl.parent_id = line_id
      AND ftl.is_active = TRUE

    UNION ALL

    SELECT child.id
    FROM financial_template_lines child
    INNER JOIN descendants d ON child.parent_id = d.id
    WHERE child.is_active = TRUE
  )
  SELECT id FROM descendants;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_line_descendants(UUID) IS 'Returns all active descendant line ids for a given template line.';

-- Function to get template lines with computed subtotals
CREATE OR REPLACE FUNCTION get_financial_template_lines_with_subtotals(p_template_id UUID)
RETURNS TABLE(
  id UUID,
  template_id UUID,
  parent_id UUID,
  line_code VARCHAR,
  name VARCHAR,
  line_type VARCHAR,
  recurrence_type VARCHAR,
  custom_formula TEXT,
  sort_order INTEGER,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  subtotal_setup NUMERIC,
  subtotal_recurrent NUMERIC,
  child_count INTEGER
) AS $$
DECLARE
  offer_values_exists BOOLEAN;
BEGIN
  SELECT to_regclass('public.financial_offer_values') IS NOT NULL
    INTO offer_values_exists;

  IF offer_values_exists THEN
    RETURN QUERY EXECUTE $sql$
      WITH line_values AS (
        SELECT
          l.id,
          l.parent_id,
          l.recurrence_type,
          COALESCE(SUM(v.setup_cost * COALESCE(v.quantity, 1)), 0) AS setup_value,
          COALESCE(
            SUM(
              CASE
                WHEN l.recurrence_type = 'monthly' THEN v.recurrent_cost * COALESCE(v.quantity, 1) * 12
                ELSE v.recurrent_cost * COALESCE(v.quantity, 1)
              END
            ),
            0
          ) AS recurrent_value
        FROM financial_template_lines l
        LEFT JOIN financial_offer_values v ON v.template_line_id = l.id
        WHERE l.template_id = $1
          AND l.is_active = TRUE
        GROUP BY l.id, l.parent_id, l.recurrence_type
      ),
      recursive_totals AS (
        SELECT
          id,
          parent_id,
          setup_value AS subtotal_setup,
          recurrent_value AS subtotal_recurrent
        FROM line_values

        UNION ALL

        SELECT
          lv.id,
          lv.parent_id,
          rt.subtotal_setup,
          rt.subtotal_recurrent
        FROM line_values lv
        INNER JOIN recursive_totals rt ON rt.parent_id = lv.id
      ),
      aggregated AS (
        SELECT
          id,
          SUM(subtotal_setup) AS subtotal_setup,
          SUM(subtotal_recurrent) AS subtotal_recurrent
        FROM recursive_totals
        GROUP BY id
      ),
      child_counts AS (
        SELECT parent_id, COUNT(*) AS child_count
        FROM financial_template_lines
        WHERE template_id = $1
          AND is_active = TRUE
          AND parent_id IS NOT NULL
        GROUP BY parent_id
      )
      SELECT
        l.id,
        l.template_id,
        l.parent_id,
        l.line_code,
        l.name,
        l.line_type,
        l.recurrence_type,
        l.custom_formula,
        l.sort_order,
        l.is_active,
        l.created_at,
        l.updated_at,
        COALESCE(a.subtotal_setup, 0) AS subtotal_setup,
        COALESCE(a.subtotal_recurrent, 0) AS subtotal_recurrent,
        COALESCE(c.child_count, 0) AS child_count
      FROM financial_template_lines l
      LEFT JOIN aggregated a ON a.id = l.id
      LEFT JOIN child_counts c ON c.parent_id = l.id
      WHERE l.template_id = $1
        AND l.is_active = TRUE
      ORDER BY l.sort_order ASC
    $sql$ USING p_template_id;
  ELSE
    RETURN QUERY EXECUTE $sql$
      WITH child_counts AS (
        SELECT parent_id, COUNT(*) AS child_count
        FROM financial_template_lines
        WHERE template_id = $1
          AND is_active = TRUE
          AND parent_id IS NOT NULL
        GROUP BY parent_id
      )
      SELECT
        l.id,
        l.template_id,
        l.parent_id,
        l.line_code,
        l.name,
        l.line_type,
        l.recurrence_type,
        l.custom_formula,
        l.sort_order,
        l.is_active,
        l.created_at,
        l.updated_at,
        0::NUMERIC AS subtotal_setup,
        0::NUMERIC AS subtotal_recurrent,
        COALESCE(c.child_count, 0) AS child_count
      FROM financial_template_lines l
      LEFT JOIN child_counts c ON c.parent_id = l.id
      WHERE l.template_id = $1
        AND l.is_active = TRUE
      ORDER BY l.sort_order ASC
    $sql$ USING p_template_id;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_financial_template_lines_with_subtotals(UUID) IS 'Returns template lines with computed setup/recurrent subtotals.';
