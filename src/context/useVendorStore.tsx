'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { eventBus } from '@/packages/events';
import { hasPermission, isActionAllowedForTier, UserRole, SubscriptionTier } from '@/packages/auth';
import { calculateGST, generateThermalReceipt, TaxConfig } from '@/packages/billing';
import { whatsappService } from '@/packages/whatsapp';
import { calculateSalesSummary, generatePlatformInsights } from '@/packages/analytics';
import { diagnostics } from '@/packages/ui';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import posthog from 'posthog-js';


// Database Models Interfaces
export interface Store {
  id: string;
  name: string;
  businessType: string;
  phone: string;
  whatsapp: string;
  logoUrl: string;
  isActive?: boolean;
  licenseExpiresAt?: string | null;
}

export interface StoreSettings {
  gstRate: number;
  gstType: 'inclusive' | 'exclusive';
  gstEnabled: boolean;
  currency: string;
  receiptHeader: string;
  receiptFooter: string;
  printerType: 'thermal-58mm' | 'thermal-80mm';
  whatsappOrderPlacedTemplate?: string;
  whatsappOrderReadyTemplate?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  category: string;
  prepTime: number;
  taxRate: number;
  image?: string;
  variants?: Array<{ name: string; price: number }>;
  addons?: Array<{ name: string; price: number }>;
  ingredients?: Array<{ inventoryId: string; qty: number }>; // Recipe for auto-deduction
}

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  unit: string;
  threshold: number;
  cost: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  ordersCount: number;
  totalSpend: number;
  visitCount: number;
  notes?: string;
  loyaltyPoints: number;
  segment: 'New' | 'Frequent' | 'VIP' | 'Inactive';
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  variantName?: string;
  qty: number;
  price: number;
  total: number;
  addons?: Array<{ name: string; price: number }>;
}

export interface Order {
  id: string;
  orderNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: 'received' | 'preparing' | 'ready' | 'collected' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'paid' | 'refunded';
  paymentMethod: 'cash' | 'upi' | 'card';
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string;
  createdAt: Date;
  items: OrderItem[];
  isOfflinePending?: boolean;
}

export interface Notification {
  id: string;
  type: 'low_stock' | 'order_delayed' | 'subscription_expiring' | 'payment_failed' | 'security_anomaly';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: Date;
}

interface VendorContextProps {
  currentStore: Store | null;
  stores: Store[];
  storeSettings: StoreSettings;
  activeUser: { id: string; name: string; role: UserRole } | null;
  subscriptionTier: SubscriptionTier;
  categories: string[];
  products: Product[];
  inventory: InventoryItem[];
  customers: Customer[];
  orders: Order[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  whatsappLogs: any[];
  isOffline: boolean;
  isSandbox: boolean;
  supabaseError: string | null;
  hasMoreOrders: boolean;
  sessionUser: any | null;
  userProfile: any | null;
  authInitialized: boolean;
  
  // Actions
  changeStore: (storeId: string) => void;
  createStore: (name: string, businessType: string, phone: string, logoUrl: string, licenseDays?: number) => Promise<void>;
  updateSettings: (settings: Partial<StoreSettings>) => void;
  changeUserRole: (role: UserRole) => void;
  createOrder: (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: Order['status']) => Promise<void>;
  updateInventoryStock: (itemId: string, newStock: number) => void;
  updateInventoryThreshold: (itemId: string, newThreshold: number) => void;
  addProduct: (product: Omit<Product, 'id'>) => void;
  editProduct: (id: string, product: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addCategory: (name: string) => void;
  syncOfflineQueue: () => Promise<void>;
  clearDatabase: () => void;
  sendMockCampaign: (campaignText: string, segment: string) => void;
  loadMoreOrders: () => Promise<void>;
  isDarkMode: boolean;
  toggleTheme: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, token?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  claimAccessToken: (token: string) => Promise<boolean>;
  createProductQuick: (name: string, price: number, category: string, emoji: string) => Promise<void>;
  createProductsBulk: (items: Array<{ name: string; price: number; category: string; emoji: string }>) => Promise<void>;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;

}

const VendorContext = createContext<VendorContextProps | undefined>(undefined);

export const VendorProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Connection states
  const [isOffline, setIsOffline] = useState(false);
  const [isSandbox, setIsSandbox] = useState(true);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);

  // Core Data sets
  const [stores, setStores] = useState<Store[]>([]);
  const [currentStore, setCurrentStore] = useState<Store | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({
    gstRate: 5.0,
    gstType: 'inclusive',
    gstEnabled: true,
    currency: 'INR',
    receiptHeader: '',
    receiptFooter: '',
    printerType: 'thermal-58mm',
    whatsappOrderPlacedTemplate: 'Hi {name} 👋\n\nOrder #{orderId} received!\n\n🛍️ ITEMS:\n{items}\n\n💰 Total Bill: ₹{total}\n💳 Payment: {payment}\n\n👨‍🍳 We are preparing your fresh order.',
    whatsappOrderReadyTemplate: 'Hi {name} 👋\n\n🔔 Order #{orderId} is READY for collection!\n\nPlease collect it at the counter.\n\nThank you for ordering with us!'
  });
  
