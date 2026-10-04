-- ==========================================
-- 🔒 PRODUCTION ROW LEVEL SECURITY POLICIES 🔒
-- ==========================================
-- This script replaces permissive development policies with secure,
-- tenant-isolated policies. It enforces multi-tenant separation using auth.uid()
-- matching against the public.store_users membership bridge.

-- Drop any existing dev policies if they exist (to avoid name conflicts)
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' AND policyname LIKE 'Dev public access%'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- --------------------------------------------------
-- Helper Functions for Policy Evaluations
-- --------------------------------------------------

-- Check if authenticated user belongs to store
CREATE OR REPLACE FUNCTION public.user_belongs_to_store(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_users
    WHERE store_id = p_store_id
      AND user_id = auth.uid()
      AND deleted_at IS NULL
  );
END;
$$;

-- Check if authenticated user is OWNER/MANAGER in store
CREATE OR REPLACE FUNCTION public.user_is_admin_in_store(p_store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_users
    WHERE store_id = p_store_id
      AND user_id = auth.uid()
      AND role IN ('OWNER', 'MANAGER')
      AND deleted_at IS NULL
  );
END;
$$;


-- 1. STORES
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stores access for members" ON public.stores
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(id));

CREATE POLICY "Stores creation for authenticated users" ON public.stores
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "Stores modification for admins" ON public.stores
    FOR UPDATE TO authenticated
    USING (public.user_is_admin_in_store(id));


-- 2. STORE SETTINGS
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store settings access for members" ON public.store_settings
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Store settings modification for admins" ON public.store_settings
    FOR UPDATE TO authenticated
    USING (public.user_is_admin_in_store(store_id))
    WITH CHECK (public.user_is_admin_in_store(store_id));


-- 3. USERS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User can read own profile" ON public.users
    FOR SELECT TO authenticated
    USING (id = auth.uid());

CREATE POLICY "User can update own profile" ON public.users
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "User can insert own profile" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());


-- 4. STORE USERS (Memberships)
ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store users access for members" ON public.store_users
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Store users manipulation for admins" ON public.store_users
    FOR ALL TO authenticated
    USING (public.user_is_admin_in_store(store_id))
    WITH CHECK (public.user_is_admin_in_store(store_id));


-- 5. SUBSCRIPTIONS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscriptions access for members" ON public.subscriptions
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));


-- 6. FEATURE FLAGS
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Feature flags access for members" ON public.feature_flags
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));


-- 7. CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories access for members" ON public.categories
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Categories manipulation for admins" ON public.categories
    FOR ALL TO authenticated
    USING (public.user_is_admin_in_store(store_id))
    WITH CHECK (public.user_is_admin_in_store(store_id));


-- 8. PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products access for members" ON public.products
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Products manipulation for admins" ON public.products
    FOR ALL TO authenticated
    USING (public.user_is_admin_in_store(store_id))
    WITH CHECK (public.user_is_admin_in_store(store_id));


-- 9. PRODUCT VARIANTS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product variants access for members" ON public.product_variants
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_id AND public.user_belongs_to_store(p.store_id)
    ));

CREATE POLICY "Product variants manipulation for admins" ON public.product_variants
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_id AND public.user_is_admin_in_store(p.store_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_id AND public.user_is_admin_in_store(p.store_id)
    ));


-- 10. PRODUCT ADDONS
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product addons access for members" ON public.product_addons
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_id AND public.user_belongs_to_store(p.store_id)
    ));

CREATE POLICY "Product addons manipulation for admins" ON public.product_addons
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_id AND public.user_is_admin_in_store(p.store_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_id AND public.user_is_admin_in_store(p.store_id)
    ));


-- 11. INVENTORY
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inventory access for members" ON public.inventory
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Inventory manipulation for members" ON public.inventory
    FOR ALL TO authenticated
    USING (public.user_belongs_to_store(store_id))
    WITH CHECK (public.user_belongs_to_store(store_id));


-- 12. PRODUCT INGREDIENTS
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product ingredients access for members" ON public.product_ingredients
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_id AND public.user_belongs_to_store(p.store_id)
    ));

CREATE POLICY "Product ingredients manipulation for admins" ON public.product_ingredients
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_id AND public.user_is_admin_in_store(p.store_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = product_id AND public.user_is_admin_in_store(p.store_id)
    ));


-- 13. CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers access for members" ON public.customers
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Customers manipulation for members" ON public.customers
    FOR ALL TO authenticated
    USING (public.user_belongs_to_store(store_id))
    WITH CHECK (public.user_belongs_to_store(store_id));


-- 14. ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Orders access for members" ON public.orders
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Orders manipulation for members" ON public.orders
    FOR ALL TO authenticated
    USING (public.user_belongs_to_store(store_id))
    WITH CHECK (public.user_belongs_to_store(store_id));


-- 15. ORDER ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items access for members" ON public.order_items
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND public.user_belongs_to_store(o.store_id)
    ));

CREATE POLICY "Order items manipulation for members" ON public.order_items
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND public.user_belongs_to_store(o.store_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = order_id AND public.user_belongs_to_store(o.store_id)
    ));


-- 16. ORDER ITEM ADDONS
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order item addons access for members" ON public.order_item_addons
    FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.id = order_item_id AND public.user_belongs_to_store(o.store_id)
    ));

CREATE POLICY "Order item addons manipulation for members" ON public.order_item_addons
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.id = order_item_id AND public.user_belongs_to_store(o.store_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        WHERE oi.id = order_item_id AND public.user_belongs_to_store(o.store_id)
    ));


-- 17. LOYALTY POINTS
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Loyalty points access for members" ON public.loyalty_points
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Loyalty points manipulation for members" ON public.loyalty_points
    FOR ALL TO authenticated
    USING (public.user_belongs_to_store(store_id))
    WITH CHECK (public.user_belongs_to_store(store_id));


-- 18. NOTIFICATIONS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications access for members" ON public.notifications
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Notifications manipulation for members" ON public.notifications
    FOR ALL TO authenticated
    USING (public.user_belongs_to_store(store_id))
    WITH CHECK (public.user_belongs_to_store(store_id));


-- 19. EVENT LOGS
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event logs access for members" ON public.event_logs
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));


-- 20. AUDIT LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audit logs access for members" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Audit logs insert for members" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.user_belongs_to_store(store_id));


-- 21. WHATSAPP LOGS
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Whatsapp logs access for members" ON public.whatsapp_logs
    FOR SELECT TO authenticated
    USING (public.user_belongs_to_store(store_id));

CREATE POLICY "Whatsapp logs manipulation for members" ON public.whatsapp_logs
    FOR ALL TO authenticated
    USING (public.user_belongs_to_store(store_id))
    WITH CHECK (public.user_belongs_to_store(store_id));


-- 22. PROCESSED WEBHOOKS
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon and auth inserts on processed_webhooks" ON public.processed_webhooks
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY "Allow read access on processed_webhooks for members" ON public.processed_webhooks
    FOR SELECT TO authenticated
    USING (true);
