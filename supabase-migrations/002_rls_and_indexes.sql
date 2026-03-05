-- Migration: Fix RLS policies and add composite indexes
-- Run this in the Supabase SQL Editor for existing projects.

-- 1. Drop permissive "Service role full access" policies (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role full access" ON page_views;
DROP POLICY IF EXISTS "Service role full access" ON otp_attempts;
DROP POLICY IF EXISTS "Service role full access" ON high_intent_notifications;

-- 2. Deny access via anon and authenticated roles (only service role can access)
CREATE POLICY "Deny anon access" ON page_views
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON page_views
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON otp_attempts
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON otp_attempts
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE POLICY "Deny anon access" ON high_intent_notifications
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON high_intent_notifications
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- 3. Add composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_page_views_deal_created ON page_views(deal_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_email_deal ON page_views(user_email, deal_slug);
