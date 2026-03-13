-- Deduplication table for share link view notifications
-- One notification per investor per content type per deal
CREATE TABLE IF NOT EXISTS public.share_view_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('podcast', 'deck')),
  deal_slug TEXT NOT NULL DEFAULT 'pst',
  notified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_email, content_type, deal_slug)
);

CREATE INDEX IF NOT EXISTS idx_share_view_notif_email
  ON public.share_view_notifications(user_email, deal_slug);

ALTER TABLE public.share_view_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'share_view_notifications' AND policyname = 'Deny anon access to share_view_notifications'
  ) THEN
    CREATE POLICY "Deny anon access to share_view_notifications"
      ON public.share_view_notifications
      FOR ALL TO anon USING (false) WITH CHECK (false);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'share_view_notifications' AND policyname = 'Deny authenticated access to share_view_notifications'
  ) THEN
    CREATE POLICY "Deny authenticated access to share_view_notifications"
      ON public.share_view_notifications
      FOR ALL TO authenticated USING (false) WITH CHECK (false);
  END IF;
END $$;
