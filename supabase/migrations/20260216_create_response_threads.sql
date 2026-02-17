-- Migration: Add Response Thread Discussions
-- Feature: 005-response-comments
-- Date: 2026-02-16
-- NOTE: 100% additive — no existing tables modified or dropped

-- ============================================================================
-- 1. Create response_threads table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.response_threads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id     UUID NOT NULL REFERENCES public.responses(id) ON DELETE CASCADE,
    title           TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'open',
    priority        VARCHAR(20) NOT NULL DEFAULT 'normal',
    created_by      UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    resolved_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_thread_status CHECK (status IN ('open', 'resolved')),
    CONSTRAINT valid_thread_priority CHECK (priority IN ('normal', 'important', 'blocking'))
);

CREATE INDEX IF NOT EXISTS idx_response_threads_response
    ON public.response_threads(response_id);

CREATE INDEX IF NOT EXISTS idx_response_threads_status
    ON public.response_threads(status);

CREATE INDEX IF NOT EXISTS idx_response_threads_response_status
    ON public.response_threads(response_id, status);

CREATE TRIGGER update_response_threads_updated_at
    BEFORE UPDATE ON public.response_threads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 2. Create thread_comments table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.thread_comments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id       UUID NOT NULL REFERENCES public.response_threads(id) ON DELETE CASCADE,
    content         TEXT NOT NULL,
    author_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    edited_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thread_comments_thread
    ON public.thread_comments(thread_id);

CREATE INDEX IF NOT EXISTS idx_thread_comments_author
    ON public.thread_comments(author_id);

CREATE TRIGGER update_thread_comments_updated_at
    BEFORE UPDATE ON public.thread_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 3. Row Level Security — response_threads
-- ============================================================================

ALTER TABLE public.response_threads ENABLE ROW LEVEL SECURITY;

-- SELECT: all members of the organization can view threads
CREATE POLICY "org_members_select_threads"
    ON public.response_threads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.responses r
            JOIN public.rfps rfp ON r.rfp_id = rfp.id
            JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
            WHERE r.id = public.response_threads.response_id
            AND uo.user_id = auth.uid()
        )
    );

-- INSERT: assigned evaluator/owner/admin can create threads
CREATE POLICY "assigned_users_insert_threads"
    ON public.response_threads FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.responses r
            JOIN public.rfp_user_assignments rua ON rua.rfp_id = r.rfp_id
            WHERE r.id = public.response_threads.response_id
            AND rua.user_id = auth.uid()
            AND rua.access_level IN ('evaluator', 'owner', 'admin')
        )
    );

-- UPDATE: assigned evaluator/owner/admin can update thread status/priority
CREATE POLICY "assigned_users_update_threads"
    ON public.response_threads FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.responses r
            JOIN public.rfp_user_assignments rua ON rua.rfp_id = r.rfp_id
            WHERE r.id = public.response_threads.response_id
            AND rua.user_id = auth.uid()
            AND rua.access_level IN ('evaluator', 'owner', 'admin')
        )
    );

-- DELETE: only thread creator can delete (when thread has no comments)
CREATE POLICY "creator_delete_empty_threads"
    ON public.response_threads FOR DELETE
    USING (
        created_by = auth.uid()
        AND NOT EXISTS (
            SELECT 1 FROM public.thread_comments tc
            WHERE tc.thread_id = public.response_threads.id
        )
    );

-- ============================================================================
-- 4. Row Level Security — thread_comments
-- ============================================================================

ALTER TABLE public.thread_comments ENABLE ROW LEVEL SECURITY;

-- SELECT: all members of the organization can view comments
CREATE POLICY "org_members_select_comments"
    ON public.thread_comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.response_threads rt
            JOIN public.responses r ON rt.response_id = r.id
            JOIN public.rfps rfp ON r.rfp_id = rfp.id
            JOIN public.user_organizations uo ON uo.organization_id = rfp.organization_id
            WHERE rt.id = public.thread_comments.thread_id
            AND uo.user_id = auth.uid()
        )
    );

-- INSERT: assigned evaluator/owner/admin can add comments
CREATE POLICY "assigned_users_insert_comments"
    ON public.thread_comments FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.response_threads rt
            JOIN public.responses r ON rt.response_id = r.id
            JOIN public.rfp_user_assignments rua ON rua.rfp_id = r.rfp_id
            WHERE rt.id = public.thread_comments.thread_id
            AND rua.user_id = auth.uid()
            AND rua.access_level IN ('evaluator', 'owner', 'admin')
        )
    );

-- UPDATE: only the author can edit their own comments
CREATE POLICY "author_update_own_comments"
    ON public.thread_comments FOR UPDATE
    USING (author_id = auth.uid());

-- DELETE: only the author can delete their own comments
CREATE POLICY "author_delete_own_comments"
    ON public.thread_comments FOR DELETE
    USING (author_id = auth.uid());
