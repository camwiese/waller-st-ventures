-- Migration: Access request notification recipients
-- Run this in the Supabase SQL Editor for existing projects.
-- Emails in this table receive notifications when someone requests access to the data room.

CREATE TABLE access_request_notification_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_access_request_notification_emails_email ON access_request_notification_emails(email);

ALTER TABLE access_request_notification_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON access_request_notification_emails
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON access_request_notification_emails
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
