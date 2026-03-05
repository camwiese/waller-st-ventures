-- Migration: Add deal_slug indexes for analytics filtering

CREATE INDEX IF NOT EXISTS idx_page_views_deal_slug_created_at
  ON page_views(deal_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_page_views_deal_slug_user_email_created
  ON page_views(deal_slug, user_email, created_at DESC);
