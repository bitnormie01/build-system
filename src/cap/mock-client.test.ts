import { test, expect } from 'vitest';
import { ManualClock } from './clock.js';
import { IdFactory } from './ids.js';
import { CapEventBus } from './event-bus.js';
import { MockCapService } from './mock-service.js';
import { MockCapClient } from './mock-client.js';
import { EventType } from '../domain/types.js';

function service(): MockCapService {
  return new MockCapService(new ManualClock(), new IdFactory(), new CapEventBus());
}

test('two clients complete an order through the seam', async () => {
  const svc = service();
  const requester = new MockCapClient(svc, 'did:req');
  const provider = new MockCapClient(svc, 'did:prov');
  const neg = await requester.negotiateOrder(
    { requesterDid: 'did:req', providerDid: 'did:prov', amountUsdc: '0.05', slaMinutes: 1,
      requirements: 'did:target' });
  const accept = await provider.acceptNegotiation(neg.id);
  await requester.payOrder(accept.orderId);
  const res = await provider.deliverOrder({ orderId: accept.orderId, payload: { ok: true } });
  expect(res.deliveryHash).toMatch(/^0x/);
  const delivery = await requester.getDelivery(accept.orderId);
  expect(delivery.payload).toEqual({ ok: true });
});

test('a client websocket receives its own events', async () => {
  const svc = service();
  const provider = new MockCapClient(svc, 'did:prov');
  const stream = await provider.connectWebSocket();
  const seen: string[] = [];
  stream.on(EventType.OrderCreated, (e) => seen.push(e.orderId));
  const requester = new MockCapClient(svc, 'did:req');
  const neg = await requester.negotiateOrder(
    { requesterDid: 'did:req', providerDid: 'did:prov', amountUsdc: '0.05', slaMinutes: 1 });
  await provider.acceptNegotiation(neg.id);
  expect(seen).toHaveLength(1);
});
