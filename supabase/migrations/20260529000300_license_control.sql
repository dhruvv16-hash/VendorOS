-- Add license control fields to public.stores table
-- Date: 2026-05-30

ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS license_expires_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN public.stores.is_active IS 'Whether the store is currently active and permitted to use the system.';
COMMENT ON COLUMN public.stores.license_expires_at IS 'Optional timestamp when the store license expires. If null, license does not expire.';
