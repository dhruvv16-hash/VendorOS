import { describe, test } from 'node:test';
import assert from 'node:assert';
import { designTokens, diagnostics } from '../ui/index.js';

describe('UI Package Tests', () => {
  test('Design Tokens inspection', () => {
    assert.ok(designTokens.colors);
    assert.strictEqual(designTokens.colors.primary, '#FF6B35');
    assert.strictEqual(designTokens.colors.secondary, '#FFB347');
    assert.strictEqual(designTokens.colors.success, '#22C55E');
    assert.ok(designTokens.typography.fontFamily.includes('Inter'));
  });

  test('Diagnostics tracker methods execute without crash', () => {
    // We should be able to log exceptions and track metrics without errors
    diagnostics.logException({
      storeId: 'store-123',
      eventType: 'sync_failure',
      error: new Error('Supabase schema lock failure'),
      metadata: { debug: true }
    });

    diagnostics.trackAction('page_view', { view: 'dashboard' });
    assert.ok(true, 'Diagnostics logging ran without exceptions');
  });
});
