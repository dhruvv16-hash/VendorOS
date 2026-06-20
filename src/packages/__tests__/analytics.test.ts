import { describe, test } from 'node:test';
import assert from 'node:assert';
import { 
  calculateSalesSummary, 
  calculatePeakHours, 
  calculateTopProducts, 
  calculateSalesTrend, 
  generatePlatformInsights 
} from '../analytics/index.js';

describe('Analytics Package Tests', () => {
  const mockOrders = [
    {
      id: 'ord-1',
      total: 100,
      createdAt: new Date('2026-05-29T10:30:00'),
      customerId: 'cust-1',
      items: [{ name: 'Burger', qty: 1, total: 100 }]
    },
    {
      id: 'ord-2',
      total: 200,
      createdAt: new Date('2026-05-29T11:45:00'),
      customerId: 'cust-2',
      items: [{ name: 'Burger', qty: 2, total: 200 }, { name: 'Fries', qty: 1, total: 50 }]
    },
    {
      id: 'ord-3',
      total: 150,
      createdAt: new Date('2026-05-29T11:15:00'),
      customerId: 'cust-1', // Repeat customer
      items: [{ name: 'Fries', qty: 3, total: 150 }]
    }
  ];

  const mockCustomers = [
    { id: 'cust-1', visitCount: 2 },
    { id: 'cust-2', visitCount: 1 }
  ];

  const mockInventory = [
    { name: 'Burger Buns', stock: 5, threshold: 10 },
    { name: 'Cheese Slices', stock: 50, threshold: 20 }
  ];

  test('calculateSalesSummary validation', () => {
    const summary = calculateSalesSummary(mockOrders, mockCustomers);
    assert.strictEqual(summary.totalSales, 450);
    assert.strictEqual(summary.totalOrders, 3);
    assert.strictEqual(summary.averageBill, 150);
    // 1 repeat customer out of 2 total = 50%
    assert.strictEqual(summary.repeatCustomerRate, 50);
  });

  test('calculatePeakHours groupings', () => {
    const hours = calculatePeakHours(mockOrders);
    const peak11 = hours.find(h => h.hour === 11);
    const peak10 = hours.find(h => h.hour === 10);
    
    assert.strictEqual(peak11?.orderCount, 2);
    assert.strictEqual(peak11?.sales, 350);
    assert.strictEqual(peak10?.orderCount, 1);
  });

  test('calculateTopProducts sorting', () => {
    const top = calculateTopProducts(mockOrders);
    assert.strictEqual(top[0].name, 'Fries'); // Qty 4 sold
    assert.strictEqual(top[0].quantitySold, 4);
    assert.strictEqual(top[1].name, 'Burger'); // Qty 3 sold
    assert.strictEqual(top[1].quantitySold, 3);
  });

  test('calculateSalesTrend today, week, month correctness', () => {
    const trendsToday = calculateSalesTrend(mockOrders, 'today');
    assert.strictEqual(trendsToday.length, 6);
    
    const trendsWeek = calculateSalesTrend(mockOrders, 'week');
    assert.strictEqual(trendsWeek.length, 7);

    const trendsMonth = calculateSalesTrend(mockOrders, 'month');
    assert.strictEqual(trendsMonth.length, 4);
    // Since mockOrders are on 2026-05-29, verify that they fall inside weekly offsets correctly
  });

  test('generatePlatformInsights recommendations', () => {
    const insights = generatePlatformInsights(mockOrders, mockInventory);
    
    // Low stock warning check
    assert.ok(insights.some(i => i.includes('Burger Buns') && i.includes('below minimum')));
    // Peak demand check
    assert.ok(insights.some(i => i.includes('Peak Demand') && i.includes('11 AM')));
  });
});
