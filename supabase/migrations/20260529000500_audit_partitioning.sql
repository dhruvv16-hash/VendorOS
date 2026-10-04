-- ======================================================
-- 📊 AUDIT TRAIL PARTITIONING & VOLUMETRIC PROTECTION 📊
-- ======================================================
-- This migration converts the audit_logs table into a partitioned table
-- by range on the created_at timestamp. This enables lock-free detachment
-- of older data, archiving to cold WORM S3 storage, and mitigates
-- storage-exhaustion (insert flooding) denial-of-service attempts.

-- 1. Drop existing trigger and function on public.audit_logs to prevent dependencies blocking migration
DROP TRIGGER IF EXISTS trg_block_update_delete_audit_logs ON public.audit_logs;
DROP FUNCTION IF EXISTS public.block_audit_log_modification CASCADE;

-- 2. Rename existing non-partitioned audit_logs to preserve data
ALTER TABLE IF EXISTS public.audit_logs RENAME TO audit_logs_old;

-- 3. Create the new partitioned audit_logs table
-- Note: All unique constraints (including PRIMARY KEYs) on a partitioned table 
-- must include all partition key columns. Thus, we define (id, created_at) as the primary key.
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 4. Create indexes for tenant isolation
CREATE INDEX IF NOT EXISTS idx_audit_logs_store ON public.audit_logs(store_id);

-- 5. Create default and monthly partitions
-- A DEFAULT partition catches any inserts falling outside defined ranges.
CREATE TABLE public.audit_logs_default PARTITION OF public.audit_logs DEFAULT;

-- Specific partitions for May and June 2026 (based on current audit timestamp context)
CREATE TABLE public.audit_logs_2026_05 PARTITION OF public.audit_logs
    FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');

CREATE TABLE public.audit_logs_2026_06 PARTITION OF public.audit_logs
    FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

-- 6. Migrate existing data if the old table exists and has data
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'audit_logs_old'
    ) THEN
        INSERT INTO public.audit_logs (id, store_id, user_id, action, entity_type, entity_id, details, created_at)
        SELECT id, store_id, user_id, action, entity_type, entity_id, details, created_at 
        FROM public.audit_logs_old;
        
        DROP TABLE public.audit_logs_old;
    END IF;
END $$;

-- 7. Enable Row Level Security on the partitioned table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8. Apply RLS policies to the new partitioned table (automatically propagated to child tables)
CREATE POLICY "Audit logs access for members" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Audit logs insert for members" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.user_belongs_to_store(store_id));

-- 9. Re-attach the immutability trigger at the partitioned parent level
-- PostgreSQL 11+ automatically executes parent triggers on partitions.
CREATE OR REPLACE FUNCTION public.block_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted.';
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_block_update_delete_audit_logs
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.block_audit_log_modification();
