import { describe, test, before, after } from 'node:test';
import assert from 'node:assert';
import { whatsappService } from '../whatsapp/index.js';

describe('WhatsApp Package Tests', () => {
  let originalFetch: any;

  before(() => {
    originalFetch = global.fetch;
    // Mock global.fetch to simulate successful API requests
    global.fetch = (async (url: string, options?: any) => {
      return {
        ok: true,
        json: async () => ({ success: true })
      };
    }) as any;
  });

  after(() => {
    global.fetch = originalFetch;
  });

  test('Template Compilation for Order Received', () => {
    const text = whatsappService.compileTemplate('order_received', {
      name: 'Dhruv',
      orderId: 'ORD-101',
      itemsSummary: '🍔 2x Cheeseburger\n🍟 1x Large Fries',
      total: 350,
      paymentStatus: 'pending',
      paymentMethod: 'upi'
    });

    assert.ok(text.includes('Hi Dhruv'));
    assert.ok(text.includes('Order #ORD-101 received!'));
    assert.ok(text.includes('Total Bill: ₹350'));
    assert.ok(text.includes('PENDING (Online UPI Payment)'));
    assert.ok(text.includes('💳 Pay online now:'));
  });

  test('Template Compilation for Order Ready', () => {
    const text = whatsappService.compileTemplate('order_ready', {
      name: 'Dhruv',
      orderId: 'ORD-101',
      itemsSummary: '',
      total: 0
    });

    assert.ok(text.includes('Order #ORD-101 is READY'));
    assert.ok(text.includes('Dhruv'));
  });

  test('Send Notification with mocked fetch', async () => {
    const log = await whatsappService.sendNotification(
      'store-1',
      'ord-1',
      '9303000832',
      'Dhruv',
      'ORD-101',
      'order_received',
      '🍔 Burger x2',
      160,
      'paid',
      'upi'
    );

    assert.strictEqual(log.phone, '9303000832');
    assert.strictEqual(log.status, 'delivered');
    assert.strictEqual(log.messageType, 'order_received');
  });
});
