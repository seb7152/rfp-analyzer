-- Add type column to financial_comments
ALTER TABLE public.financial_comments 
ADD COLUMN type text NOT NULL DEFAULT 'comment' 
CHECK (type IN ('comment', 'warning', 'negotiation'));

-- Add comment on column
COMMENT ON COLUMN public.financial_comments.type IS 'Type of the comment: comment, warning, or negotiation';
