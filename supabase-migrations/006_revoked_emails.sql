-- Migration: Soft revoke — keep analytics, hide from display
-- Run in Supabase SQL Editor. When revoking, add to this table instead of deleting analytics.

CREATE TABLE revoked_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  revoked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_revoked_emails_email ON revoked_emails(email);
CREATE INDEX idx_revoked_emails_revoked_at ON revoked_emails(revoked_at DESC);

ALTER TABLE revoked_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON revoked_emails
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON revoked_emails
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
