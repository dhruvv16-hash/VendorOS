import { describe, test } from 'node:test';
import assert from 'node:assert';
import { eventBus } from '../events/index.js';

describe('Events Package Tests', () => {
  test('EventBus Publish & Subscribe lifecycle', async () => {
    let receivedPayload: any = null;
    
    const callback = (payload: any) => {
      receivedPayload = payload;
    };

    // Subscribe
    eventBus.subscribe('ORDER_CREATED', callback);

    const testPayload = {
      orderId: 'ord-999',
      storeId: 'store-1',
      items: [{ name: 'Cheese Pizza', qty: 1, price: 300 }],
      total: 300,
      subtotal: 300,
      tax: 0
    };

    // Publish
    eventBus.publish('ORDER_CREATED', testPayload);

    // Verify callback was called
    assert.deepStrictEqual(receivedPayload, testPayload);

    // Reset and Unsubscribe
    receivedPayload = null;
    eventBus.unsubscribe('ORDER_CREATED', callback);

    // Publish again and verify callback not called
    eventBus.publish('ORDER_CREATED', testPayload);
    assert.strictEqual(receivedPayload, null);
  });
});
