-- Migration: Add e-sign fields for ESIGN Act / UETA compliance
-- Stores signer's full name and the exact NDA text presented at time of signing.

ALTER TABLE nda_agreements ADD COLUMN signer_name TEXT;
ALTER TABLE nda_agreements ADD COLUMN nda_content TEXT;
