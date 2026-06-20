import { describe, test } from 'node:test';
import assert from 'node:assert';
import { hasPermission, getTierLimits, isActionAllowedForTier } from '../auth/index.js';

describe('Auth Package Tests', () => {
  test('Role permissions validation', () => {
    // OWNER should have all permissions
    assert.strictEqual(hasPermission('OWNER', 'create_order'), true);
    assert.strictEqual(hasPermission('OWNER', 'send_campaigns'), true);
    assert.strictEqual(hasPermission('OWNER', 'manage_settings'), true);

    // MANAGER permissions
    assert.strictEqual(hasPermission('MANAGER', 'create_order'), true);
    assert.strictEqual(hasPermission('MANAGER', 'manage_settings'), true);
    assert.strictEqual(hasPermission('MANAGER', 'send_campaigns'), false);

    // CASHIER permissions
    assert.strictEqual(hasPermission('CASHIER', 'create_order'), true);
    assert.strictEqual(hasPermission('CASHIER', 'view_kitchen'), true);
    assert.strictEqual(hasPermission('CASHIER', 'manage_settings'), false);

    // KITCHEN permissions
    assert.strictEqual(hasPermission('KITCHEN', 'view_kitchen'), true);
    assert.strictEqual(hasPermission('KITCHEN', 'update_kitchen_status'), true);
    assert.strictEqual(hasPermission('KITCHEN', 'create_order'), false);
  });

  test('Tier Limits check', () => {
    const starterLimits = getTierLimits('starter');
    assert.strictEqual(starterLimits.maxStores, 1);
    assert.strictEqual(starterLimits.hasInventory, false);

    const proLimits = getTierLimits('pro');
    assert.strictEqual(proLimits.maxStores, 5);
    assert.strictEqual(proLimits.hasInventory, true);
    assert.strictEqual(proLimits.hasCampaigns, true);
  });

  test('Tier action gating', () => {
    // Starter: max 1 store (action allowed for count < 1)
    assert.strictEqual(isActionAllowedForTier('starter', 'stores_count', 0), true);
    assert.strictEqual(isActionAllowedForTier('starter', 'stores_count', 1), false);

    // Pro: max 5 stores
    assert.strictEqual(isActionAllowedForTier('pro', 'stores_count', 4), true);
    assert.strictEqual(isActionAllowedForTier('pro', 'stores_count', 5), false);

    // Starter features
    assert.strictEqual(isActionAllowedForTier('starter', 'inventory'), false);
    assert.strictEqual(isActionAllowedForTier('starter', 'analytics'), false);

    // Pro features
    assert.strictEqual(isActionAllowedForTier('pro', 'inventory'), true);
    assert.strictEqual(isActionAllowedForTier('pro', 'analytics'), true);
  });
});
