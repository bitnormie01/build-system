import { test, expect } from 'vitest';
import { mapSdkEventType } from './sdk-agent-client.js';
import { EventType } from '../domain/types.js';

test('normalizes SDK event type spellings to our wire EventType', () => {
  expect(mapSdkEventType('OrderExpired')).toBe(EventType.OrderExpired);
  expect(mapSdkEventType('order_expired')).toBe(EventType.OrderExpired);
  expect(mapSdkEventType('ORDER_PAID')).toBe(EventType.OrderPaid);
  expect(mapSdkEventType('NegotiationCreated')).toBe(EventType.NegotiationCreated);
  expect(mapSdkEventType('something_else')).toBeNull();
});
