import { test, expect } from 'vitest';
import { EventType } from './types.js';
import type { Order, CapEvent } from './types.js';

test('EventType holds the six CAP wire event names', () => {
  expect(EventType.NegotiationCreated).toBe('negotiation_created');
  expect(EventType.OrderCreated).toBe('order_created');
  expect(EventType.OrderPaid).toBe('order_paid');
  expect(EventType.OrderCompleted).toBe('order_completed');
  expect(EventType.OrderRejected).toBe('order_rejected');
  expect(EventType.OrderExpired).toBe('order_expired');
  expect(Object.values(EventType)).toHaveLength(6);
});

test('Order and CapEvent shapes accept a valid value', () => {
  const order: Order = {
    id: 'o1', negotiationId: 'n1', requesterDid: 'did:req', providerDid: 'did:prov',
    amountUsdc: '0.01', slaMinutes: 1, status: 'paid', requirements: null, createdAt: 1, paidAt: 2,
    resolvedAt: null, deliveryHash: null, refundTxHash: null,
  };
  const event: CapEvent = {
    type: EventType.OrderExpired, orderId: 'o1', negotiationId: 'n1',
    requesterDid: 'did:req', providerDid: 'did:prov', status: 'expired',
    slaMinutes: 1, refundTxHash: '0xabc', deliveryHash: null, timestamp: 3,
  };
  expect(order.status).toBe('paid');
  expect(event.type).toBe('order_expired');
});
