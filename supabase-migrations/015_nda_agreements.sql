-- Migration: NDA agreements tracking
-- Records when users agree to the NDA before accessing the data room.

CREATE TABLE nda_agreements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  agreed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  nda_version TEXT NOT NULL DEFAULT '1.0',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_nda_agreements_email ON nda_agreements(user_email);
CREATE INDEX idx_nda_agreements_email_version ON nda_agreements(user_email, nda_version);

ALTER TABLE nda_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Deny anon access" ON nda_agreements
  FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "Deny authenticated access" ON nda_agreements
  FOR ALL TO authenticated USING (false) WITH CHECK (false);
