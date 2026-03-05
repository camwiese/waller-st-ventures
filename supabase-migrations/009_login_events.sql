-- 009: login_events — tracks every successful OTP verification
CREATE TABLE public.login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  is_first_login BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON public.login_events
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON public.login_events
  FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE INDEX idx_login_events_user_time ON public.login_events (user_id, logged_in_at DESC);
CREATE INDEX idx_login_events_email_time ON public.login_events (email, logged_in_at DESC);
