-- Waller Street Ventures Data Room — Fresh Supabase Setup
-- Run this entire file in Supabase SQL Editor for a new project.
-- Combines supabase-setup.sql + all migrations (001–008).

-- ── 1. page_views ──
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
CREATE INDEX idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX idx_page_views_user_email_created ON page_views(user_email, created_at DESC);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON page_views
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON page_views
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ── 2. otp_attempts ──
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

-- ── 3. high_intent_notifications ──
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

-- ── 4. allowed_emails ──
CREATE TABLE allowed_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('admin_added', 'request_approved')),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  invited_by TEXT,
  invited_by_name TEXT,
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

-- ── 5. access_requests ──
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
CREATE INDEX idx_access_requests_requested_at ON access_requests(requested_at DESC);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON access_requests
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON access_requests
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ── 6. access_request_notification_emails ──
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

-- ── 7. revoked_emails ──
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

-- ── 8. resend_email_cache ──
CREATE TABLE resend_email_cache (
  id TEXT PRIMARY KEY DEFAULT 'default',
  data JSONB NOT NULL DEFAULT '[]',
  fetched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE resend_email_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON resend_email_cache
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON resend_email_cache
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ── 9. login_events ──
CREATE TABLE login_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  logged_in_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  is_first_login BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_login_events_user_time ON login_events(user_id, logged_in_at DESC);
CREATE INDEX idx_login_events_email_time ON login_events(email, logged_in_at DESC);

ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON login_events
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON login_events
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ── 10. CMS tenancy + content tables ──
CREATE TABLE deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON deals
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON deals
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE content_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(deal_id, slug)
);

CREATE INDEX idx_content_sections_deal_order ON content_sections(deal_id, display_order);

ALTER TABLE content_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON content_sections
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON content_sections
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE content_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES content_sections(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  type TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '""',
  display_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(section_id, key)
);

CREATE INDEX idx_content_blocks_deal_section ON content_blocks(deal_id, section_id);

ALTER TABLE content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON content_blocks
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON content_blocks
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE TABLE content_changelog (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  block_id UUID REFERENCES content_blocks(id) ON DELETE SET NULL,
  section_slug TEXT NOT NULL,
  section_title TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  previous_content JSONB,
  new_content JSONB,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_email TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_changelog_deal_time ON content_changelog(deal_id, changed_at DESC);
CREATE INDEX idx_changelog_deal_section_time ON content_changelog(deal_id, section_slug, changed_at DESC);

ALTER TABLE content_changelog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON content_changelog
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON content_changelog
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- ── Seed: Add your GP email so you can log in ──
-- INSERT INTO allowed_emails (email, source) VALUES ('your-gp-email@example.com', 'admin_added');
