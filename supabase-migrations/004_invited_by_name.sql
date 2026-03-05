-- Add invited_by_name for personalized invite emails (e.g. "Luke Walquist confirmed your access")
ALTER TABLE allowed_emails ADD COLUMN IF NOT EXISTS invited_by_name TEXT;
