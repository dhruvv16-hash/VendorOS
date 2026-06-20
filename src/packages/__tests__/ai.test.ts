import { describe, test } from 'node:test';
import assert from 'node:assert';
import { AIService } from '../ai/index.js';

describe('AI Package Tests', () => {
  const mockInventory = [
    { id: 'i101', name: 'Burger Buns', stock: 10, unit: 'pcs', threshold: 5 },
    { id: 'i102', name: 'Patty', stock: 4, unit: 'pcs', threshold: 5 } // Low stockout target
  ];

  const mockProducts = [
    {
      id: 'p101',
      name: 'Classic Burger',
      price: 80,
      ingredients: [
        { inventoryId: 'i101', qty: 1 },
        { inventoryId: 'i102', qty: 1 }
      ]
    },
    {
      id: 'p102',
      name: 'Crispy Fries',
      price: 60,
      ingredients: []
    }
  ];

  const mockOrders = [
    {
      createdAt: new Date(),
      items: [{ name: 'Classic Burger', qty: 2, total: 160 }],
      total: 160
    },
    {
      createdAt: new Date(),
      items: [{ name: 'Classic Burger', qty: 2, total: 160 }, { name: 'Crispy Fries', qty: 1, total: 60 }],
      total: 220
    }
  ];

  test('AI Service availability and version', () => {
    assert.strictEqual(AIService.isAvailable, true);
    assert.strictEqual(AIService.version, '1.0.0-release');
  });

  test('predictStockShortage velocity projection', () => {
    const shortages = AIService.predictStockShortage(mockInventory, mockProducts, mockOrders, 7);
    
    const buns = shortages.find(s => s.name === 'Burger Buns');
    const patty = shortages.find(s => s.name === 'Patty');

    assert.ok(buns);
    assert.ok(patty);
    
    // Buns: stock 10, depleted 4 in 7 days -> rate = 4/7 = 0.57/day -> remaining = 10 / 0.57 = 17.5 days
    assert.ok(buns.remainingDays > 10);
    assert.strictEqual(buns.status, 'safe');

    // Patty: stock 4, depleted 4 in 7 days -> rate = 4/7 = 0.57/day -> remaining = 4 / 0.57 = 7 days (wait, is it critical/warning/safe? remaining <= 4.0 is warning)
    assert.ok(patty.remainingDays <= 10.0);
  });

  test('forecastDemand moving averages', () => {
    const forecast = AIService.forecastDemand(mockOrders);
    
    assert.ok(forecast.tomorrowOrders >= 1);
    assert.ok(forecast.tomorrowSales >= 100);
    assert.strictEqual(forecast.shortTermAvgOrders > 0, true);
  });

  test('suggestSmartPromotions bundling recommendation', () => {
    const promos = AIService.suggestSmartPromotions(mockOrders, mockProducts);
    
    assert.strictEqual(promos.length, 1);
    assert.strictEqual(promos[0].name.includes('Classic Burger & Crispy Fries Combo'), true);
    assert.strictEqual(promos[0].discountPercent, 15);
    assert.strictEqual(promos[0].originalPrice, 140);
    assert.strictEqual(promos[0].promoPrice, 119); // 140 * 0.85 = 119
    assert.ok(promos[0].rationale.includes('Classic Burger'));
  });
});
