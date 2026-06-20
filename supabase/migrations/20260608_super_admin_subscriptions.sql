-- =========================================================================
-- 👑 SUPER-ADMIN SUBSCRIPTION ACCESS
-- =========================================================================
-- Enable super-admin operators to manage subscription plan tiers and statuses
-- directly for all stores.

DROP POLICY IF EXISTS "Super admin access on subscriptions" ON public.subscriptions;
CREATE POLICY "Super admin access on subscriptions" ON public.subscriptions
    FOR ALL TO authenticated
    USING (public.user_is_super_admin())
    WITH CHECK (public.user_is_super_admin());

COMMENT ON POLICY "Super admin access on subscriptions" ON public.subscriptions IS 'Allows full read, write, update, delete permissions for authenticated super-admin operators.';
