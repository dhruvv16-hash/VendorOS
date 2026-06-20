-- ==========================================
-- ⚠️ WARNING: DEVELOPMENT ONLY POLICIES ⚠️
-- DO NOT DEPLOY THIS FILE TO PRODUCTION!
-- ==========================================
-- These policies grant unrestricted anonymous public access (read/write/delete)
-- to all tables for local sandbox testing, debugging, and validation.
--
-- In production environments, replace these with secure policies (e.g.,
-- authenticating store managers and cashiers using auth.uid() joins
-- on the store_users bridge table).

-- 1. STORES
CREATE POLICY "Dev public access stores" ON public.stores FOR ALL USING (true) WITH CHECK (true);

-- 2. STORE SETTINGS
CREATE POLICY "Dev public access store_settings" ON public.store_settings FOR ALL USING (true) WITH CHECK (true);

-- 3. USERS
CREATE POLICY "Dev public access users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- 4. STORE USERS
CREATE POLICY "Dev public access store_users" ON public.store_users FOR ALL USING (true) WITH CHECK (true);

-- 5. SUBSCRIPTIONS
CREATE POLICY "Dev public access subscriptions" ON public.subscriptions FOR ALL USING (true) WITH CHECK (true);

-- 6. FEATURE FLAGS
CREATE POLICY "Dev public access feature_flags" ON public.feature_flags FOR ALL USING (true) WITH CHECK (true);

-- 7. CATEGORIES
CREATE POLICY "Dev public access categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- 8. PRODUCTS
CREATE POLICY "Dev public access products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- 9. PRODUCT VARIANTS
CREATE POLICY "Dev public access product_variants" ON public.product_variants FOR ALL USING (true) WITH CHECK (true);

-- 10. PRODUCT ADDONS
CREATE POLICY "Dev public access product_addons" ON public.product_addons FOR ALL USING (true) WITH CHECK (true);

-- 11. INVENTORY
CREATE POLICY "Dev public access inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

-- 12. PRODUCT INGREDIENTS
CREATE POLICY "Dev public access product_ingredients" ON public.product_ingredients FOR ALL USING (true) WITH CHECK (true);

-- 13. CUSTOMERS
CREATE POLICY "Dev public access customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- 14. ORDERS
CREATE POLICY "Dev public access orders" ON public.orders FOR ALL USING (true) WITH CHECK (true);

-- 15. ORDER ITEMS
CREATE POLICY "Dev public access order_items" ON public.order_items FOR ALL USING (true) WITH CHECK (true);

-- 16. ORDER ITEM ADDONS
CREATE POLICY "Dev public access order_item_addons" ON public.order_item_addons FOR ALL USING (true) WITH CHECK (true);

-- 17. LOYALTY POINTS
CREATE POLICY "Dev public access loyalty_points" ON public.loyalty_points FOR ALL USING (true) WITH CHECK (true);

-- 18. NOTIFICATIONS
CREATE POLICY "Dev public access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 19. EVENT LOGS
CREATE POLICY "Dev public access event_logs" ON public.event_logs FOR ALL USING (true) WITH CHECK (true);

-- 20. AUDIT LOGS
CREATE POLICY "Dev public access audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- 21. WHATSAPP LOGS
CREATE POLICY "Dev public access whatsapp_logs" ON public.whatsapp_logs FOR ALL USING (true) WITH CHECK (true);
