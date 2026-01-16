-- Create financial_comments table
CREATE TABLE IF NOT EXISTS public.financial_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_line_id UUID REFERENCES public.financial_template_lines(id) ON DELETE CASCADE NOT NULL,
    version_id UUID REFERENCES public.financial_offer_versions(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.financial_comments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view comments for RFPs they have access to" ON public.financial_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.financial_template_lines ftl
            JOIN public.financial_templates ft ON ftl.template_id = ft.id
            JOIN public.rfps r ON ft.rfp_id = r.id
            WHERE ftl.id = public.financial_comments.template_line_id
            AND (r.created_by = auth.uid() OR 
                 EXISTS (
                     SELECT 1 FROM public.organization_members om
                     WHERE om.organization_id = r.organization_id
                     AND om.user_id = auth.uid()
                 )
            )
        )
    );

CREATE POLICY "Users can create comments for RFPs they have access to" ON public.financial_comments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.financial_template_lines ftl
            JOIN public.financial_templates ft ON ftl.template_id = ft.id
            JOIN public.rfps r ON ft.rfp_id = r.id
            WHERE ftl.id = public.financial_comments.template_line_id
            AND (r.created_by = auth.uid() OR 
                 EXISTS (
                     SELECT 1 FROM public.organization_members om
                     WHERE om.organization_id = r.organization_id
                     AND om.user_id = auth.uid()
                 )
            )
        )
    );

CREATE POLICY "Users can update their own comments" ON public.financial_comments
    FOR UPDATE
    USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own comments" ON public.financial_comments
    FOR DELETE
    USING (created_by = auth.uid());

-- Add updated_at trigger
CREATE TRIGGER update_financial_comments_updated_at
    BEFORE UPDATE ON public.financial_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
