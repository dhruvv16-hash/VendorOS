-- VendorOS Seed Script
-- Date: 2026-05-29

-- Seed Stores
INSERT INTO public.stores (id, name, business_type, phone, whatsapp, logo_url)
VALUES 
('d5089f81-5c31-4198-8422-921cf05db631', 'Dhruv Burger Cart', 'Fast Food', '9876543210', '9876543210', '🍔'),
('c5089f81-5c31-4198-8422-921cf05db632', 'Chotu Tea Stall', 'Beverages', '9999888777', '9999888777', '☕')
ON CONFLICT DO NOTHING;

-- Seed Store Settings
INSERT INTO public.store_settings (store_id, gst_rate, gst_type, gst_enabled, cgst_rate, sgst_rate, currency, receipt_header, receipt_footer, printer_type)
VALUES
('d5089f81-5c31-4198-8422-921cf05db631', 5.0, 'inclusive', true, 2.5, 2.5, 'INR', 'DHRUV BURGER CART\nSector 62, Noida', 'Thank you! Visit again for the best burgers.', 'thermal-80mm'),
('c5089f81-5c31-4198-8422-921cf05db632', 0.0, 'inclusive', false, 0.0, 0.0, 'INR', 'CHOTU TEA STALL\nMetro Station Gate 2', 'Chai is love. Keep sipping!', 'thermal-58mm')
ON CONFLICT DO NOTHING;

-- Seed Subscriptions
INSERT INTO public.subscriptions (id, store_id, tier, status)
VALUES
('b1089f81-5c31-4198-8422-921cf05db641', 'd5089f81-5c31-4198-8422-921cf05db631', 'pro', 'active'),
('b1089f81-5c31-4198-8422-921cf05db642', 'c5089f81-5c31-4198-8422-921cf05db632', 'starter', 'active')
ON CONFLICT DO NOTHING;

-- Seed Feature Flags
INSERT INTO public.feature_flags (store_id, flag_key, enabled)
VALUES
('d5089f81-5c31-4198-8422-921cf05db631', 'voice_ordering', true),
('d5089f81-5c31-4198-8422-921cf05db631', 'ai_insights', true),
('c5089f81-5c31-4198-8422-921cf05db632', 'voice_ordering', false),
('c5089f81-5c31-4198-8422-921cf05db632', 'ai_insights', false)
ON CONFLICT DO NOTHING;

-- Seed Categories for Store A
INSERT INTO public.categories (id, store_id, name, sort_order)
VALUES
('e001-c1', 'd5089f81-5c31-4198-8422-921cf05db631', 'Burgers', 1),
('e001-c2', 'd5089f81-5c31-4198-8422-921cf05db631', 'Drinks', 2),
('e001-c3', 'd5089f81-5c31-4198-8422-921cf05db631', 'Sides', 3)
ON CONFLICT DO NOTHING;

-- Seed Categories for Store B
INSERT INTO public.categories (id, store_id, name, sort_order)
VALUES
('e002-c1', 'c5089f81-5c31-4198-8422-921cf05db632', 'Tea', 1),
('e002-c2', 'c5089f81-5c31-4198-8422-921cf05db632', 'Coffee', 2),
('e002-c3', 'c5089f81-5c31-4198-8422-921cf05db632', 'Snacks', 3)
ON CONFLICT DO NOTHING;

-- Seed Products for Store A
INSERT INTO public.products (id, store_id, category_id, name, description, price, available, prep_time, tax_rate)
VALUES
('p101', 'd5089f81-5c31-4198-8422-921cf05db631', 'e001-c1', 'Classic Burger', 'Signature veg patty, lettuce, mayo', 80.00, true, 8, 5.0),
('p102', 'd5089f81-5c31-4198-8422-921cf05db631', 'e001-c1', 'Double Cheese Burger', 'Double patty, double cheese slice, special sauce', 150.00, true, 10, 5.0),
('p103', 'd5089f81-5c31-4198-8422-921cf05db631', 'e001-c2', 'Masala Lemonade', 'Tangy lemonade with secret spice mix', 40.00, true, 3, 5.0),
('p104', 'd5089f81-5c31-4198-8422-921cf05db631', 'e001-c3', 'French Fries', 'Crispy salted golden potato fries', 60.00, true, 5, 5.0)
ON CONFLICT DO NOTHING;

-- Seed Addons for Products
INSERT INTO public.product_addons (id, product_id, name, price)
VALUES
('a101', 'p101', 'Extra Cheese', 20.00),
('a102', 'p101', 'Spicy Jalapenos', 10.00)
ON CONFLICT DO NOTHING;