  const [sessionUser, setSessionUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const [activeUser, setActiveUser] = useState<{ id: string; name: string; role: UserRole } | null>(
    isSupabaseConfigured
      ? null
      : {
          id: 'u101',
          name: 'Sandbox Owner',
          role: 'SUPER_ADMIN'
        }
  );
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('pro');

  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [hasMoreOrders, setHasMoreOrders] = useState(false);
  const [lastOrderCursor, setLastOrderCursor] = useState<string | null>(null);

  const [isDarkMode, setIsDarkMode] = useState(true);

  // Sync dark class on document element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const html = document.documentElement;
      if (isDarkMode) {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Helper to split strings in client fallback
  const split_part = (str: string, separator: string, index: number) => {
    return str.split(separator)[index] || '';
  };

  // Fetch User Profile from Supabase
  const fetchUserProfile = async (userId: string) => {
    if (!supabase) return;
    try {
      let { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      // Retry once if trigger is slow
      if (!data) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResult = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        data = retryResult.data;
        if (retryResult.error) throw retryResult.error;
      }

      // If still no profile, create it manually as fallback
      if (!data) {
        console.warn('Profile trigger didn\'t run, creating profile manually as fallback...');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const newProfile = {
            id: user.id,
            name: user.user_metadata?.name || split_part(user.email || '', '@', 0) || 'Staff User',
            email: user.email || '',
            phone: user.phone || '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          const { error: insertErr } = await supabase
            .from('users')
            .insert(newProfile);
          if (!insertErr) {
            data = newProfile;
          }
        }
      }

      if (data) {
        setUserProfile(data);
        setActiveUser({
          id: data.id,
          name: data.name || 'Staff User',
          role: data.is_super_admin ? 'SUPER_ADMIN' : 'OWNER'
        });
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
    }
  };

  // Init DB and local-first data loading / Auth Setup
  useEffect(() => {
    // Check network
    const updateOnlineStatus = () => setIsOffline(!navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    if (!isSupabaseConfigured || !supabase) {
      const dummyUser = { id: 'u101', name: 'Sandbox Owner', email: 'sandbox@vendoros.com', role: 'SUPER_ADMIN' };
      setSessionUser(dummyUser);
      setUserProfile({ id: 'u101', name: 'Sandbox Owner', email: 'sandbox@vendoros.com', access_token_used: 'SANDBOX-TOKEN', is_super_admin: true });
      setActiveUser({ id: 'u101', name: 'Sandbox Owner', role: 'SUPER_ADMIN' });
      setIsSandbox(true);
      setAuthInitialized(true);
      loadLocalStorageDatabase();
    } else {
      // Watchdog timer to ensure the app is never stuck on "Initializing VendorOS Environment..."
      const watchdog = setTimeout(() => {
        console.warn('[Supabase Auth] Watchdog triggered - forcing auth initialized');
        setAuthInitialized(true);
      }, 3500);

      // Supabase Auth listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[Supabase Auth] Event:', event, session?.user?.email);
        const currentUser = session?.user || null;

        try {
          if (currentUser) {
            setIsSandbox(false);
            setSessionUser(currentUser);
            await fetchUserProfile(currentUser.id);

            // Check for pending token to claim
            const pendingToken = localStorage.getItem(`pending_access_token_${currentUser.email}`);
            if (pendingToken && supabase) {
              try {
                console.log('[Supabase Auth] Auto-claiming pending access token...');
                const { data: claimed } = await supabase.rpc('claim_access_token', { p_token: pendingToken });
                if (claimed) {
                  localStorage.removeItem(`pending_access_token_${currentUser.email}`);
                  await fetchUserProfile(currentUser.id);
                }
              } catch (err) {
                console.error('Failed to claim pending access token:', err);
              }
            }
          } else {
            // Restore sandbox session if available
            const cachedSandbox = localStorage.getItem('sandbox_session');
            if (cachedSandbox) {
              try {
                const parsed = JSON.parse(cachedSandbox);
                setIsSandbox(true);
                setSessionUser(parsed);
                const isUserSuper = parsed.role === 'SUPER_ADMIN' || parsed.email === 'sandbox@vendoros.com';
                setUserProfile({ id: parsed.id, name: parsed.name, email: parsed.email, access_token_used: 'SANDBOX-TOKEN', is_super_admin: isUserSuper });
                setActiveUser({ id: parsed.id, name: parsed.name, role: parsed.role || 'SUPER_ADMIN' });
              } catch (e) {
                console.error('Error parsing sandbox session:', e);
                localStorage.removeItem('sandbox_session');
                setSessionUser(null);
                setUserProfile(null);
                setActiveUser(null);
                setStores([]);
                setCurrentStore(null);
              }
            } else {
              setSessionUser(null);
              setUserProfile(null);
              setActiveUser(null);
              setStores([]);
              setCurrentStore(null);
            }
          }
        } catch (e) {
          console.error('[Supabase Auth] Error in auth callback:', e);
        } finally {
          clearTimeout(watchdog);
          setAuthInitialized(true);
        }
      });

      return () => {
        clearTimeout(watchdog);
        subscription.unsubscribe();
        window.removeEventListener('online', updateOnlineStatus);
        window.removeEventListener('offline', updateOnlineStatus);
      };
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Load stores when authenticated user is set
  useEffect(() => {
    if (!authInitialized || !sessionUser) return;

    const loadUserStores = async () => {
      if (isSandbox || sessionUser.id === 'u101') {
        loadLocalStorageDatabase();
        return;
      }
      if (!supabase) return;
      try {
        const { data: dbStoreUsers, error: storeUsersErr } = await supabase
          .from('store_users')
          .select('role, store_id, stores(*)')
          .eq('user_id', sessionUser.id);

        if (storeUsersErr) {
          console.error('[Supabase] store_users query error:', storeUsersErr);
          setSupabaseError(storeUsersErr.message);
          return;
        }

        if (dbStoreUsers && dbStoreUsers.length > 0) {
          const mappedStores = dbStoreUsers
            .filter((su: any) => su.stores)
            .map((su: any) => {
              const s = su.stores;
              return {
                id: s.id,
                name: s.name,
                businessType: s.business_type || 'Food Cart',
                phone: s.phone || '',
                whatsapp: s.whatsapp || '',
                logoUrl: s.logo_url || '🍔',
                isActive: s.is_active !== false,
                licenseExpiresAt: s.license_expires_at || null
              };
            });
          
          setStores(mappedStores);
          
          const savedStoreId = localStorage.getItem(`last_store_id_${sessionUser.id}`);
          const selected = mappedStores.find(s => s.id === savedStoreId) || mappedStores[0];
          setCurrentStore(selected);
          
          if (selected) {
            await loadStoreDataFromSupabase(selected.id);
          }
        } else {
          setStores([]);
          setCurrentStore(null);
        }
      } catch (err: any) {
        console.error('Error loading user stores:', err);
        setSupabaseError(err.message || 'Failed to load stores');
      }
    };

    loadUserStores();
  }, [sessionUser, authInitialized, isSandbox]);

  // Scoped Real-time Supabase Database Syncing
  useEffect(() => {
    if (!supabase || !currentStore?.id) return;

    const storeId = currentStore.id;

    // Filter changes by active store_id
    const ordersChannel = supabase
      .channel(`orders_sync_${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`
        },
        async (payload) => {
          console.log('[Realtime Sync] Order update event:', payload);
          await loadStoreDataFromSupabase(storeId);
        }
      )
      .subscribe();

    const inventoryChannel = supabase
      .channel(`inventory_sync_${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory',
          filter: `store_id=eq.${storeId}`
        },
        async (payload) => {
          console.log('[Realtime Sync] Inventory update event:', payload);
          await loadStoreDataFromSupabase(storeId);
        }
      )
      .subscribe();

    const notificationsChannel = supabase
      .channel(`notifications_sync_${storeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `store_id=eq.${storeId}`
        },
        async (payload) => {
          console.log('[Realtime Sync] Notification update event:', payload);
          await loadStoreDataFromSupabase(storeId);
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(ordersChannel);
        supabase.removeChannel(inventoryChannel);
        supabase.removeChannel(notificationsChannel);
      }
    };
  }, [supabase, currentStore?.id]);

  // Listen to EventBus for event-driven flows
  useEffect(() => {
    const handleOrderCreated = async (payload: any) => {
      // 1. Audit Log Event
      addAuditLogEntry(
        'CREATE_ORDER',
        'orders',
        payload.orderId,
        `Order #${payload.orderId} submitted by ${activeUser?.name || 'Cashier'} for ₹${payload.total}`
      );

      // 2. CRM Update
      if (payload.customerPhone) {
        updateOrCreateCustomer(payload.customerPhone, payload.customerName || 'Guest', payload.total);
      }

      // 3. Inventory depletion (Aggregated & transactional RPC update)
      const depletions: Record<string, number> = {};

      payload.items.forEach((item: any) => {
        const product = products.find(p => p.name === item.name);
        if (product && product.ingredients) {
          product.ingredients.forEach(recipe => {
            const qtyDepleted = recipe.qty * item.qty;
            depletions[recipe.inventoryId] = (depletions[recipe.inventoryId] || 0) + qtyDepleted;
          });
        }
      });

      const depletionList = Object.keys(depletions).map(inventoryId => ({
        id: inventoryId,
        qty: depletions[inventoryId]
      }));

      if (depletionList.length > 0) {
        const nextInventory = inventory.map(item => {
          if (depletions[item.id]) {
            const nextStock = Math.max(0, item.stock - depletions[item.id]);

            if (nextStock <= item.threshold) {
              addNotificationEntry(
                'low_stock',
                'Low Stock Alert!',
                `${item.name} has dropped to ${nextStock} ${item.unit}. Please restock immediately.`
              );
              eventBus.publish('INVENTORY_LOW', {
                inventoryId: item.id,
                storeId: currentStore?.id || '',
                name: item.name,
                stock: nextStock,
                threshold: item.threshold,
                unit: item.unit
              });
            }
            return { ...item, stock: nextStock };
          }
          return item;
        });

        setInventory(nextInventory);
        if (currentStore) {
          localStorage.setItem(`db_inventory_${currentStore.id}`, JSON.stringify(nextInventory));
        }

        if (isSupabaseConfigured && supabase && !payload.isDepletedOnServer && !isSandbox) {
          (async () => {
            try {
              const { error } = await supabase.rpc('deplete_inventory_stock', { p_items: depletionList });
              if (error) {
                console.error('[Supabase RPC] Stock depletion error:', error);
                diagnostics.logException({
                  storeId: currentStore?.id || 'global',
                  eventType: 'database_failure',
                  error: new Error(error.message)
                });
              } else {
                console.log('[Supabase RPC] Stock depleted successfully.');
              }
            } catch (err: any) {
              console.error('[Supabase RPC] Stock depletion runtime error:', err);
            }
          })();
        }
      }

      // 4. Send WhatsApp Notification
      if (payload.customerPhone) {
        const summary = payload.items.map((i: any) => `${i.name} x${i.qty}`).join('\n');
        whatsappService.sendNotification(
          payload.storeId,
          payload.orderId,
          payload.customerPhone,
          payload.customerName || 'Guest',
          payload.orderId, // using number as label
          'order_received',
          summary,
          payload.total,
          payload.paymentStatus || 'paid',
          payload.paymentMethod || 'upi',
          storeSettings.whatsappOrderPlacedTemplate
        );
      }
    };

    const handleOrderStatusChanged = (payload: any) => {
      addAuditLogEntry(
        'UPDATE_ORDER_STATUS',
        'orders',
        payload.orderId,
        `Order #${payload.orderNumber} status changed from ${payload.oldStatus} to ${payload.newStatus}`
      );

      if (payload.customerPhone) {
        const statusType = payload.newStatus === 'ready' 
          ? 'order_ready' 
          : payload.newStatus === 'cancelled' 
          ? 'order_cancelled' 
          : null;
        
        if (statusType) {
          whatsappService.sendNotification(
            payload.storeId,
            payload.orderId,
            payload.customerPhone,
            payload.customerName || 'Guest',
            payload.orderNumber,
            statusType,
            payload.itemsSummary,
            payload.total,
            undefined,
            undefined,
            statusType === 'order_ready' 
              ? storeSettings.whatsappOrderReadyTemplate 
              : undefined
          );
        }
      }
    };

    const handleWhatsAppLogged = () => {
      if (currentStore) {
        setWhatsappLogs([...whatsappService.getLogs(currentStore.id)]);
      }
    };

    // Subscriptions
    eventBus.subscribe('ORDER_CREATED', handleOrderCreated);
    eventBus.subscribe('ORDER_STATUS_CHANGED', handleOrderStatusChanged);
    
    // Bind mock WhatsApp service dispatcher back to state logger
    const { whatsappSimulatorEvents } = require('@/packages/whatsapp');
    whatsappSimulatorEvents.on('message_logged', handleWhatsAppLogged);
    whatsappSimulatorEvents.on('message_status_updated', handleWhatsAppLogged);

    return () => {
      eventBus.unsubscribe('ORDER_CREATED', handleOrderCreated);
      eventBus.unsubscribe('ORDER_STATUS_CHANGED', handleOrderStatusChanged);
      whatsappSimulatorEvents.off('message_logged', handleWhatsAppLogged);
      whatsappSimulatorEvents.off('message_status_updated', handleWhatsAppLogged);
    };
  }, [products, inventory, currentStore, activeUser]);

  // Database Initialize & Seeding
  const loadStoreDataFromSupabase = async (storeId: string) => {
    if (!supabase) return;
    try {
      // Execute all reads concurrently with explicit column selections (Promise.all)
      const [
        resSettings,
        resCategories,
        resProducts,
        resInventory,
        resCustomers,
        resOrders,
        resNotifications,
        resAudit,
        resWhatsAppLogs
      ] = await Promise.all([
        supabase
          .from('store_settings')
          .select('gst_rate, gst_type, gst_enabled, currency, receipt_header, receipt_footer, printer_type, whatsapp_order_created_template, whatsapp_order_ready_template')
          .eq('store_id', storeId)
          .maybeSingle(),
        supabase
          .from('categories')
          .select('id, name, sort_order')
          .eq('store_id', storeId),
        supabase
          .from('products')
          .select('id, name, description, price, available, category_id, prep_time, tax_rate, image_url, product_variants(name, price), product_addons(name, price), product_ingredients(inventory_id, quantity_used)')
          .eq('store_id', storeId),
        supabase
          .from('inventory')
          .select('id, name, stock, unit, threshold, cost')
          .eq('store_id', storeId),
        supabase
          .from('customers')
          .select('id, name, phone, orders_count, total_spend, visit_count, notes')
          .eq('store_id', storeId),
        supabase
          .from('orders')
          .select('id, store_id, customer_id, customers(name, phone), order_number, status, payment_status, payment_method, subtotal, tax, discount, total, notes, created_at, order_items(id, name, variant_name, qty, price, total)')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('notifications')
          .select('id, type, title, message, read, created_at')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('audit_logs')
          .select('id, user_id, action, entity_type, entity_id, details, created_at')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('whatsapp_logs')
          .select('id, store_id, order_id, phone, message_type, payload, status, error_message, created_at')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
          .limit(50)
      ]);

      if (resSettings.error) throw resSettings.error;
      if (resCategories.error) throw resCategories.error;
      if (resProducts.error) throw resProducts.error;
      if (resInventory.error) throw resInventory.error;
      if (resCustomers.error) throw resCustomers.error;
      if (resOrders.error) throw resOrders.error;
      if (resNotifications.error) throw resNotifications.error;
      if (resAudit.error) throw resAudit.error;
      if (resWhatsAppLogs.error) throw resWhatsAppLogs.error;

      if (resSettings.data) {
        const dbSettings = resSettings.data;
        setStoreSettings({
          gstRate: Number(dbSettings.gst_rate) || 0,
          gstType: (dbSettings.gst_type as any) || 'inclusive',
          gstEnabled: !!dbSettings.gst_enabled,
          currency: dbSettings.currency || 'INR',
          receiptHeader: dbSettings.receipt_header || '',
          receiptFooter: dbSettings.receipt_footer || '',
          printerType: (dbSettings.printer_type as any) || 'thermal-58mm',
          whatsappOrderPlacedTemplate: dbSettings.whatsapp_order_created_template || 'Hi {name} 👋\n\nOrder #{orderId} received!\n\n🛍️ ITEMS:\n{items}\n\n💰 Total Bill: ₹{total}\n💳 Payment: {payment}\n\n👨‍🍳 We are preparing your fresh order.',
          whatsappOrderReadyTemplate: dbSettings.whatsapp_order_ready_template || 'Hi {name} 👋\n\n🔔 Order #{orderId} is READY for collection!\n\nPlease collect it at the counter.\n\nThank you for ordering with us!'
        });
      }

      const categoryMap = new Map<string, string>();
      if (resCategories.data) {
        resCategories.data.forEach(c => {
          categoryMap.set(c.id, c.name);
        });
        setCategories(resCategories.data.map(c => c.name));
      }

      if (resProducts.data) {
        setProducts(resProducts.data.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: Number(p.price) || 0,
          available: !!p.available,
          category: categoryMap.get(p.category_id) || '',
          prepTime: p.prep_time || 5,
          taxRate: Number(p.tax_rate) || 0,
          image: p.image_url || undefined,
          variants: p.product_variants?.map((v: any) => ({ name: v.name, price: Number(v.price) })) || [],
          addons: p.product_addons?.map((a: any) => ({ name: a.name, price: Number(a.price) })) || [],
          ingredients: p.product_ingredients?.map((i: any) => ({ inventoryId: i.inventory_id, qty: Number(i.quantity_used) })) || []
        })));
      }

      if (resInventory.data) {
        setInventory(resInventory.data.map((i: any) => ({
          id: i.id,
          name: i.name,
          stock: Number(i.stock) || 0,
          unit: i.unit || 'pcs',
          threshold: Number(i.threshold) || 0,
          cost: Number(i.cost) || 0
        })));
      }

      if (resCustomers.data) {
        setCustomers(resCustomers.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          ordersCount: c.orders_count || 0,
          totalSpend: Number(c.total_spend) || 0,
          visitCount: c.visit_count || 0,
          notes: c.notes || undefined,
          loyaltyPoints: c.orders_count ? Math.floor(Number(c.total_spend)) : 0,
          segment: c.visit_count > 10 ? 'VIP' : c.visit_count > 4 ? 'Frequent' : 'New'
        })));
      }

