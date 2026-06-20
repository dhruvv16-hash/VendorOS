export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'KITCHEN' | 'DELIVERY' | 'SUPER_ADMIN';
export type SubscriptionTier = 'starter' | 'growth' | 'pro' | 'enterprise';

export interface UserSession {
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  storeId: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  availableStores: Array<{ id: string; name: string; role: UserRole }>;
}

export type PermissionAction = 
  | 'create_order'
  | 'edit_order'
  | 'cancel_order'
  | 'view_kitchen'
  | 'update_kitchen_status'
  | 'view_inventory'
  | 'edit_inventory'
  | 'view_analytics'
  | 'manage_menu'
  | 'manage_staff'
  | 'manage_settings'
  | 'send_campaigns';

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  SUPER_ADMIN: [
    'create_order', 'edit_order', 'cancel_order', 'view_kitchen',
    'update_kitchen_status', 'view_inventory', 'edit_inventory',
    'view_analytics', 'manage_menu', 'manage_staff', 'manage_settings',
    'send_campaigns'
  ],
  OWNER: [
    'create_order', 'edit_order', 'cancel_order', 'view_kitchen',
    'update_kitchen_status', 'view_inventory', 'edit_inventory',
    'view_analytics', 'manage_menu', 'manage_staff', 'manage_settings',
    'send_campaigns'
  ],
  MANAGER: [
    'create_order', 'edit_order', 'cancel_order', 'view_kitchen',
    'update_kitchen_status', 'view_inventory', 'edit_inventory',
    'view_analytics', 'manage_menu', 'manage_settings'
  ],
  CASHIER: [
    'create_order', 'edit_order', 'view_kitchen'
  ],
  KITCHEN: [
    'view_kitchen', 'update_kitchen_status'
  ],
  DELIVERY: [
    'view_kitchen', 'update_kitchen_status'
  ]
};

export interface TierLimits {
  maxStores: number;
  maxStaff: number;
  hasInventory: boolean;
  hasAnalytics: boolean;
  hasCampaigns: boolean;
}

const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  starter: {
    maxStores: 1,
    maxStaff: 3,
    hasInventory: false,
    hasAnalytics: false,
    hasCampaigns: false
  },
  growth: {
    maxStores: 1,
    maxStaff: 5,
    hasInventory: true,
    hasAnalytics: true,
    hasCampaigns: false
  },
  pro: {
    maxStores: 5,
    maxStaff: 9999, // unlimited
    hasInventory: true,
    hasAnalytics: true,
    hasCampaigns: true
  },
  enterprise: {
    maxStores: 9999,
    maxStaff: 9999,
    hasInventory: true,
    hasAnalytics: true,
    hasCampaigns: true
  }
};

/**
 * Check if a user role has permission to perform a specific action
 */
export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(action) : false;
}

/**
 * Get limits associated with a specific subscription tier
 */
export function getTierLimits(tier: SubscriptionTier): TierLimits {
  return TIER_LIMITS[tier] || TIER_LIMITS.starter;
}

/**
 * Validate if a store is within their subscription limits
 */
export function isActionAllowedForTier(
  tier: SubscriptionTier,
  check: 'stores_count' | 'staff_count' | 'inventory' | 'analytics' | 'campaigns',
  currentValue: number = 0
): boolean {
  const limits = getTierLimits(tier);
  switch (check) {
    case 'stores_count':
      return currentValue < limits.maxStores;
    case 'staff_count':
      return currentValue < limits.maxStaff;
    case 'inventory':
      return limits.hasInventory;
    case 'analytics':
      return limits.hasAnalytics;
    case 'campaigns':
      return limits.hasCampaigns;
    default:
      return false;
  }
}
