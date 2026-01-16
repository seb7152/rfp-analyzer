-- Drop the existing foreign key constraint
ALTER TABLE public.financial_comments
DROP CONSTRAINT financial_comments_created_by_fkey;

-- Add new foreign key constraint referencing public.users
ALTER TABLE public.financial_comments
ADD CONSTRAINT financial_comments_created_by_fkey
FOREIGN KEY (created_by)
REFERENCES public.users(id)
ON DELETE SET NULL;
