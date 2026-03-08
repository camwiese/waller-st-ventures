-- Migration: Add nda_required column to allowed_emails
-- When true, the user must sign the NDA before accessing the data room.
-- Defaults to true so all new invites require NDA by default.

ALTER TABLE allowed_emails ADD COLUMN nda_required BOOLEAN NOT NULL DEFAULT true;
