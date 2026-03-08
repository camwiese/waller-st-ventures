-- Migration: Partner admins and invited-by-email tracking
-- Adds multi-partner admin support for shared data room management.

-- Partner admins table — team members who can view analytics, manage access, and get notifications
CREATE TABLE IF NOT EXISTS partner_admins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  added_by TEXT,
  notify_on_own_invites BOOLEAN NOT NULL DEFAULT true,
  can_edit_content BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE partner_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON partner_admins
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON partner_admins
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Add invited_by_email to allowed_emails for tracking which admin invited each investor
ALTER TABLE allowed_emails ADD COLUMN IF NOT EXISTS invited_by_email TEXT;
CREATE INDEX IF NOT EXISTS idx_allowed_emails_invited_by_email ON allowed_emails (invited_by_email);
