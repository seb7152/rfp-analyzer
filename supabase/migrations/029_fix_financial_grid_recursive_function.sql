-- Migration: Fix recursive function for financial template lines
-- Description: Adds WITH RECURSIVE to get_financial_template_lines_with_subtotals
-- Issue: Previous version used WITH but referenced recursive_totals which requires WITH RECURSIVE

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
      WITH RECURSIVE line_values AS (
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
        COALESCE(c.child_count, 0)::INTEGER AS child_count
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
        COALESCE(c.child_count, 0)::INTEGER AS child_count
      FROM financial_template_lines l
      LEFT JOIN child_counts c ON c.parent_id = l.id
      WHERE l.template_id = $1
        AND l.is_active = TRUE
      ORDER BY l.sort_order ASC
    $sql$ USING p_template_id;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;
