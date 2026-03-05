-- Waller Street Ventures Data Room — Supabase Schema Setup
-- Run this in the Supabase SQL Editor after creating your project.

CREATE TABLE page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  deal_slug TEXT NOT NULL,
  tab_id TEXT NOT NULL,
  time_spent_seconds INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_page_views_deal ON page_views(deal_slug);
CREATE INDEX idx_page_views_email ON page_views(user_email);
CREATE INDEX idx_page_views_deal_created ON page_views(deal_slug, created_at DESC);
CREATE INDEX idx_page_views_email_deal ON page_views(user_email, deal_slug);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Deny all access via anon/authenticated roles — only service role can access
CREATE POLICY "Deny anon access" ON page_views
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON page_views
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- OTP Attempts — tracks every login/access-link request for admin audit
CREATE TABLE otp_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'rate_limited', 'error')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_otp_attempts_email ON otp_attempts(email);
CREATE INDEX idx_otp_attempts_created ON otp_attempts(created_at DESC);

ALTER TABLE otp_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON otp_attempts
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON otp_attempts
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- High intent notifications — tracks when we've alerted GP about an investor crossing 50+ intent
CREATE TABLE high_intent_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  deal_slug TEXT NOT NULL,
  intent_score INTEGER NOT NULL,
  notified_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_email, deal_slug)
);

CREATE INDEX idx_high_intent_user_deal ON high_intent_notifications(user_email, deal_slug);

ALTER TABLE high_intent_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON high_intent_notifications
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON high_intent_notifications
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
