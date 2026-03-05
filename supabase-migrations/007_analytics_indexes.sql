-- Migration: Indexes for future analytics (export, date range, search)
-- Run in Supabase SQL Editor. Enables efficient querying for detailed analytics.

-- page_views: date range filtering and grouping
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_user_email_created ON page_views(user_email, created_at DESC);

-- access_requests: funnel and status analysis
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_at ON access_requests(requested_at DESC);
