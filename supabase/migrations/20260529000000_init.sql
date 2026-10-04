-- VendorOS Initialization Migration
-- Date: 2026-05-29

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- STORES TABLE
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    business_type TEXT,
    phone TEXT,
    whatsapp TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.store_settings (
    store_id UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
    gst_rate NUMERIC DEFAULT 0,
    gst_type TEXT DEFAULT 'inclusive', -- 'inclusive' | 'exclusive'
    gst_enabled BOOLEAN DEFAULT false,
    cgst_rate NUMERIC DEFAULT 0,
    sgst_rate NUMERIC DEFAULT 0,
    igst_rate NUMERIC DEFAULT 0,
    currency TEXT DEFAULT 'INR',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    receipt_header TEXT,
    receipt_footer TEXT,
    whatsapp_order_created_template TEXT,
    whatsapp_order_ready_template TEXT,
    whatsapp_order_cancelled_template TEXT,
    printer_type TEXT DEFAULT 'thermal-58mm', -- 'thermal-58mm' | 'thermal-80mm'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- STORE USERS BRIDGE TABLE (Multi-store support)
CREATE TABLE IF NOT EXISTS public.store_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'CASHIER', -- 'OWNER' | 'MANAGER' | 'CASHIER' | 'KITCHEN' | 'DELIVERY'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(store_id, user_id)
);

-- SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    tier TEXT NOT NULL DEFAULT 'starter', -- 'starter' | 'growth' | 'pro' | 'enterprise'
    status TEXT NOT NULL DEFAULT 'active', -- 'active' | 'trialing' | 'past_due' | 'canceled'
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- FEATURE FLAGS TABLE
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(store_id, flag_key)
);

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    image_url TEXT,
    available BOOLEAN NOT NULL DEFAULT true,
    prep_time INTEGER DEFAULT 5, -- minutes
    tax_rate NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- PRODUCT VARIANTS TABLE
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PRODUCT ADDONS TABLE
CREATE TABLE IF NOT EXISTS public.product_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INVENTORY TABLE
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stock NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL DEFAULT 'pcs', -- 'pcs' | 'kg' | 'ltr' | 'packet'
    threshold NUMERIC(10, 2) DEFAULT 0.00,
    cost NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- PRODUCT INGREDIENTS BRIDGE TABLE
CREATE TABLE IF NOT EXISTS public.product_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,
    quantity_used NUMERIC(10, 2) NOT NULL DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, inventory_id)
);

-- CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    birthday DATE,
    notes TEXT,
    orders_count INTEGER DEFAULT 0,
    total_spend NUMERIC(10, 2) DEFAULT 0.00,
    visit_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(store_id, phone)
);

-- ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    order_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received', -- 'received' | 'preparing' | 'ready' | 'collected' | 'completed' | 'cancelled'
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'refunded'
    payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash' | 'upi' | 'card'
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

-- ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    variant_name TEXT,
    qty INTEGER NOT NULL DEFAULT 1,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ORDER ITEM ADDONS TABLE
