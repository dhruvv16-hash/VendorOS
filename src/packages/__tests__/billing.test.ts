import { describe, test } from 'node:test';
import assert from 'node:assert';
import { calculateGST, generateUPIDeepLink, generateThermalReceipt, initializeRazorpayPayment } from '../billing/index.js';

describe('Billing Package Tests', () => {
  const taxConfigExclusive = {
    enabled: true,
    rate: 5,
    type: 'exclusive' as const,
    cgstRate: 2.5,
    sgstRate: 2.5,
    igstRate: 0
  };

  const taxConfigInclusive = {
    enabled: true,
    rate: 5,
    type: 'inclusive' as const,
    cgstRate: 2.5,
    sgstRate: 2.5,
    igstRate: 0
  };

  test('calculateGST exclusive tax', () => {
    const result = calculateGST(100, taxConfigExclusive);
    assert.strictEqual(result.taxAmount, 5);
    assert.strictEqual(result.cgst, 2.5);
    assert.strictEqual(result.sgst, 2.5);
    assert.strictEqual(result.netTotal, 105);
  });

  test('calculateGST inclusive tax', () => {
    const result = calculateGST(105, taxConfigInclusive);
    assert.strictEqual(result.taxAmount, 5); // 105 - 105/1.05 = 5
    assert.strictEqual(result.cgst, 2.5);
    assert.strictEqual(result.sgst, 2.5);
    assert.strictEqual(result.netTotal, 105);
  });

  test('calculateGST disabled tax', () => {
    const result = calculateGST(100, { ...taxConfigExclusive, enabled: false });
    assert.strictEqual(result.taxAmount, 0);
    assert.strictEqual(result.netTotal, 100);
  });

  test('generateUPIDeepLink validation', () => {
    const upiId = 'merchant@upi';
    const merchant = 'Burger Palace';
    const amount = 250;
    const note = 'Order 1234';
    const link = generateUPIDeepLink(upiId, merchant, amount, note);
    
    assert.ok(link.includes('pa=merchant%40upi') || link.includes('pa=merchant@upi'));
    assert.ok(link.includes('pn=Burger%20Palace'));
    assert.ok(link.includes('am=250.00'));
    assert.ok(link.includes('tn=Order%201234'));
  });

  test('generateThermalReceipt content check', () => {
    const store = {
      name: 'Burger Palace',
      phone: '9999999999',
      address: 'Food Court, Mall',
      gstNumber: '07AAAAA1111A1Z1'
    };

    const order = {
      orderNumber: 'OS-1029',
      items: [
        { name: 'Veg Burger', qty: 2, price: 80, total: 160 }
      ],
      subtotal: 160,
      tax: 8,
      discount: 0,
      total: 168,
      paymentMethod: 'upi' as const,
      createdAt: new Date('2026-05-29T12:00:00')
    };

    const receipt = generateThermalReceipt(store, order, taxConfigExclusive, 'thermal-58mm');
    assert.ok(receipt.includes('BURGER PALACE'));
    assert.ok(receipt.includes('Order: #OS-1029'));
    assert.ok(receipt.includes('Veg Burger x2'));
    assert.ok(receipt.includes('GRAND TOTAL:'));
  });

  test('initializeRazorpayPayment mock', async () => {
    const res = await initializeRazorpayPayment({
      amount: 150,
      orderId: '123',
      storeName: 'Test Store'
    });
    assert.strictEqual(res.success, true);
    assert.ok(res.transactionId.startsWith('pay_'));
  });
});