      if (resOrders.data) {
        const fetchedOrders = resOrders.data;
        const mappedOrders = fetchedOrders.map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          customerId: o.customer_id || undefined,
          customerName: o.customers?.name || undefined,
          customerPhone: o.customers?.phone || undefined,
          status: o.status as any,
          paymentStatus: o.payment_status as any,
          paymentMethod: o.payment_method as any,
          subtotal: Number(o.subtotal) || 0,
          tax: Number(o.tax) || 0,
          discount: Number(o.discount) || 0,
          total: Number(o.total) || 0,
          notes: o.notes || undefined,
          createdAt: new Date(o.created_at),
          items: o.order_items?.map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            name: item.name,
            variantName: item.variant_name || undefined,
            qty: item.qty,
            price: Number(item.price) || 0,
            total: Number(item.total) || 0
          })) || []
        }));
        setOrders(mappedOrders);

        if (fetchedOrders.length === 15) {
          setHasMoreOrders(true);
          setLastOrderCursor(fetchedOrders[fetchedOrders.length - 1].created_at);
        } else {
          setHasMoreOrders(false);
          setLastOrderCursor(null);
        }
      }

      if (resNotifications.data) {
        setNotifications(resNotifications.data.map((n: any) => ({
          id: n.id,
          type: n.type as any,
          title: n.title,
          message: n.message,
          read: !!n.read,
          createdAt: new Date(n.created_at)
        })));
      }

      if (resAudit.data) {
        setAuditLogs(resAudit.data.map((a: any) => ({
          id: a.id,
          userId: a.user_id || 'global',
          userName: 'Staff',
          role: 'CASHIER' as any,
          action: a.action,
          entityType: a.entity_type,
          entityId: a.entity_id,
          details: JSON.stringify(a.details || {}),
          createdAt: new Date(a.created_at)
        })));
      }

      if (resWhatsAppLogs && resWhatsAppLogs.data) {
        const mappedLogs = resWhatsAppLogs.data.map((wl: any) => ({
          id: wl.id,
          storeId: wl.store_id,
          orderId: wl.order_id || undefined,
          phone: wl.phone,
          customerName: wl.payload?.customerName || 'Guest',
          messageType: wl.message_type as any,
          content: wl.payload?.content || '',
          status: wl.status as any,
          errorMessage: wl.error_message || undefined,
          createdAt: new Date(wl.created_at),
          retryCount: wl.payload?.retry_count || 0
        }));
        whatsappService.setLogsForStore(storeId, mappedLogs);
        setWhatsappLogs(mappedLogs);
      }

      setSupabaseError(null);
    } catch (e: any) {
      console.error('Supabase load failure, falling back to local DB:', e);
      setSupabaseError(e.message || JSON.stringify(e));
      loadStoreData(storeId, true);
    }
  };

  const loadMoreOrders = async () => {
    if (!supabase || !currentStore || !lastOrderCursor || !hasMoreOrders) return;
    try {
      const { data: fetchedOrders, error } = await supabase
        .from('orders')
        .select('id, store_id, customer_id, customers(name, phone), order_number, status, payment_status, payment_method, subtotal, tax, discount, total, notes, created_at, order_items(id, name, variant_name, qty, price, total)')
        .eq('store_id', currentStore.id)
        .lt('created_at', lastOrderCursor)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;

      if (fetchedOrders && fetchedOrders.length > 0) {
        const mappedOrders = fetchedOrders.map((o: any) => ({
          id: o.id,
          orderNumber: o.order_number,
          customerId: o.customer_id || undefined,
          customerName: o.customers?.name || undefined,
          customerPhone: o.customers?.phone || undefined,
          status: o.status as any,
          paymentStatus: o.payment_status as any,
          paymentMethod: o.payment_method as any,
          subtotal: Number(o.subtotal) || 0,
          tax: Number(o.tax) || 0,
          discount: Number(o.discount) || 0,
          total: Number(o.total) || 0,
          notes: o.notes || undefined,
          createdAt: new Date(o.created_at),
          items: o.order_items?.map((item: any) => ({
            id: item.id,
            productId: item.product_id,
            name: item.name,
            variantName: item.variant_name || undefined,
            qty: item.qty,
            price: Number(item.price) || 0,
            total: Number(item.total) || 0
          })) || []
        }));

        setOrders(prev => [...prev, ...mappedOrders]);

        if (fetchedOrders.length === 15) {
          setHasMoreOrders(true);
          setLastOrderCursor(fetchedOrders[fetchedOrders.length - 1].created_at);
        } else {
          setHasMoreOrders(false);
          setLastOrderCursor(null);
        }
      } else {
        setHasMoreOrders(false);
        setLastOrderCursor(null);
      }
    } catch (e: any) {
      console.error('Load more orders failed:', e);
    }
  };

  const seedSupabaseDatabase = async () => {
    if (!supabase) return;
    try {
      console.log('Seeding Supabase database with default records...');
      
      // 1. Insert Stores
      const seedStores = [
        {
          id: 'd5089f81-5c31-4198-8422-921cf05db631',
          name: 'Dhruv Burger Cart',
          business_type: 'Fast Food',
          phone: '9876543210',
          whatsapp: '9876543210',
          logo_url: '🍔'
        },
        {
          id: 'c5089f81-5c31-4198-8422-921cf05db632',
          name: 'Chotu Tea Stall',
          business_type: 'Beverages',
          phone: '9999888777',
          whatsapp: '9999888777',
          logo_url: '☕'
        }
      ];
      
      const { error: storeErr } = await supabase.from('stores').insert(seedStores);
      if (storeErr) throw storeErr;

      // 2. Insert Settings
      const seedSettings = [
        {
          store_id: 'd5089f81-5c31-4198-8422-921cf05db631',
          gst_rate: 5.0,
          gst_type: 'inclusive',
          gst_enabled: true,
          currency: 'INR',
          receipt_header: 'DHRUV BURGER CART\nSector 62, Noida',
          receipt_footer: 'Thank you! Visit again.',
          printer_type: 'thermal-80mm'
        },
        {
          store_id: 'c5089f81-5c31-4198-8422-921cf05db632',
          gst_rate: 0.0,
          gst_type: 'inclusive',
          gst_enabled: false,
          currency: 'INR',
          receipt_header: 'CHOTU TEA STALL\nMetro Gate 2',
          receipt_footer: 'Thank you! Visit again.',
          printer_type: 'thermal-58mm'
        }
      ];
      await supabase.from('store_settings').insert(seedSettings);

      // 3. Insert Categories
      const seedCategories = [
        { id: 'cat101', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', name: 'Burgers', sort_order: 1 },
        { id: 'cat102', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', name: 'Drinks', sort_order: 2 },
        { id: 'cat103', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', name: 'Sides', sort_order: 3 },
        { id: 'cat201', store_id: 'c5089f81-5c31-4198-8422-921cf05db632', name: 'Tea', sort_order: 1 },
        { id: 'cat202', store_id: 'c5089f81-5c31-4198-8422-921cf05db632', name: 'Coffee', sort_order: 2 },
        { id: 'cat203', store_id: 'c5089f81-5c31-4198-8422-921cf05db632', name: 'Snacks', sort_order: 3 }
      ];
      await supabase.from('categories').insert(seedCategories);

      // 4. Insert Products
      const seedProducts = [
        { id: 'p101', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', category_id: 'cat101', name: 'Classic Burger', description: 'Signature veg patty, fresh lettuce, standard mayo', price: 80.00, available: true, prep_time: 8, tax_rate: 5.0, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400' },
        { id: 'p102', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', category_id: 'cat101', name: 'Double Cheese Burger', description: 'Double grilled patty, double cheddar cheese, secret sauce', price: 150.00, available: true, prep_time: 10, tax_rate: 5.0, image_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400' },
        { id: 'p103', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', category_id: 'cat102', name: 'Masala Lemonade', description: 'Tangy fresh lime with authentic crushed spices', price: 40.00, available: true, prep_time: 3, tax_rate: 5.0, image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400' },
        { id: 'p104', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', category_id: 'cat103', name: 'Crispy Fries', description: 'Salted, golden fried hot potatoes', price: 60.00, available: true, prep_time: 5, tax_rate: 5.0, image_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400' },
        { id: 'p201', store_id: 'c5089f81-5c31-4198-8422-921cf05db632', category_id: 'cat201', name: 'Masala Chai', description: 'Cardamom infused strong hot tea', price: 20.00, available: true, prep_time: 4, tax_rate: 0, image_url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400' },
        { id: 'p202', store_id: 'c5089f81-5c31-4198-8422-921cf05db632', category_id: 'cat201', name: 'Ginger Tea', description: 'Brewed with fresh pure ginger root', price: 25.00, available: true, prep_time: 4, tax_rate: 0, image_url: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400' },
        { id: 'p203', store_id: 'c5089f81-5c31-4198-8422-921cf05db632', category_id: 'cat202', name: 'Filter Coffee', description: 'Authentic decoction South Indian coffee', price: 30.00, available: true, prep_time: 5, tax_rate: 0, image_url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400' },
        { id: 'p204', store_id: 'c5089f81-5c31-4198-8422-921cf05db632', category_id: 'cat203', name: 'Crispy Samosa', description: 'Deep fried potato stuffed triangles (2 pcs)', price: 30.00, available: true, prep_time: 2, tax_rate: 0, image_url: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400' }
      ];
      await supabase.from('products').insert(seedProducts);

      // 5. Insert Inventory items
      const seedInventory = [
        { id: 'i101', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', name: 'Burger Buns', stock: 50, unit: 'pcs', threshold: 10, cost: 5.00 },
        { id: 'i102', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', name: 'Burger Patty', stock: 45, unit: 'pcs', threshold: 10, cost: 15.00 },
        { id: 'i103', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', name: 'Cheese Slices', stock: 40, unit: 'pcs', threshold: 8, cost: 8.00 },
        { id: 'i201', store_id: 'c5089f81-5c31-4198-8422-921cf05db632', name: 'Tea Leaves', stock: 2000, unit: 'g', threshold: 300, cost: 0.40 },
        { id: 'i202', store_id: 'c5089f81-5c31-4198-8422-921cf05db632', name: 'Milk', stock: 10.0, unit: 'ltr', threshold: 2.0, cost: 60.00 },
        { id: 'i203', store_id: 'c5089f81-5c31-4198-8422-921cf05db632', name: 'Sugar', stock: 3000, unit: 'g', threshold: 500, cost: 0.05 }
      ];
      await supabase.from('inventory').insert(seedInventory);

      // 6. Add addons & ingredients bridges
      const seedAddons = [
        { product_id: 'p101', name: 'Extra Cheese', price: 20.00 },
        { product_id: 'p101', name: 'Spicy Mayo', price: 10.00 }
      ];
      await supabase.from('product_addons').insert(seedAddons);

      const seedIngredients = [
        { product_id: 'p101', inventory_id: 'i101', quantity_used: 1 },
        { product_id: 'p101', inventory_id: 'i102', quantity_used: 1 },
        { product_id: 'p101', inventory_id: 'i103', quantity_used: 1 },
        { product_id: 'p102', inventory_id: 'i101', quantity_used: 1 },
        { product_id: 'p102', inventory_id: 'i102', quantity_used: 2 },
        { product_id: 'p102', inventory_id: 'i103', quantity_used: 2 },
        { product_id: 'p201', inventory_id: 'i201', quantity_used: 10 },
        { product_id: 'p201', inventory_id: 'i202', quantity_used: 0.1 },
        { product_id: 'p201', inventory_id: 'i203', quantity_used: 15 }
      ];
      await supabase.from('product_ingredients').insert(seedIngredients);

      // 7. Customers
      const seedCustomers = [
        { id: 'c101', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', name: 'Dhruv', phone: '9876543210', orders_count: 12, total_spend: 1850, visit_count: 12 },
        { id: 'c102', store_id: 'd5089f81-5c31-4198-8422-921cf05db631', name: 'Ananya', phone: '9999888777', orders_count: 4, total_spend: 380, visit_count: 4 },
        { id: 'c201', store_id: 'c5089f81-5c31-4198-8422-921cf05db632', name: 'Kabir', phone: '8887776665', orders_count: 1, total_spend: 30, visit_count: 1 }
      ];
      await supabase.from('customers').insert(seedCustomers);

      console.log('Supabase seeding successfully completed!');
    } catch (e) {
      console.error('Supabase seeding failed:', e);
    }
  };

  const loadLocalStorageDatabase = () => {
    // Try fetching stores locally
    const storedStores = localStorage.getItem('db_stores');
    if (storedStores) {
      const parsedStores = JSON.parse(storedStores);
      setStores(parsedStores);
      const active = parsedStores[0] || null;
      setCurrentStore(active);
      if (active) loadStoreData(active.id, true);
    } else {
      // START CLEAN & EMPTY - NO MOCK STORES SEEDED!
      setStores([]);
      setCurrentStore(null);
    }
  };

  const initializeDatabase = async () => {
    try {
      if (isSupabaseConfigured && supabase && !isSandbox) {
        const { data: dbStores, error: fetchStoresError } = await supabase.from('stores').select('*');
        if (fetchStoresError) {
          console.warn('Supabase fetch stores error, falling back to local storage:', fetchStoresError);
          setSupabaseError(fetchStoresError.message || JSON.stringify(fetchStoresError));
          loadLocalStorageDatabase();
          return;
        }
        
        if (!dbStores || dbStores.length === 0) {
          // START CLEAN & EMPTY ON SUPABASE TOO!
          setStores([]);
          setCurrentStore(null);
          return;
        } else {
          // DATABASE IS POPULATED - LOAD IT NORMALLY WITH LICENSE INFORMATION
          const mappedStores = dbStores.map(s => ({
            id: s.id,
            name: s.name,
            businessType: s.business_type || 'Food Cart',
            phone: s.phone || '',
            whatsapp: s.whatsapp || '',
            logoUrl: s.logo_url || '🍔',
            isActive: s.is_active !== false,
            licenseExpiresAt: s.license_expires_at || null
          }));
          setStores(mappedStores);
          const active = mappedStores[0];
          setCurrentStore(active);
          await loadStoreDataFromSupabase(active.id);
          return;
        }
      }

      loadLocalStorageDatabase();
    } catch (e: any) {
      console.error('Database initialization failed, falling back to local:', e);
      setSupabaseError(e.message || JSON.stringify(e));
      loadLocalStorageDatabase();
    }
  };

  const loadStoreData = (storeId: string, forceLocal = false) => {
    if (isSupabaseConfigured && !forceLocal && !isSandbox) {
      loadStoreDataFromSupabase(storeId);
      return;
    }

    // 1. Settings
    const keySettings = `db_settings_${storeId}`;
    const storedSettings = localStorage.getItem(keySettings);
    if (storedSettings) {
      setStoreSettings(JSON.parse(storedSettings));
    } else {
      const defaultSettings: StoreSettings = {
        gstRate: storeId === 'd5089f81-5c31-4198-8422-921cf05db631' ? 5.0 : 0.0,
        gstType: 'inclusive',
        gstEnabled: storeId === 'd5089f81-5c31-4198-8422-921cf05db631',
        currency: 'INR',
        receiptHeader: storeId === 'd5089f81-5c31-4198-8422-921cf05db631' ? 'DHRUV BURGER CART\nSector 62, Noida' : 'CHOTU TEA STALL\nMetro Gate 2',
        receiptFooter: 'Thank you! Visit again.',
        printerType: storeId === 'd5089f81-5c31-4198-8422-921cf05db631' ? 'thermal-80mm' : 'thermal-58mm'
      };
      localStorage.setItem(keySettings, JSON.stringify(defaultSettings));
      setStoreSettings(defaultSettings);
    }

    // Subscription & role mapping based on store
    if (storeId === 'd5089f81-5c31-4198-8422-921cf05db631') {
      setSubscriptionTier('pro');
    } else {
      setSubscriptionTier('starter');
    }

    // 2. Categories & Products
    const keyProducts = `db_products_${storeId}`;
    const keyCategories = `db_categories_${storeId}`;
    const storedProducts = localStorage.getItem(keyProducts);
    const storedCategories = localStorage.getItem(keyCategories);

    if (storedProducts && storedCategories) {
      setProducts(JSON.parse(storedProducts));
      setCategories(JSON.parse(storedCategories));
    } else {
      let defaultCategories: string[] = [];
      let defaultProducts: Product[] = [];

      if (storeId === 'd5089f81-5c31-4198-8422-921cf05db631') {
        defaultCategories = ['Burgers', 'Drinks', 'Sides'];
        defaultProducts = [
          {
            id: 'p101',
            name: 'Classic Burger',
            description: 'Signature veg patty, fresh lettuce, standard mayo',
            price: 80.00,
            available: true,
            category: 'Burgers',
            prepTime: 8,
            taxRate: 5.0,
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
            addons: [
              { name: 'Extra Cheese', price: 20.00 },
              { name: 'Spicy Mayo', price: 10.00 }
            ],
            ingredients: [
              { inventoryId: 'i101', qty: 1 }, // Bun
              { inventoryId: 'i102', qty: 1 }, // Patty
              { inventoryId: 'i103', qty: 1 }  // Cheese
            ]
          },
          {
            id: 'p102',
            name: 'Double Cheese Burger',
            description: 'Double grilled patty, double cheddar cheese, secret sauce',
            price: 150.00,
            available: true,
            category: 'Burgers',
            prepTime: 10,
            taxRate: 5.0,
            image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400',
            ingredients: [
              { inventoryId: 'i101', qty: 1 },
              { inventoryId: 'i102', qty: 2 },
              { inventoryId: 'i103', qty: 2 }
            ]
          },
          {
            id: 'p103',
            name: 'Masala Lemonade',
            description: 'Tangy fresh lime with authentic crushed spices',
            price: 40.00,
            available: true,
            category: 'Drinks',
            prepTime: 3,
            taxRate: 5.0,
            image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400'
          },
          {
            id: 'p104',
            name: 'Crispy Fries',
            description: 'Salted, golden fried hot potatoes',
            price: 60.00,
            available: true,
            category: 'Sides',
            prepTime: 5,
            taxRate: 5.0,
            image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400'
          }
        ];
      } else {
        defaultCategories = ['Tea', 'Coffee', 'Snacks'];
        defaultProducts = [
          {
            id: 'p201',
            name: 'Masala Chai',
            description: 'Traditional milk tea infused with crushed cardamom & cinnamon',
            price: 20.00,
            available: true,
            category: 'Tea',
            prepTime: 4,
            taxRate: 0,
            image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400',
            variants: [
              { name: 'Small', price: 20 },
              { name: 'Medium', price: 30 },
              { name: 'Large', price: 40 }
            ],
            ingredients: [
              { inventoryId: 'i201', qty: 10 }, // Tea leaves (g)
              { inventoryId: 'i202', qty: 0.1 }, // Milk (l)
              { inventoryId: 'i203', qty: 15 }  // Sugar (g)
            ]
          },
          {
            id: 'p202',
            name: 'Ginger Tea',
            description: 'Strong milk chai brewed with pure ginger root',
            price: 25.00,
            available: true,
            category: 'Tea',
            prepTime: 4,
            taxRate: 0,
            image: 'https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=400',
            variants: [
              { name: 'Small', price: 25 },
              { name: 'Large', price: 45 }
            ],
            ingredients: [
              { inventoryId: 'i201', qty: 10 },
              { inventoryId: 'i202', qty: 0.1 }
            ]
          },
          {
            id: 'p203',
            name: 'Filter Coffee',
            description: 'Authentic decoction South Indian coffee',
            price: 30.00,
            available: true,
            category: 'Coffee',
            prepTime: 5,
            taxRate: 0,
            image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400'
          },
          {
            id: 'p204',
            name: 'Crispy Samosa',
            description: 'Deep fried potato stuffed triangles (2 pcs)',
            price: 30.00,
            available: true,
            category: 'Snacks',
            prepTime: 2,
            taxRate: 0,
            image: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400'
          }
        ];
      }
      localStorage.setItem(keyProducts, JSON.stringify(defaultProducts));
      localStorage.setItem(keyCategories, JSON.stringify(defaultCategories));
      setProducts(defaultProducts);
      setCategories(defaultCategories);
    }

    // 3. Inventory
    const keyInventory = `db_inventory_${storeId}`;
    const storedInventory = localStorage.getItem(keyInventory);
    if (storedInventory) {
      setInventory(JSON.parse(storedInventory));
    } else {
      let defaultInventory: InventoryItem[] = [];
      if (storeId === 'd5089f81-5c31-4198-8422-921cf05db631') {
        defaultInventory = [
          { id: 'i101', name: 'Burger Buns', stock: 50, unit: 'pcs', threshold: 10, cost: 5.00 },
          { id: 'i102', name: 'Burger Patty', stock: 45, unit: 'pcs', threshold: 10, cost: 15.00 },
          { id: 'i103', name: 'Cheese Slices', stock: 40, unit: 'pcs', threshold: 8, cost: 8.00 }
        ];
      } else {
        defaultInventory = [
          { id: 'i201', name: 'Tea Leaves', stock: 2000, unit: 'g', threshold: 300, cost: 0.40 },
          { id: 'i202', name: 'Milk', stock: 10.0, unit: 'ltr', threshold: 2.0, cost: 60.00 },
          { id: 'i203', name: 'Sugar', stock: 3000, unit: 'g', threshold: 500, cost: 0.05 }
        ];
      }
      localStorage.setItem(keyInventory, JSON.stringify(defaultInventory));
      setInventory(defaultInventory);
    }

    // 4. CRM Customers
    const keyCustomers = `db_customers_${storeId}`;
    const storedCustomers = localStorage.getItem(keyCustomers);
    if (storedCustomers) {
      setCustomers(JSON.parse(storedCustomers));
    } else {
      let defaultCustomers: Customer[] = [];
      if (storeId === 'd5089f81-5c31-4198-8422-921cf05db631') {
        defaultCustomers = [
          { id: 'c101', name: 'Dhruv', phone: '9876543210', ordersCount: 12, totalSpend: 1850, visitCount: 12, loyaltyPoints: 150, segment: 'VIP' },
          { id: 'c102', name: 'Ananya', phone: '9999888777', ordersCount: 4, totalSpend: 380, visitCount: 4, loyaltyPoints: 20, segment: 'Frequent' }
        ];
      } else {
        defaultCustomers = [
          { id: 'c201', name: 'Kabir', phone: '8887776665', ordersCount: 1, totalSpend: 30, visitCount: 1, loyaltyPoints: 5, segment: 'New' }
        ];
      }
      localStorage.setItem(keyCustomers, JSON.stringify(defaultCustomers));
      setCustomers(defaultCustomers);
    }

    // 5. Orders
    const keyOrders = `db_orders_${storeId}`;
    const storedOrders = localStorage.getItem(keyOrders);
    if (storedOrders) {
      setOrders(JSON.parse(storedOrders));
    } else {
      const now = new Date();
      let seedOrders: Order[] = [];
      if (storeId === 'd5089f81-5c31-4198-8422-921cf05db631') {
        seedOrders = [
          {
            id: 'o1',
            orderNumber: '101',
            customerId: 'c101',
            customerName: 'Dhruv',
            customerPhone: '9876543210',
            status: 'completed',
            paymentStatus: 'paid',
            paymentMethod: 'upi',
            subtotal: 200,
            tax: 10,
            discount: 0,
            total: 210,
            createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
            items: [
              { id: 'oi1', productId: 'p101', name: 'Classic Burger', qty: 2, price: 80, total: 160 },
              { id: 'oi2', productId: 'p103', name: 'Masala Lemonade', qty: 1, price: 40, total: 40 }
            ]
          },
          {
            id: 'o2',
            orderNumber: '102',
            customerId: 'c102',
            customerName: 'Ananya',
            customerPhone: '9999888777',
            status: 'completed',
            paymentStatus: 'paid',
            paymentMethod: 'cash',
            subtotal: 150,
            tax: 7.5,
            discount: 10,
            total: 147.5,
            createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
            items: [
              { id: 'oi3', productId: 'p102', name: 'Double Cheese Burger', qty: 1, price: 150, total: 150 }
            ]
          },
          {
            id: 'o3',
            orderNumber: '103',
            customerId: 'c101',
            customerName: 'Dhruv',
            customerPhone: '9876543210',
            status: 'completed',
            paymentStatus: 'paid',
            paymentMethod: 'card',
            subtotal: 300,
            tax: 15,
            discount: 0,
            total: 315,
            createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
            items: [
              { id: 'oi4', productId: 'p101', name: 'Classic Burger', qty: 3, price: 80, total: 240 },
              { id: 'oi5', productId: 'p104', name: 'Crispy Fries', qty: 1, price: 60, total: 60 }
            ]
          },
          {
            id: 'o4',
            orderNumber: '104',
            customerId: 'c102',
            customerName: 'Ananya',
            customerPhone: '9999888777',
            status: 'completed',
            paymentStatus: 'paid',
            paymentMethod: 'upi',
            subtotal: 290,
            tax: 14.5,
            discount: 15,
            total: 289.5,
            createdAt: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000), // 12 days ago
            items: [
              { id: 'oi7', productId: 'p102', name: 'Double Cheese Burger', qty: 1, price: 150, total: 150 },
              { id: 'oi8', productId: 'p101', name: 'Classic Burger', qty: 1, price: 80, total: 80 },
              { id: 'oi9', productId: 'p104', name: 'Crispy Fries', qty: 1, price: 60, total: 60 }
            ]
          }
        ];
      } else {
        seedOrders = [
          {
            id: 'o201',
            orderNumber: '201',
            customerId: 'c201',
            customerName: 'Kabir',
            customerPhone: '8887776665',
            status: 'completed',
            paymentStatus: 'paid',
            paymentMethod: 'cash',
            subtotal: 50,
            tax: 0,
            discount: 0,
            total: 50,
            createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
            items: [
              { id: 'oi201', productId: 'p201', name: 'Masala Chai', variantName: 'Small', qty: 1, price: 20, total: 20 },
              { id: 'oi202', productId: 'p204', name: 'Crispy Samosa', qty: 1, price: 30, total: 30 }
            ]
          },
          {
            id: 'o202',
            orderNumber: '202',
            status: 'completed',
            paymentStatus: 'paid',
            paymentMethod: 'upi',
            subtotal: 60,
            tax: 0,
            discount: 0,
            total: 60,
            createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
            items: [
              { id: 'oi203', productId: 'p201', name: 'Masala Chai', variantName: 'Medium', qty: 2, price: 30, total: 60 }
            ]
          }
        ];
      }
      localStorage.setItem(keyOrders, JSON.stringify(seedOrders));
      setOrders(seedOrders);
    }

    // 6. Notifications
    const keyNotifications = `db_notifications_${storeId}`;
    const storedNotifications = localStorage.getItem(keyNotifications);
    if (storedNotifications) {
      setNotifications(JSON.parse(storedNotifications));
    } else {
      setNotifications([
        { id: 'n1', type: 'subscription_expiring', title: 'Subscription active', message: `Welcome to VendorOS! Your active subscription tier is ${storeId === 'd5089f81-5c31-4198-8422-921cf05db631' ? 'PRO' : 'STARTER'}`, read: false, createdAt: new Date() }
      ]);
    }

    // 7. Audit Logs
    const keyAuditLogs = `db_audit_${storeId}`;
    const storedAuditLogs = localStorage.getItem(keyAuditLogs);
    if (storedAuditLogs) {
      setAuditLogs(JSON.parse(storedAuditLogs));
    } else {
      setAuditLogs([]);
    }

    // 8. WhatsApp Logs
    const keyWhatsappLogs = `db_whatsapp_logs_${storeId}`;
    const storedWhatsappLogs = localStorage.getItem(keyWhatsappLogs);
    if (storedWhatsappLogs) {
      try {
        const parsedLogs = JSON.parse(storedWhatsappLogs).map((l: any) => ({
          ...l,
          createdAt: new Date(l.createdAt)
        }));
        whatsappService.setLogsForStore(storeId, parsedLogs);
        setWhatsappLogs(parsedLogs);
      } catch (err) {
        console.error('Failed to parse local whatsapp logs:', err);
        setWhatsappLogs([...whatsappService.getLogs(storeId)]);
      }
    } else {
      setWhatsappLogs([...whatsappService.getLogs(storeId)]);
    }
  };

  const changeStore = (storeId: string) => {
    const selected = stores.find(s => s.id === storeId);
    if (selected) {
      setCurrentStore(selected);
      loadStoreData(storeId);
    }
  };

  const createStore = async (name: string, businessType: string, phone: string, logoUrl: string, licenseDays?: number) => {
    const newStoreId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const licenseExpiresAt = licenseDays ? new Date(Date.now() + licenseDays * 24 * 60 * 60 * 1000).toISOString() : null;
    
    const newStore: Store = {
      id: newStoreId,
      name,
      businessType,
      phone,
      whatsapp: phone,
      logoUrl: logoUrl || '🍔',
      isActive: true,
      licenseExpiresAt
    };

    const nextStores = [...stores, newStore];
    setStores(nextStores);
    setCurrentStore(newStore);
    
    localStorage.setItem('db_stores', JSON.stringify(nextStores));

    if (typeof window !== 'undefined') {
      posthog.capture('store_created', {
        storeId: newStoreId,
        storeName: name,
        businessType,
        licenseDays: licenseDays || 30
      });
    }


    // Initialize empty settings
    const defaultSettings: StoreSettings = {
      gstRate: 5.0,
      gstType: 'inclusive',
      gstEnabled: true,
      currency: 'INR',
      receiptHeader: `${name.toUpperCase()}\nContact: ${phone}`,
      receiptFooter: 'Thank you! Visit again.',
      printerType: 'thermal-58mm',
      whatsappOrderPlacedTemplate: 'Hi {name} 👋\n\nOrder #{orderId} received!\n\n🛍️ ITEMS:\n{items}\n\n💰 Total Bill: ₹{total}\n💳 Payment: {payment}\n\n👨‍🍳 We are preparing your fresh order.',
      whatsappOrderReadyTemplate: 'Hi {name} 👋\n\n🔔 Order #{orderId} is READY for collection!\n\nPlease collect it at the counter.\n\nThank you for ordering with us!'
    };
    setStoreSettings(defaultSettings);
    localStorage.setItem(`db_settings_${newStoreId}`, JSON.stringify(defaultSettings));
    
    // Clear child lists
    setCategories([]);
    setProducts([]);
    setInventory([]);
    setOrders([]);
    setCustomers([]);
    setNotifications([]);
    setAuditLogs([]);

    localStorage.setItem(`db_categories_${newStoreId}`, JSON.stringify([]));
    localStorage.setItem(`db_products_${newStoreId}`, JSON.stringify([]));
    localStorage.setItem(`db_inventory_${newStoreId}`, JSON.stringify([]));
    localStorage.setItem(`db_orders_${newStoreId}`, JSON.stringify([]));
    localStorage.setItem(`db_customers_${newStoreId}`, JSON.stringify([]));
    localStorage.setItem(`db_notifications_${newStoreId}`, JSON.stringify([]));
    localStorage.setItem(`db_audit_logs_${newStoreId}`, JSON.stringify([]));

    if (isSupabaseConfigured && supabase && !isSandbox) {
      try {
        const { error: storeErr } = await supabase.from('stores').insert({
          id: newStoreId,
          name,
          business_type: businessType,
          phone,
          whatsapp: phone,
          logo_url: logoUrl || '🍔',
          is_active: true,
          license_expires_at: licenseExpiresAt
        });
        if (storeErr) throw storeErr;

        await supabase.from('store_settings').insert({
          store_id: newStoreId,
          gst_rate: 5.0,
          gst_type: 'inclusive',
          gst_enabled: true,
          currency: 'INR',
          receipt_header: `${name.toUpperCase()}\nContact: ${phone}`,
          receipt_footer: 'Thank you! Visit again.',
          printer_type: 'thermal-58mm'
        });

        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.id) {
          await supabase.from('store_users').insert({
            store_id: newStoreId,
            user_id: userData.user.id,
            role: 'OWNER'
          });
        }
      } catch (e) {
        console.error('Supabase store creation failed:', e);
      }
    }
  };

  const updateSettings = async (settings: Partial<StoreSettings>) => {
    if (!currentStore) return;
    const nextSettings = { ...storeSettings, ...settings };
    setStoreSettings(nextSettings);
    localStorage.setItem(`db_settings_${currentStore.id}`, JSON.stringify(nextSettings));

    addAuditLogEntry(
      'UPDATE_SETTINGS',
      'store_settings',
      currentStore.id,
      `Store configuration updated: ${Object.keys(settings).join(', ')}`
    );

    if (isSupabaseConfigured && supabase && !isSandbox) {
      try {
        const dbPayload: any = {};
        if (settings.gstRate !== undefined) dbPayload.gst_rate = settings.gstRate;
        if (settings.gstType !== undefined) dbPayload.gst_type = settings.gstType;
        if (settings.gstEnabled !== undefined) dbPayload.gst_enabled = settings.gstEnabled;
        if (settings.currency !== undefined) dbPayload.currency = settings.currency;
        if (settings.receiptHeader !== undefined) dbPayload.receipt_header = settings.receiptHeader;
        if (settings.receiptFooter !== undefined) dbPayload.receipt_footer = settings.receiptFooter;
        if (settings.printerType !== undefined) dbPayload.printer_type = settings.printerType;
        if (settings.whatsappOrderPlacedTemplate !== undefined) {
          dbPayload.whatsapp_order_created_template = settings.whatsappOrderPlacedTemplate;
        }
        if (settings.whatsappOrderReadyTemplate !== undefined) {
          dbPayload.whatsapp_order_ready_template = settings.whatsappOrderReadyTemplate;
        }

        if (Object.keys(dbPayload).length > 0) {
          const { error } = await supabase
            .from('store_settings')
            .update(dbPayload)
            .eq('store_id', currentStore.id);

          if (error) {
            console.error('Failed to update store settings in Supabase:', error);
          }
        }
      } catch (e) {
        console.error('Supabase update settings failure:', e);
      }
    }
  };

  const changeUserRole = (role: UserRole) => {
    setActiveUser(prev => prev ? { ...prev, role } : null);
  };

  // Order Submission Core Logic
  const createOrder = async (orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'status'>): Promise<Order> => {
    if (!currentStore) throw new Error("Store context missing");

    // Generate Order Number
    const lastOrderNumber = orders.length > 0 ? parseInt(orders[0].orderNumber) : 100;
    const nextOrderNumber = (lastOrderNumber + 1).toString();

    let finalCustomerId = orderData.customerId;

    if (isSupabaseConfigured && supabase && orderData.customerPhone && !isSandbox) {
      try {
        const { data: dbCustomer } = await supabase
          .from('customers')
          .select('id, visit_count, orders_count, total_spend')
          .eq('store_id', currentStore.id)
          .eq('phone', orderData.customerPhone)
          .maybeSingle();

        if (dbCustomer) {
          finalCustomerId = dbCustomer.id;
          const nextVisits = (Number(dbCustomer.visit_count) || 0) + 1;
          const nextOrders = (Number(dbCustomer.orders_count) || 0) + 1;
          const nextSpend = (Number(dbCustomer.total_spend) || 0) + orderData.total;

          await supabase
            .from('customers')
            .update({
              visit_count: nextVisits,
              orders_count: nextOrders,
              total_spend: nextSpend,
              updated_at: new Date().toISOString()
            })
            .eq('id', dbCustomer.id);
        } else {
          const { data: newCustomer, error: custErr } = await supabase
            .from('customers')
            .insert({
              store_id: currentStore.id,
              name: orderData.customerName || 'Guest Customer',
              phone: orderData.customerPhone,
              visit_count: 1,
              orders_count: 1,
              total_spend: orderData.total
            })
            .select('id')
            .single();

          if (custErr) {
            console.error('Failed to create customer in Supabase:', custErr);
          } else if (newCustomer) {
            finalCustomerId = newCustomer.id;
          }
        }
      } catch (e) {
        console.error('Error in customer lookup/creation:', e);
      }
    }

    const newOrder: Order = {
      ...orderData,
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      orderNumber: nextOrderNumber,
      status: 'received',
      createdAt: new Date(),
      isOfflinePending: isOffline,
      customerId: finalCustomerId
    };

    // Save state
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem(`db_orders_${currentStore.id}`, JSON.stringify(updatedOrders));

    if (typeof window !== 'undefined') {
      posthog.capture('order_checked_out', {
        orderId: newOrder.id,
        orderNumber: newOrder.orderNumber,
        storeId: currentStore.id,
        total: newOrder.total,
        paymentMethod: newOrder.paymentMethod,
        itemCount: newOrder.items.length
      });
    }


    // Save to Supabase if configured using secure RPC calculations
    if (isSupabaseConfigured && supabase && !isSandbox) {
      try {
        const itemsPayload = newOrder.items.map(i => ({
          product_id: i.productId,
          qty: i.qty,
          variant_name: i.variantName || null
        }));

        const { data: rpcData, error: rpcErr } = await supabase.rpc('create_order_secure', {
          p_store_id: currentStore.id,
          p_customer_id: finalCustomerId || null,
          p_payment_method: newOrder.paymentMethod,
          p_discount: newOrder.discount,
          p_notes: newOrder.notes || null,
          p_items: itemsPayload
        });

        if (rpcErr) {
          console.error('[Supabase RPC] Secure order creation failed:', rpcErr);
        } else if (rpcData) {
          // Overwrite client-calculated properties with verified database figures
          newOrder.id = rpcData.id;
          newOrder.orderNumber = rpcData.order_number;
          newOrder.subtotal = Number(rpcData.subtotal) || newOrder.subtotal;
          newOrder.tax = Number(rpcData.tax) || newOrder.tax;
          newOrder.total = Number(rpcData.total) || newOrder.total;

          // Re-sync memory and localStorage with the finalized server values
          const updatedWithServer = [newOrder, ...orders];
          setOrders(updatedWithServer);
          localStorage.setItem(`db_orders_${currentStore.id}`, JSON.stringify(updatedWithServer));
        }
      } catch (e) {
        console.error('Supabase secure order creation failure:', e);
      }
    }

    // Save Event Log to verify event persistence (offline or online)
    const eventLog = {
      eventId: Math.random().toString(36).substring(2, 9).toUpperCase(),
      eventType: 'ORDER_CREATED',
      payload: {
        orderId: newOrder.orderNumber,
        storeId: currentStore.id,
        customerId: newOrder.customerId,
        customerName: newOrder.customerName,
        customerPhone: newOrder.customerPhone,
        items: newOrder.items.map(i => ({ name: i.name, qty: i.qty, price: i.price })),
        total: newOrder.total,
        subtotal: newOrder.subtotal,
        tax: newOrder.tax,
        paymentStatus: newOrder.paymentStatus,
        paymentMethod: newOrder.paymentMethod,
        isDepletedOnServer: isSupabaseConfigured && !isOffline && !isSandbox
      },
      status: isOffline ? 'pending' : 'processed',
      retryCount: 0,
      createdAt: new Date()
    };

    // Persist event log locally
    const keyEventLogs = `db_eventlogs_${currentStore.id}`;
    const storedLogs = JSON.parse(localStorage.getItem(keyEventLogs) || '[]');
    localStorage.setItem(keyEventLogs, JSON.stringify([eventLog, ...storedLogs]));

    if (!isOffline) {
      // Trigger Event Driven Downstream Flows
      eventBus.publish('ORDER_CREATED', eventLog.payload);
    }

    return newOrder;
  };

  // Status Change Engine
  const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
    if (!currentStore) return;

    const oldOrder = orders.find(o => o.id === orderId);
    if (!oldOrder) return;

    const updatedOrders = orders.map(order => {
      if (order.id === orderId) {
        return { ...order, status, updatedAt: new Date() };
      }
      return order;
    });

    setOrders(updatedOrders);
    localStorage.setItem(`db_orders_${currentStore.id}`, JSON.stringify(updatedOrders));

    // Save to Supabase if configured
    if (isSupabaseConfigured && supabase && !isSandbox) {
      try {
        await supabase
          .from('orders')
          .update({ status })
          .eq('id', orderId)
          .eq('store_id', currentStore.id);
      } catch (e) {
        console.error('Supabase order status update failure:', e);
      }
    }

    const summary = oldOrder.items.map(i => `${i.name} x${i.qty}`).join(', ');

    // Publish event
    eventBus.publish('ORDER_STATUS_CHANGED', {
      orderId: oldOrder.id,
      storeId: currentStore.id,
      customerPhone: oldOrder.customerPhone,
      customerName: oldOrder.customerName,
      orderNumber: oldOrder.orderNumber,
      oldStatus: oldOrder.status,
      newStatus: status,
      itemsSummary: summary,
      total: oldOrder.total
    });
  };

  // Stock Mutations
  const updateStockValue = async (itemId: string, newStock: number) => {
    if (!currentStore) return;
    const nextInventory = inventory.map(item => {
      if (item.id === itemId) {
        return { ...item, stock: newStock };
      }
      return item;
    });
    setInventory(nextInventory);
    localStorage.setItem(`db_inventory_${currentStore.id}`, JSON.stringify(nextInventory));

    // Save to Supabase if configured
    if (isSupabaseConfigured && supabase && !isSandbox) {
      try {
        await supabase
          .from('inventory')
          .update({ stock: newStock })
          .eq('id', itemId)
          .eq('store_id', currentStore.id);
      } catch (e) {
        console.error('Supabase stock update failure:', e);
      }
    }
  };

  const updateInventoryStock = (itemId: string, newStock: number) => {
    if (!currentStore) return;
    updateStockValue(itemId, newStock);
    addAuditLogEntry(
      'UPDATE_STOCK',
      'inventory',
      itemId,
      `Inventory stock value manually adjusted to: ${newStock}`
    );
  };

  const updateThresholdValue = async (itemId: string, newThreshold: number) => {
    if (!currentStore) return;
    const nextInventory = inventory.map(item => {
      if (item.id === itemId) {
        return { ...item, threshold: newThreshold };
      }
      return item;
    });
    setInventory(nextInventory);
    localStorage.setItem(`db_inventory_${currentStore.id}`, JSON.stringify(nextInventory));

    if (isSupabaseConfigured && supabase && !isSandbox) {
      try {
        await supabase
          .from('inventory')
          .update({ threshold: newThreshold })
          .eq('id', itemId)
          .eq('store_id', currentStore.id);
      } catch (e) {
        console.error('Supabase threshold update failure:', e);
      }
    }
  };

  const updateInventoryThreshold = (itemId: string, newThreshold: number) => {
    if (!currentStore) return;
    updateThresholdValue(itemId, newThreshold);
    addAuditLogEntry(
      'UPDATE_THRESHOLD',
      'inventory',
      itemId,
      `Inventory threshold value manually adjusted to: ${newThreshold}`
    );
  };

  const addInventoryItem = async (item: Omit<InventoryItem, 'id'>) => {
    if (!currentStore) return;
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'i_' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const newItem: InventoryItem = { ...item, id: newId };
    
    setInventory(prev => {
      const nextInventory = [...prev, newItem];
      localStorage.setItem(`db_inventory_${currentStore.id}`, JSON.stringify(nextInventory));
      return nextInventory;
    });

    addAuditLogEntry(
      'CREATE_INVENTORY_ITEM',
      'inventory',
      newId,
      `Inventory item "${item.name}" added with initial stock: ${item.stock} ${item.unit}`
    );

    if (isSupabaseConfigured && supabase && !isSandbox) {
      try {
        await supabase.from('inventory').insert({
          id: newId,
          store_id: currentStore.id,
          name: item.name,
          stock: item.stock,
          unit: item.unit,
          threshold: item.threshold,
          cost: item.cost
        });
      } catch (e) {
        console.error('Supabase inventory insertion failed:', e);
      }
    }
  };

  // CRM Customer Calculations
  const updateOrCreateCustomer = (phone: string, name: string, spend: number) => {
    if (!currentStore) return;

    setCustomers(prev => {
      const existingCustomer = prev.find(c => c.phone === phone);
      let updatedList: Customer[] = [];

      if (existingCustomer) {
        const nextVisits = existingCustomer.visitCount + 1;
        const nextOrders = existingCustomer.ordersCount + 1;
        const nextSpend = existingCustomer.totalSpend + spend;
        const nextPoints = existingCustomer.loyaltyPoints + Math.floor(spend);
        
        let nextSegment: Customer['segment'] = 'New';
        if (nextVisits > 10 || nextSpend > 1000) {
          nextSegment = 'VIP';
        } else if (nextVisits > 4) {
          nextSegment = 'Frequent';
        }

        updatedList = prev.map(c => {
          if (c.phone === phone) {
            return {
              ...c,
              name,
              visitCount: nextVisits,
              ordersCount: nextOrders,
              totalSpend: nextSpend,
              loyaltyPoints: nextPoints,
              segment: nextSegment
            };
          }
          return c;
        });

        setTimeout(() => {
          eventBus.publish('LOYALTY_UPDATED', {
            customerId: existingCustomer.id,
            storeId: currentStore.id,
            pointsEarned: Math.floor(spend),
            totalPoints: nextPoints
          });
        }, 0);

      } else {
        const newCustomer: Customer = {
          id: Math.random().toString(36).substring(2, 9).toUpperCase(),
          name,
          phone,
          ordersCount: 1,
          totalSpend: spend,
          visitCount: 1,
          loyaltyPoints: Math.floor(spend),
          segment: 'New'
        };
        updatedList = [...prev, newCustomer];
      }

      localStorage.setItem(`db_customers_${currentStore.id}`, JSON.stringify(updatedList));
      return updatedList;
    });
  };

  // Audit Logs helper
  const addAuditLogEntry = (action: string, entityType: string, entityId: string, details: string) => {
    if (!currentStore) return;
    const newLog: AuditLog = {
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      userId: activeUser?.id || 'anonymous',
      userName: activeUser?.name || 'Cashier',
      role: activeUser?.role || 'CASHIER',
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date()
    };

    setAuditLogs(prev => {
      const nextLogs = [newLog, ...prev];
      localStorage.setItem(`db_audit_${currentStore.id}`, JSON.stringify(nextLogs));
      return nextLogs;
    });
  };

  // Notification helper
  const addNotificationEntry = (
    type: Notification['type'],
    title: string,
    message: string
  ) => {
    if (!currentStore) return;
    const newNotif: Notification = {
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      type,
      title,
      message,
      read: false,
      createdAt: new Date()
    };

    const nextNotifs = [newNotif, ...notifications];
    setNotifications(nextNotifs);
    localStorage.setItem(`db_notifications_${currentStore.id}`, JSON.stringify(nextNotifs));
  };

  // Menu updates
  const addCategory = async (name: string) => {
    if (!currentStore) return;
    let nextCatsLength = 0;
    setCategories(prev => {
      const nextCats = [...prev, name];
      nextCatsLength = nextCats.length;
      localStorage.setItem(`db_categories_${currentStore.id}`, JSON.stringify(nextCats));
      return nextCats;
    });
    
    addAuditLogEntry('CREATE_CATEGORY', 'categories', name, `Category "${name}" added to menu`);

    if (isSupabaseConfigured && supabase && !isSandbox) {
      try {
        await supabase.from('categories').insert({
          store_id: currentStore.id,
          name: name,
          sort_order: nextCatsLength || (categories.length + 1)
        });
      } catch (e) {
        console.error('Supabase category insertion failed:', e);
      }
    }
  };

  const addProduct = async (prod: Omit<Product, 'id'>) => {
    if (!currentStore) return;
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'p_' + Math.random().toString(36).substring(2, 9).toUpperCase();
    const newProd = { ...prod, id: newId };
    
    let currentCatsLength = 0;
    setProducts(prev => {
      const nextProducts = [...prev, newProd];
      localStorage.setItem(`db_products_${currentStore.id}`, JSON.stringify(nextProducts));
      return nextProducts;
    });

    setCategories(prev => {
      currentCatsLength = prev.length;
      return prev;
    });

    addAuditLogEntry('CREATE_PRODUCT', 'products', newProd.id, `Menu item "${prod.name}" added`);

    if (isSupabaseConfigured && supabase && !isSandbox) {
      try {
        const { data: catData } = await supabase
          .from('categories')
          .select('id')
          .eq('store_id', currentStore.id)
          .eq('name', prod.category)
          .maybeSingle();
        
        let categoryId = catData?.id || null;

        if (!categoryId && prod.category) {
          const { data: newCat } = await supabase
            .from('categories')
            .insert({
              store_id: currentStore.id,
              name: prod.category,
              sort_order: currentCatsLength + 1
            })
            .select('id')
            .single();
          if (newCat) {
            categoryId = newCat.id;
          }
        }

        await supabase.from('products').insert({
          id: newId,
          store_id: currentStore.id,
          category_id: categoryId,
          name: prod.name,
          description: prod.description,
          price: prod.price,
          available: prod.available,
          prep_time: prod.prepTime,
          tax_rate: prod.taxRate,
          image_url: prod.image || null
        });

        if (prod.variants && prod.variants.length > 0) {
          await supabase.from('product_variants').insert(
            prod.variants.map(v => ({
              product_id: newId,
              name: v.name,
              price: v.price
            }))
          );
        }

        if (prod.addons && prod.addons.length > 0) {
          await supabase.from('product_addons').insert(
            prod.addons.map(a => ({
              product_id: newId,
              name: a.name,
              price: a.price
            }))
          );
        }
      } catch (e) {
        console.error('Supabase product insertion failed:', e);
      }
    }
  };

  const editProduct = async (id: string, prod: Partial<Product>) => {
    if (!currentStore) return;
    setProducts(prev => {
      const nextProducts = prev.map(p => (p.id === id ? { ...p, ...prod } : p));
      localStorage.setItem(`db_products_${currentStore.id}`, JSON.stringify(nextProducts));
      return nextProducts;
    });

    addAuditLogEntry('UPDATE_PRODUCT', 'products', id, `Menu item details edited`);

    if (isSupabaseConfigured && supabase && !isSandbox) {
      try {
        let categoryId: string | null | undefined = undefined;
        if (prod.category !== undefined) {
          if (prod.category) {
            const { data: catData } = await supabase
              .from('categories')
              .select('id')
              .eq('store_id', currentStore.id)
              .eq('name', prod.category)
              .maybeSingle();
            categoryId = catData?.id || null;
          } else {
            categoryId = null;
          }
        }

        const updateData: any = {};
        if (prod.name !== undefined) updateData.name = prod.name;
        if (prod.description !== undefined) updateData.description = prod.description;
        if (prod.price !== undefined) updateData.price = prod.price;
        if (prod.available !== undefined) updateData.available = prod.available;
        if (prod.prepTime !== undefined) updateData.prep_time = prod.prepTime;
        if (prod.taxRate !== undefined) updateData.tax_rate = prod.taxRate;
        if (prod.image !== undefined) updateData.image_url = prod.image || null;
        if (categoryId !== undefined) updateData.category_id = categoryId;
        updateData.updated_at = new Date().toISOString();

        await supabase
          .from('products')
          .update(updateData)
          .eq('id', id)
          .eq('store_id', currentStore.id);
      } catch (e) {
        console.error('Supabase product edit failed:', e);
      }
    }
  };

  const deleteProduct = async (id: string) => {
    if (!currentStore) return;
    setProducts(prev => {
      const nextProducts = prev.filter(p => p.id !== id);
      localStorage.setItem(`db_products_${currentStore.id}`, JSON.stringify(nextProducts));
      return nextProducts;
    });

    addAuditLogEntry('DELETE_PRODUCT', 'products', id, `Menu item removed`);

    if (isSupabaseConfigured && supabase && !isSandbox) {
      try {
        await supabase
          .from('products')
          .delete()
          .eq('id', id)
          .eq('store_id', currentStore.id);
      } catch (e) {
        console.error('Supabase product deletion failed:', e);
      }
    }
  };

  // PWA Offline Sync Engine
  const syncOfflineQueue = async () => {
    if (!currentStore) return;
    const keyEventLogs = `db_eventlogs_${currentStore.id}`;
    const storedLogs = JSON.parse(localStorage.getItem(keyEventLogs) || '[]');
    
    const pendingEvents = storedLogs.filter((log: any) => log.status === 'pending');
    if (pendingEvents.length === 0) return;

    console.log(`[OfflineSync] Syncing ${pendingEvents.length} events back to server...`);
    
    // Simulate network delay for bulk upload
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Process events one by one
    pendingEvents.forEach((event: any) => {
      eventBus.publish('ORDER_CREATED', event.payload);
      event.status = 'processed';
      event.processedAt = new Date();
    });

    // Mark corresponding orders as sync completed
    const updatedOrders = orders.map(order => {
      if (order.isOfflinePending) {
        return { ...order, isOfflinePending: false };
      }
      return order;
    });

    setOrders(updatedOrders);
    localStorage.setItem(`db_orders_${currentStore.id}`, JSON.stringify(updatedOrders));
    localStorage.setItem(keyEventLogs, JSON.stringify(storedLogs));
    
    addNotificationEntry(
      'subscription_expiring',
      'Sync Completed',
      `All offline transactions (${pendingEvents.length} orders) synced successfully.`
    );
  };

  // Send campaigns (VIP SMS / WhatsApp alerts)
  const sendMockCampaign = (campaignText: string, segment: string) => {
    if (!currentStore) return;
    const targetCustomers = customers.filter(c => segment === 'All' || c.segment === segment);
    
    targetCustomers.forEach(customer => {
      whatsappService.sendNotification(
        currentStore.id,
        'CAMPAIGN',
        customer.phone,
        customer.name,
        'CAMP',
        'order_received', // compiled text simulation helper
        campaignText,
        0
      );
    });

    addAuditLogEntry(
      'SEND_CAMPAIGN',
      'campaign',
      currentStore.id,
      `Marketing campaign sent to ${targetCustomers.length} customers in segment: ${segment}`
    );
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (email === 'sandbox@vendoros.com' && password === 'sandbox') {
      const dummyUser = { id: 'u101', name: 'Sandbox Owner', email, role: 'SUPER_ADMIN' };
      localStorage.setItem('sandbox_session', JSON.stringify(dummyUser));
      setSessionUser(dummyUser);
      setUserProfile({ id: 'u101', name: 'Sandbox Owner', email, access_token_used: 'SANDBOX-TOKEN', is_super_admin: true });
      setActiveUser({ id: 'u101', name: 'Sandbox Owner', role: 'SUPER_ADMIN' });
      setIsSandbox(true);
      return;
    }
    if (!supabase) {
      throw new Error('Invalid sandbox credentials. Use email "sandbox@vendoros.com" and password "sandbox" for offline development.');
    }
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string, name: string, token?: string) => {
    if (email === 'sandbox@vendoros.com' && password === 'sandbox') {
      const dummyUser = { id: 'u101', name, email, role: 'SUPER_ADMIN' };
      localStorage.setItem('sandbox_session', JSON.stringify(dummyUser));
      setSessionUser(dummyUser);
      setUserProfile({ id: 'u101', name, email, access_token_used: 'SANDBOX-TOKEN', is_super_admin: true });
      setActiveUser({ id: 'u101', name, role: 'SUPER_ADMIN' });
      setIsSandbox(true);
      return;
    }

    if (token) {
      const cleanToken = token.trim().toUpperCase();
      if (cleanToken === 'SANDBOX-TOKEN') {
        const dummyUser = { id: 'u101', name, email, role: 'SUPER_ADMIN' };
        localStorage.setItem('sandbox_session', JSON.stringify(dummyUser));
        setSessionUser(dummyUser);
        setUserProfile({ id: 'u101', name, email, access_token_used: cleanToken, is_super_admin: true });
        setActiveUser({ id: 'u101', name, role: 'SUPER_ADMIN' });
        setIsSandbox(true);
        return;
      }
    }

    if (!supabase) {
      throw new Error('Supabase is offline');
    }

    if (token) {
      const cleanToken = token.trim().toUpperCase();
      const { data: isValid, error: verifyErr } = await supabase.rpc('verify_access_token', { p_token: cleanToken });
      if (verifyErr) throw verifyErr;
      if (!isValid) throw new Error('Invalid or already used access token.');
    }

    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    if (signUpErr) throw signUpErr;
    if (!signUpData.user) throw new Error('Signup failed.');

    if (signUpData.session && token) {
      const cleanToken = token.trim().toUpperCase();
      const { data: claimed, error: claimErr } = await supabase.rpc('claim_access_token', { p_token: cleanToken });
      if (claimErr) {
        console.error('Error claiming access token on signup:', claimErr);
      }
      if (claimed) {
        await fetchUserProfile(signUpData.user.id);
      }
    } else if (token) {
      localStorage.setItem(`pending_access_token_${email}`, token);
    } else {
      await fetchUserProfile(signUpData.user.id);
    }
  };

  const signInWithGoogle = async () => {
    if (!supabase) {
      const dummyUser = { id: 'u101', name: 'Google Sandbox User', email: 'sandbox@google.com', role: 'SUPER_ADMIN' };
      setSessionUser(dummyUser);
      setUserProfile({ id: 'u101', name: 'Google Sandbox User', email: 'sandbox@google.com', access_token_used: 'SANDBOX-TOKEN', is_super_admin: true });
      setActiveUser({ id: 'u101', name: 'Google Sandbox User', role: 'SUPER_ADMIN' });
      setIsSandbox(true);
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined
      }
    });
    if (error) throw error;
  };

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSessionUser(null);
    setUserProfile(null);
    setActiveUser(null);
    setStores([]);
    setCurrentStore(null);
    setCategories([]);
    setProducts([]);
    setInventory([]);
    setOrders([]);
    setCustomers([]);
    setNotifications([]);
    setAuditLogs([]);
    localStorage.clear();
  };

  const claimAccessToken = async (token: string): Promise<boolean> => {
    const cleanToken = token.trim().toUpperCase();
    if (cleanToken === 'SANDBOX-TOKEN') {
      const dummyUser = { id: 'u101', name: 'Sandbox Owner', email: 'sandbox@vendoros.com', role: 'OWNER' };
      localStorage.setItem('sandbox_session', JSON.stringify(dummyUser));
      setUserProfile({
        id: 'u101',
        name: 'Sandbox Owner',
        email: 'sandbox@vendoros.com',
        access_token_used: cleanToken
      });
      setIsSandbox(true);
      setSessionUser(dummyUser);
      setActiveUser({ id: 'u101', name: 'Sandbox Owner', role: 'OWNER' });
      return true;
    }
    if (!supabase) {
      return false;
    }

    const { data: claimed, error: claimErr } = await supabase.rpc('claim_access_token', { p_token: cleanToken });
    if (claimErr) throw claimErr;

    if (claimed) {
      if (sessionUser) {
        await fetchUserProfile(sessionUser.id);
      }
      return true;
    }
    return false;
  };

  const createProductQuick = async (name: string, price: number, category: string, emoji: string) => {
    if (!currentStore) return;
    await addProduct({
      name,
      description: `Freshly prepared ${name}`,
      price,
      available: true,
      category,
      prepTime: 5,
      taxRate: storeSettings.gstEnabled ? storeSettings.gstRate : 0,
      image: emoji
    });
  };

  const createProductsBulk = async (items: Array<{ name: string; price: number; category: string; emoji: string }>) => {
    if (!currentStore) return;
    
    const auditLogsToAdd: Array<{ action: string; entityType: string; entityId: string; details: string }> = [];
    const newProducts: Product[] = [];
    let updatedCats: string[] = [];

    setCategories(prevCats => {
      const newCatsSet = new Set<string>(prevCats);
      setProducts(prevProds => {
        const nextProductsList = [...prevProds];

        for (const item of items) {
          if (nextProductsList.some(p => p.name.toLowerCase() === item.name.toLowerCase().trim())) {
            continue;
          }

          const newId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'p_' + Math.random().toString(36).substring(2, 9).toUpperCase();
          
          const newProd: Product = {
            id: newId,
            name: item.name.trim(),
            description: `Freshly prepared ${item.name.trim()}`,
            price: item.price,
            available: true,
            category: item.category.trim() || 'General',
            prepTime: 5,
            taxRate: storeSettings.gstEnabled ? storeSettings.gstRate : 0,
            image: item.emoji,
            variants: [],
            addons: [],
            ingredients: []
          };

          nextProductsList.push(newProd);
          newProducts.push(newProd);

          if (!newCatsSet.has(newProd.category)) {
            newCatsSet.add(newProd.category);
          }

          auditLogsToAdd.push({
            action: 'CREATE_PRODUCT',
            entityType: 'products',
            entityId: newId,
            details: `Menu item "${newProd.name}" added via bulk import`
          });
        }

        localStorage.setItem(`db_products_${currentStore.id}`, JSON.stringify(nextProductsList));
        return nextProductsList;
      });

      updatedCats = Array.from(newCatsSet);
      localStorage.setItem(`db_categories_${currentStore.id}`, JSON.stringify(updatedCats));
      return updatedCats;
    });

    auditLogsToAdd.forEach(log => {
      addAuditLogEntry(log.action, log.entityType, log.entityId, log.details);
    });

    if (isSupabaseConfigured && supabase && !isSandbox && newProducts.length > 0) {
      try {
        for (const catName of updatedCats) {
          if (!categories.includes(catName)) {
            const { data: catData } = await supabase
              .from('categories')
              .select('id')
              .eq('store_id', currentStore.id)
              .eq('name', catName)
              .maybeSingle();

            if (!catData) {
              await supabase
                .from('categories')
                .insert({
                  store_id: currentStore.id,
                  name: catName,
                  sort_order: updatedCats.indexOf(catName) + 1
                });
            }
          }
        }

        const { data: dbCats } = await supabase
          .from('categories')
          .select('id, name')
          .eq('store_id', currentStore.id);

        const catNameToIdMap = new Map<string, string>();
        dbCats?.forEach(c => catNameToIdMap.set(c.name, c.id));

        const productsPayload = newProducts.map(p => ({
          id: p.id,
          store_id: currentStore.id,
          category_id: catNameToIdMap.get(p.category) || null,
          name: p.name,
          description: p.description,
          price: p.price,
          available: p.available,
          prep_time: p.prepTime,
          tax_rate: p.taxRate,
          image_url: p.image || null
        }));

        await supabase.from('products').insert(productsPayload);
      } catch (err) {
        console.error('[Supabase Bulk] Bulk products insert failed:', err);
      }
    }
  };



  const clearDatabase = () => {
    localStorage.clear();
    if (!isSupabaseConfigured || isSandbox) {
      loadLocalStorageDatabase();
    } else {
      window.location.reload();
    }
  };

  return (
    <VendorContext.Provider value={{
      currentStore,
      stores,
      storeSettings,
      activeUser,
      subscriptionTier,
      categories,
      products,
      inventory,
      customers,
      orders,
      notifications,
      auditLogs,
      whatsappLogs,
      isOffline,
      isSandbox,
      supabaseError,
      hasMoreOrders,
      sessionUser,
      userProfile,
      authInitialized,
      changeStore,
      createStore,
      updateSettings,
      changeUserRole,
      createOrder,
      updateOrderStatus,
      updateInventoryStock,
      updateInventoryThreshold,
      addProduct,
      editProduct,
      deleteProduct,
      addCategory,
      syncOfflineQueue,
      clearDatabase,
      sendMockCampaign,
      loadMoreOrders,
      isDarkMode,
      toggleTheme,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      claimAccessToken,
      createProductQuick,
      createProductsBulk,
      addInventoryItem
    }}>
      {children}
    </VendorContext.Provider>
  );
};

export const useVendor = () => {
  const context = useContext(VendorContext);
  if (context === undefined) {
    throw new Error('useVendor must be used within a VendorProvider');
  }
  return context;
};
