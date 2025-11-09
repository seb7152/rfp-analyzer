-- Migration 005: Fix RLS policies for suppliers and requirements
-- Allows evaluators and owners to insert/update suppliers and requirements

-- ============================================================================
-- CLEANUP: Remove overly permissive policies
-- ============================================================================

-- Remove the overly permissive policy that allows any org member to insert requirements
-- We want to enforce that only users with explicit RFP assignments can insert
DROP POLICY IF EXISTS "Allow authenticated users to insert requirements" ON requirements;

-- ============================================================================
-- SUPPLIERS RLS POLICIES
-- ============================================================================

-- Allow evaluators and owners to insert suppliers
CREATE POLICY "Evaluators can insert suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
    )
  );

-- Allow evaluators and owners to update suppliers
CREATE POLICY "Evaluators can update suppliers"
  ON suppliers FOR UPDATE
  USING (
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
    )
  );

-- Allow evaluators and owners to delete suppliers
CREATE POLICY "Evaluators can delete suppliers"
  ON suppliers FOR DELETE
  USING (
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
    )
  );

-- ============================================================================
-- REQUIREMENTS RLS POLICIES
-- ============================================================================

-- Allow evaluators and owners to insert requirements
CREATE POLICY "Evaluators can insert requirements"
  ON requirements FOR INSERT
  WITH CHECK (
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
    )
  );

-- Allow evaluators and owners to update requirements
CREATE POLICY "Evaluators can update requirements"
  ON requirements FOR UPDATE
  USING (
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
    )
  );

-- Allow evaluators and owners to delete requirements
CREATE POLICY "Evaluators can delete requirements"
  ON requirements FOR DELETE
  USING (
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
    )
  );

-- ============================================================================
-- RESPONSES RLS POLICIES
-- ============================================================================

-- Allow evaluators and owners to insert responses
CREATE POLICY "Evaluators can insert responses"
  ON responses FOR INSERT
  WITH CHECK (
    rfp_id IN (
      SELECT rfp_id FROM rfp_user_assignments
      WHERE user_id = auth.uid() AND access_level IN ('owner', 'evaluator')
    )
  );
