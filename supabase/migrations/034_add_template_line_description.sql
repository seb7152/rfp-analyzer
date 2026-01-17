-- Add description column to financial_template_lines
ALTER TABLE public.financial_template_lines
ADD COLUMN description text;

COMMENT ON COLUMN public.financial_template_lines.description IS 'Optional description/tooltip for the line item';
