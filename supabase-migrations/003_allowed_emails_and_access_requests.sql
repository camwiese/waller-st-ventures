-- Migration: Allowed emails and access requests for invite-only Data Room access
-- Run this in the Supabase SQL Editor for existing projects.

-- Allowed emails — approved list; only these can receive OTP and access the room
CREATE TABLE allowed_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('admin_added', 'request_approved')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  invited_by TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_allowed_emails_email ON allowed_emails(email);
CREATE INDEX idx_allowed_emails_created ON allowed_emails(created_at DESC);

ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON allowed_emails
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON allowed_emails
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Access requests — when someone not on the list tries to log in
CREATE TABLE access_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied')) DEFAULT 'pending',
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by TEXT,
  response_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_access_requests_email ON access_requests(email);
CREATE INDEX idx_access_requests_status ON access_requests(status);
CREATE INDEX idx_access_requests_created ON access_requests(created_at DESC);
CREATE INDEX idx_access_requests_response_token ON access_requests(response_token);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON access_requests
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON access_requests
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- IMPORTANT: After running this migration, seed GP_EMAIL so you can still log in:
-- INSERT INTO allowed_emails (email, source) VALUES ('your-gp-email@example.com', 'admin_added');
