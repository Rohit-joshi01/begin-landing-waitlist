-- ==============================================================================
-- BEGIN WAITLIST DATABASE SCHEMA FOR SUPABASE
-- Run this in your Supabase Project -> SQL Editor -> Click "Run"
-- ==============================================================================

-- 1. Create the waitlist table (with linkedin column)
CREATE TABLE IF NOT EXISTS public.waitlist (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    linkedin TEXT,
    city TEXT NOT NULL,
    profile TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. If the table already existed previously without linkedin, add the column seamlessly:
ALTER TABLE public.waitlist ADD COLUMN IF NOT EXISTS linkedin TEXT;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Allow public anonymous submissions to insert
DROP POLICY IF EXISTS "Allow public inserts" ON public.waitlist;
CREATE POLICY "Allow public inserts" ON public.waitlist
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- 5. Policy: Allow service_role full administrative access
DROP POLICY IF EXISTS "Allow service_role full access" ON public.waitlist;
CREATE POLICY "Allow service_role full access" ON public.waitlist
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. Indexes for quick searches and sorting
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON public.waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON public.waitlist(created_at DESC);
