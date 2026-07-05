import { test, expect, vi } from 'vitest';
import { CapEventBus } from './event-bus.js';
import { EventType } from '../domain/types.js';
import type { CapEvent } from '../domain/types.js';

function evt(partial: Partial<CapEvent>): CapEvent {
  return {
    type: EventType.OrderPaid, orderId: 'o1', negotiationId: 'n1',
    requesterDid: 'did:req', providerDid: 'did:prov', status: 'paid',
    slaMinutes: 1, refundTxHash: null, deliveryHash: null, timestamp: 0, ...partial,
  };
}

test('a stream only receives events involving its own DID', () => {
  const bus = new CapEventBus();
  const seen: string[] = [];
  const stream = bus.connect('did:req');
  stream.onAny((e) => seen.push(e.orderId));
  bus.emit(evt({ orderId: 'mine', requesterDid: 'did:req' }));
  bus.emit(evt({ orderId: 'other', requesterDid: 'did:x', providerDid: 'did:y' }));
  expect(seen).toEqual(['mine']);
});

test('on(type) filters by event type and close() unsubscribes', () => {
  const bus = new CapEventBus();
  const onExpired = vi.fn();
  const stream = bus.connect('did:prov');
  stream.on(EventType.OrderExpired, onExpired);
  bus.emit(evt({ type: EventType.OrderPaid, providerDid: 'did:prov' }));
  expect(onExpired).not.toHaveBeenCalled();
  bus.emit(evt({ type: EventType.OrderExpired, providerDid: 'did:prov' }));
  expect(onExpired).toHaveBeenCalledTimes(1);
  stream.close();
  bus.emit(evt({ type: EventType.OrderExpired, providerDid: 'did:prov' }));
  expect(onExpired).toHaveBeenCalledTimes(1);
});