CREATE TABLE IF NOT EXISTS public.order_item_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LOYALTY POINTS TABLE
CREATE TABLE IF NOT EXISTS public.loyalty_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    points INTEGER NOT NULL DEFAULT 0,
    transaction_type TEXT NOT NULL, -- 'earn' | 'redeem' | 'refund'
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'low_stock' | 'order_delayed' | 'subscription_expiring' | 'payment_failed'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- EVENT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'ORDER_CREATED' | 'ORDER_STATUS_CHANGED' | 'INVENTORY_LOW' | 'PAYMENT_RECEIVED'
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'processed' | 'failed'
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WHATSAPP LOGS TABLE
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    phone TEXT NOT NULL,
    message_type TEXT NOT NULL, -- 'order_created' | 'order_ready' | 'order_cancelled'
    payload JSONB,
    status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'delivered' | 'read' | 'failed'
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- INDEXES FOR TENANT ISOLATION
CREATE INDEX IF NOT EXISTS idx_store_settings_store ON public.store_settings(store_id);
CREATE INDEX IF NOT EXISTS idx_store_users_store ON public.store_users(store_id);
CREATE INDEX IF NOT EXISTS idx_store_users_user ON public.store_users(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_store ON public.subscriptions(store_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_store ON public.feature_flags(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store ON public.categories(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_store ON public.inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_customers_store ON public.customers(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON public.orders(store_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_store ON public.notifications(store_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_store ON public.event_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_store ON public.audit_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_store ON public.whatsapp_logs(store_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Note: RLS Policies would join store_users using auth.uid()

-- ADDITIONAL RELATION & COMPOSITE INDEXES
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_addons_product ON public.product_addons(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_product ON public.product_ingredients(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ingredients_inventory ON public.product_ingredients(inventory_id);
CREATE INDEX IF NOT EXISTS idx_order_item_addons_item ON public.order_item_addons(order_item_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_points_customer ON public.loyalty_points(customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON public.orders(status, created_at DESC);

-- Enable query monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Enable Realtime replication channel filters
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- TRANSACTIONAL RPC FUNCTION FOR ATOMIC INVENTORY DEPLETION
CREATE OR REPLACE FUNCTION public.deplete_inventory_stock(p_items jsonb)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item record;
BEGIN
  -- Loop through array of {id: UUID, qty: numeric} and subtract atomically
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id UUID, qty numeric) LOOP
    -- Input Validation: Ensure quantity is positive
    IF v_item.qty IS NULL OR v_item.qty <= 0 THEN
      RAISE EXCEPTION 'Depletion quantity must be greater than zero';
    END IF;

    UPDATE public.inventory i
    SET stock = greatest(0, stock - v_item.qty),
        updated_at = now()
    WHERE i.id = v_item.id
      -- BOLA Check: Restrict updates to stores the calling user belongs to (unless bypass for local testing)
      AND (auth.uid() IS NULL OR i.store_id IN (
        SELECT store_id FROM public.store_users
        WHERE user_id = auth.uid() AND deleted_at IS NULL
      ));
  END LOOP;
END;
$$;

-- TRANSACTIONAL RPC FUNCTION FOR SECURE ORDER CREATION
CREATE OR REPLACE FUNCTION public.create_order_secure(
    p_store_id UUID,
    p_customer_id UUID,
    p_payment_method TEXT,
    p_discount NUMERIC,
    p_notes TEXT,
    p_items JSONB -- Array of {product_id: UUID, qty: integer, variant_name: text}
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_subtotal NUMERIC(10, 2) := 0.00;
  v_tax NUMERIC(10, 2) := 0.00;
  v_total NUMERIC(10, 2) := 0.00;
  v_gst_rate NUMERIC := 0;
  v_gst_enabled BOOLEAN := false;
  v_gst_type TEXT := 'inclusive';
  v_item record;
  v_prod_price NUMERIC(10, 2);
  v_prod_name TEXT;
  v_item_total NUMERIC(10, 2);
  v_inserted_order JSONB;
BEGIN
  -- 1. BOLA Check: Verify caller belongs to the store
  IF auth.uid() IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.store_users 
    WHERE store_id = p_store_id AND user_id = auth.uid() AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Forbidden: User does not belong to this store';
  END IF;

  -- 2. Fetch Store Settings for Tax
  SELECT gst_rate, COALESCE(gst_enabled, false), COALESCE(gst_type, 'inclusive')
  INTO v_gst_rate, v_gst_enabled, v_gst_type
  FROM public.store_settings
  WHERE store_id = p_store_id;

  -- Generate order number
  v_order_number := 'ORD-' || to_char(now(), 'yymmdd') || '-' || substring(md5(random()::text) from 1 for 4);
  v_order_id := gen_random_uuid();

  -- 3. Calculate subtotal using product IDs and quantities
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, qty integer, variant_name text) LOOP
    -- Fetch product details from DB (Trust only database pricing!)
    SELECT name, price INTO v_prod_name, v_prod_price
    FROM public.products
    WHERE id = v_item.product_id AND store_id = p_store_id;

    IF v_prod_price IS NULL THEN
      RAISE EXCEPTION 'Product not found or mismatch';
    END IF;

    -- Adjust price if variant name is provided
    IF v_item.variant_name IS NOT NULL THEN
      SELECT price INTO v_prod_price
      FROM public.product_variants
      WHERE product_id = v_item.product_id AND name = v_item.variant_name;
    END IF;

    v_item_total := v_prod_price * v_item.qty;
    v_subtotal := v_subtotal + v_item_total;
  END LOOP;

  -- 4. Calculate Tax
  IF v_gst_enabled AND v_gst_rate > 0 THEN
    IF v_gst_type = 'inclusive' THEN
      v_tax := (v_subtotal - p_discount) - (v_subtotal - p_discount) / (1 + v_gst_rate / 100);
      v_total := v_subtotal - p_discount;
    ELSE
      v_tax := (v_subtotal - p_discount) * (v_gst_rate / 100);
      v_total := (v_subtotal - p_discount) + v_tax;
    END IF;
  ELSE
    v_total := v_subtotal - p_discount;
  END IF;

  -- Round values
  v_tax := round(v_tax, 2);
  v_total := round(v_total, 2);

  -- 5. Insert Order
  INSERT INTO public.orders (
    id, store_id, customer_id, order_number, status, payment_status, payment_method, subtotal, tax, discount, total, notes
  ) VALUES (
    v_order_id, p_store_id, p_customer_id, v_order_number, 'received', 'pending', p_payment_method, v_subtotal, v_tax, p_discount, v_total, p_notes
  );

  -- 6. Insert Order Items
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(product_id UUID, qty integer, variant_name text) LOOP
    SELECT name, price INTO v_prod_name, v_prod_price
    FROM public.products WHERE id = v_item.product_id;

    IF v_item.variant_name IS NOT NULL THEN
      SELECT price INTO v_prod_price
      FROM public.product_variants WHERE product_id = v_item.product_id AND name = v_item.variant_name;
    END IF;

    v_item_total := v_prod_price * v_item.qty;

    INSERT INTO public.order_items (
      order_id, product_id, name, variant_name, qty, price, total
    ) VALUES (
      v_order_id, v_item.product_id, v_prod_name, v_item.variant_name, v_item.qty, v_prod_price, v_item_total
    );
  END LOOP;

  -- 7. Construct and return order JSON
  SELECT json_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'tax', v_tax,
    'total', v_total
  )::jsonb INTO v_inserted_order;

  RETURN v_inserted_order;
END;
$$;

-- PROCESSED WEBHOOKS DEDUPLICATION TABLE
CREATE TABLE IF NOT EXISTS public.processed_webhooks (
    event_id TEXT PRIMARY KEY,
    provider TEXT NOT NULL, -- 'razorpay' | 'whatsapp'
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.processed_webhooks ENABLE ROW LEVEL SECURITY;

-- AUDIT TRAIL IMMUTABILITY ENGINE
CREATE OR REPLACE FUNCTION public.block_audit_log_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable and cannot be updated or deleted.';
  RETURN NULL;
END;
$$;

CREATE OR REPLACE TRIGGER trg_block_update_delete_audit_logs
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.block_audit_log_modification();