-- Seed Products for Store B
INSERT INTO public.products (id, store_id, category_id, name, description, price, available, prep_time, tax_rate)
VALUES
('p201', 'c5089f81-5c31-4198-8422-921cf05db632', 'e002-c1', 'Masala Chai', 'Traditional Indian milk tea brewed with spices', 20.00, true, 4, 0.0),
('p202', 'c5089f81-5c31-4198-8422-921cf05db632', 'e002-c1', 'Ginger Tea', 'Strong chai infused with fresh hand-crushed ginger', 25.00, true, 4, 0.0),
('p203', 'c5089f81-5c31-4198-8422-921cf05db632', 'e002-c2', 'Filter Coffee', 'South Indian decoction filter coffee', 30.00, true, 5, 0.0),
('p204', 'c5089f81-5c31-4198-8422-921cf05db632', 'e002-c3', 'Samosa', 'Crispy flaky pastry stuffed with spiced potatoes (2 pcs)', 30.00, true, 2, 0.0)
ON CONFLICT DO NOTHING;

-- Seed Product Variants for Tea (Store B)
INSERT INTO public.product_variants (id, product_id, name, price)
VALUES
('v201-s', 'p201', 'Small', 20.00),
('v201-m', 'p201', 'Medium', 30.00),
('v201-l', 'p201', 'Large', 40.00),
('v202-s', 'p202', 'Small', 25.00),
('v202-l', 'p202', 'Large', 45.00)
ON CONFLICT DO NOTHING;

-- Seed Inventory Items for Store A (Burgers)
INSERT INTO public.inventory (id, store_id, name, stock, unit, threshold, cost)
VALUES
('i101', 'd5089f81-5c31-4198-8422-921cf05db631', 'Burger Buns', 50.00, 'pcs', 10.00, 5.00),
('i102', 'd5089f81-5c31-4198-8422-921cf05db631', 'Burger Patty', 40.00, 'pcs', 10.00, 15.00),
('i103', 'd5089f81-5c31-4198-8422-921cf05db631', 'Cheese Slices', 35.00, 'pcs', 8.00, 8.00),
('i104', 'd5089f81-5c31-4198-8422-921cf05db631', 'Mayonnaise', 2.00, 'kg', 0.50, 120.00)
ON CONFLICT DO NOTHING;

-- Seed Recipes/Ingredients for Burger Products
INSERT INTO public.product_ingredients (product_id, inventory_id, quantity_used)
VALUES
('p101', 'i101', 1.00), -- Classic Burger uses 1 Bun
('p101', 'i102', 1.00), -- Classic Burger uses 1 Patty
('p101', 'i104', 0.02), -- Classic Burger uses 20g Mayo
('p102', 'i101', 1.00), -- Double Burger uses 1 Bun
('p102', 'i102', 2.00), -- Double Burger uses 2 Patties
('p102', 'i103', 2.00)  -- Double Burger uses 2 Cheese slices
ON CONFLICT DO NOTHING;

-- Seed Inventory Items for Store B (Tea)
INSERT INTO public.inventory (id, store_id, name, stock, unit, threshold, cost)
VALUES
('i201', 'c5089f81-5c31-4198-8422-921cf05db632', 'Tea Leaves', 2000.00, 'g', 300.00, 0.40),
('i202', 'c5089f81-5c31-4198-8422-921cf05db632', 'Milk', 10.00, 'ltr', 2.00, 60.00),
('i203', 'c5089f81-5c31-4198-8422-921cf05db632', 'Sugar', 3000.00, 'g', 500.00, 0.05)
ON CONFLICT DO NOTHING;

-- Seed Recipes for Tea Stall
INSERT INTO public.product_ingredients (product_id, inventory_id, quantity_used)
VALUES
('p201', 'i201', 10.00), -- Masala Chai uses 10g tea leaves
('p201', 'i202', 0.10),  -- Masala Chai uses 0.1L milk
('p201', 'i203', 15.00)  -- Masala Chai uses 15g sugar
ON CONFLICT DO NOTHING;

-- Seed CRM Customers
INSERT INTO public.customers (id, store_id, name, phone, orders_count, total_spend, visit_count)
VALUES
('c101', 'd5089f81-5c31-4198-8422-921cf05db631', 'Dhruv', '9876543210', 12, 1850.00, 12),
('c102', 'd5089f81-5c31-4198-8422-921cf05db631', 'Ananya', '9999888777', 4, 380.00, 4),
('c201', 'c5089f81-5c31-4198-8422-921cf05db632', 'Kabir', '8887776665', 1, 30.00, 1)
ON CONFLICT DO NOTHING;

-- Seed Users
INSERT INTO public.users (id, name, phone, email)
VALUES
('u101', 'Dhruv Owner', '9876543210', 'owner@dhruvburgers.com'),
('u102', 'Raju Cashier', '9876543211', 'cashier@dhruvburgers.com'),
('u103', 'Chotu Tea Owner', '9999888777', 'owner@chotutea.com')
ON CONFLICT DO NOTHING;

-- Seed Store User Associations
INSERT INTO public.store_users (store_id, user_id, role)
VALUES
('d5089f81-5c31-4198-8422-921cf05db631', 'u101', 'OWNER'),
('d5089f81-5c31-4198-8422-921cf05db631', 'u102', 'CASHIER'),
('c5089f81-5c31-4198-8422-921cf05db632', 'u103', 'OWNER')
ON CONFLICT DO NOTHING;
