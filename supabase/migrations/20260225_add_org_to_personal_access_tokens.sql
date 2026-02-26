-- Migration: Add organization_id to personal_access_tokens
-- Tokens are scoped per user + organization

ALTER TABLE public.personal_access_tokens
  ADD COLUMN organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- Backfill existing tokens: assign them to the first organization of the user
UPDATE public.personal_access_tokens pat
SET organization_id = (
  SELECT uo.organization_id
  FROM public.user_organizations uo
  WHERE uo.user_id = pat.user_id
  ORDER BY uo.joined_at ASC
  LIMIT 1
);

-- Now make it NOT NULL (safe after backfill)
ALTER TABLE public.personal_access_tokens
  ALTER COLUMN organization_id SET NOT NULL;

-- Index for fast lookup by user + org
CREATE INDEX personal_access_tokens_user_org_idx
  ON public.personal_access_tokens (user_id, organization_id);
