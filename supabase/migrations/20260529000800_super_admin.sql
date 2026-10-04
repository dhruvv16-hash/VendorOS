-- =========================================================================
-- 👑 SUPER-ADMIN ACCESS AND CONTROL INFRASTRUCTURE
-- =========================================================================

-- 1. Add is_super_admin flag to public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.is_super_admin IS 'Flag indicating if the user has platform-level administrative privileges.';

-- 2. Create helper function user_is_super_admin()
CREATE OR REPLACE FUNCTION public.user_is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND is_super_admin = TRUE
  );
END;
$$;

-- 3. Row-Level Security (RLS) Policy Updates for Super-Admins

-- STORES table policies
DROP POLICY IF EXISTS "Super admin access on stores" ON public.stores;
CREATE POLICY "Super admin access on stores" ON public.stores 
    FOR ALL TO authenticated 
    USING (public.user_is_super_admin()) 
    WITH CHECK (public.user_is_super_admin());

-- USERS table policies
DROP POLICY IF EXISTS "Super admin access on users" ON public.users;
CREATE POLICY "Super admin access on users" ON public.users 
    FOR ALL TO authenticated 
    USING (public.user_is_super_admin()) 
    WITH CHECK (public.user_is_super_admin());

-- STORE_USERS table policies
DROP POLICY IF EXISTS "Super admin access on store_users" ON public.store_users;
CREATE POLICY "Super admin access on store_users" ON public.store_users 
    FOR ALL TO authenticated 
    USING (public.user_is_super_admin()) 
    WITH CHECK (public.user_is_super_admin());

-- STORE_SETTINGS table policies
DROP POLICY IF EXISTS "Super admin access on store_settings" ON public.store_settings;
CREATE POLICY "Super admin access on store_settings" ON public.store_settings 
    FOR ALL TO authenticated 
    USING (public.user_is_super_admin()) 
    WITH CHECK (public.user_is_super_admin());

-- ORDERS table policies (To compute cumulative platform sales metrics)
DROP POLICY IF EXISTS "Super admin access on orders" ON public.orders;
CREATE POLICY "Super admin access on orders" ON public.orders 
    FOR ALL TO authenticated 
    USING (public.user_is_super_admin()) 
    WITH CHECK (public.user_is_super_admin());

-- AUDIT_LOGS table policies (Read only, insertion/update still gated by immutability trigger)
DROP POLICY IF EXISTS "Super admin select on audit_logs" ON public.audit_logs;
CREATE POLICY "Super admin select on audit_logs" ON public.audit_logs 
    FOR SELECT TO authenticated 
    USING (public.user_is_super_admin());

-- NOTIFICATIONS table policies
DROP POLICY IF EXISTS "Super admin access on notifications" ON public.notifications;
CREATE POLICY "Super admin access on notifications" ON public.notifications 
    FOR ALL TO authenticated 
    USING (public.user_is_super_admin()) 
    WITH CHECK (public.user_is_super_admin());

-- 4. Seed Sandbox user as Super Admin in the local/development database
UPDATE public.users 
SET is_super_admin = TRUE,
    access_token_used = 'SANDBOX-TOKEN',
    updated_at = now()
WHERE email = 'sandbox@vendoros.com' OR id = 'u101';
