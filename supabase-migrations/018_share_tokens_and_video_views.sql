-- 018: Share link tokens and video/audio view events

-- Share tokens for bypass-auth content sharing (podcast + deck)
CREATE TABLE IF NOT EXISTS public.share_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('podcast', 'deck')),
  deal_slug TEXT NOT NULL DEFAULT 'pst',
  created_by TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_viewed_at TIMESTAMPTZ,
  view_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_share_tokens_token ON public.share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_share_tokens_email ON public.share_tokens(email);
CREATE INDEX IF NOT EXISTS idx_share_tokens_deal_slug ON public.share_tokens(deal_slug);
CREATE INDEX IF NOT EXISTS idx_share_tokens_content_type ON public.share_tokens(content_type);

ALTER TABLE public.share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access to share_tokens" ON public.share_tokens
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access to share_tokens" ON public.share_tokens
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- View events from share links (podcast + deck)
CREATE TABLE IF NOT EXISTS public.share_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token_id UUID NOT NULL REFERENCES public.share_tokens(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('podcast', 'deck')),
  deal_slug TEXT NOT NULL DEFAULT 'pst',
  mode TEXT CHECK (mode IN ('video', 'audio')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  max_position_seconds INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  device_type TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_share_views_email ON public.share_view_events(user_email);
CREATE INDEX IF NOT EXISTS idx_share_views_token ON public.share_view_events(share_token_id);
CREATE INDEX IF NOT EXISTS idx_share_views_deal_slug ON public.share_view_events(deal_slug);
CREATE INDEX IF NOT EXISTS idx_share_views_created ON public.share_view_events(created_at DESC);

ALTER TABLE public.share_view_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access to share_view_events" ON public.share_view_events
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access to share_view_events" ON public.share_view_events
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- Video view events from authenticated dataroom users
CREATE TABLE IF NOT EXISTS public.video_view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  deal_slug TEXT NOT NULL DEFAULT 'pst',
  mode TEXT NOT NULL CHECK (mode IN ('video', 'audio')),
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  max_position_seconds INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  device_type TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_video_views_email ON public.video_view_events(user_email);
CREATE INDEX IF NOT EXISTS idx_video_views_deal_slug ON public.video_view_events(deal_slug);
CREATE INDEX IF NOT EXISTS idx_video_views_created ON public.video_view_events(created_at DESC);

ALTER TABLE public.video_view_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access to video_view_events" ON public.video_view_events
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access to video_view_events" ON public.video_view_events
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
