import { test, expect } from 'vitest';
import { IdFactory } from './ids.js';

test('order and negotiation ids increment and are unique', () => {
  const ids = new IdFactory();
  expect(ids.nextOrderId()).toBe('order-1');
  expect(ids.nextOrderId()).toBe('order-2');
  expect(ids.nextNegotiationId()).toBe('neg-1');
});

test('refund tx hashes look like a 32-byte hex and are unique per call', () => {
  const ids = new IdFactory();
  const a = ids.refundTxHash('order-1');
  const b = ids.refundTxHash('order-1');
  expect(a).toMatch(/^0x[0-9a-f]{64}$/);
  expect(a).not.toBe(b);
});

test('delivery hash is deterministic for the same payload', () => {
  const ids = new IdFactory();
  const p = { a: 1, b: 'x' };
  expect(ids.deliveryHash(p)).toBe(ids.deliveryHash(p));
  expect(ids.deliveryHash(p)).toMatch(/^0x[0-9a-f]{64}$/);
});
