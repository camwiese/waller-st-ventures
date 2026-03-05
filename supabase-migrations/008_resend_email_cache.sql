-- Migration: Resend email cache for admin Pending Access section
-- Avoids calling Resend API on every admin page load. Cache TTL: 15 minutes.
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS resend_email_cache (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data JSONB NOT NULL DEFAULT '[]',
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE resend_email_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON resend_email_cache
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON resend_email_cache
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
