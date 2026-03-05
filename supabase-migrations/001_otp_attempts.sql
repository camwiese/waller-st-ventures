-- OTP Attempts — tracks every login/access-link request for admin audit
-- Run this in Supabase SQL Editor for existing projects.

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

-- Service role needs full access (API routes use service role for inserts)
CREATE POLICY "Service role full access" ON otp_attempts
  FOR ALL USING (true) WITH CHECK (true);
