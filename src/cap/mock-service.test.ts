import { test, expect } from 'vitest';
import { ManualClock } from './clock.js';
import { IdFactory } from './ids.js';
import { CapEventBus } from './event-bus.js';
import { MockCapService } from './mock-service.js';
import { EventType } from '../domain/types.js';
import type { CapEvent } from '../domain/types.js';

function setup() {
  const clock = new ManualClock();
  const bus = new CapEventBus();
  const service = new MockCapService(clock, new IdFactory(), bus,
    { msPerSlaMinute: 1000, autoDeliverMs: 100 });
  const events: CapEvent[] = [];
  bus.connect('did:req').onAny((e) => events.push(e));
  return { clock, service, events };
}

test('alive target: negotiate auto-accepts, pay locks escrow, auto-deliver completes', async () => {
  const { clock, service, events } = setup();
  service.registerTarget('did:prov');
  const neg = await service.negotiateOrder(
    { requesterDid: 'did:req', providerDid: 'did:prov', amountUsdc: '0.01', slaMinutes: 1 });
  expect(neg.status).toBe('accepted');
  const orderId = (await service.listOrders({ requesterDid: 'did:req' }))[0]?.id ?? '';
  await service.payOrder(orderId, 'did:req');
  clock.advance(150);
  const order = await service.getOrder(orderId);
  expect(order.status).toBe('completed');
  expect(order.deliveryHash).toMatch(/^0x/);
  expect(events.map((e) => e.type)).toContain(EventType.OrderCompleted);
});

test('killed after pay: no delivery, SLA expiry refunds and emits order_expired', async () => {
  const { clock, service, events } = setup();
  service.registerTarget('did:prov');
  await service.negotiateOrder(
    { requesterDid: 'did:req', providerDid: 'did:prov', amountUsdc: '0.01', slaMinutes: 1 });
  const orderId = (await service.listOrders({ requesterDid: 'did:req' }))[0]?.id ?? '';
  await service.payOrder(orderId, 'did:req');
  service.killTarget('did:prov');
  clock.advance(150);
  expect((await service.getOrder(orderId)).status).toBe('paid');
  clock.advance(1000);
  const order = await service.getOrder(orderId);
  expect(order.status).toBe('expired');
  expect(order.refundTxHash).toMatch(/^0x/);
  const expired = events.find((e) => e.type === EventType.OrderExpired);
  expect(expired?.refundTxHash).toBe(order.refundTxHash);
});

test('declining target: provider-rejects from paid, refunds, emits order_rejected not expired', async () => {
  const { clock, service, events } = setup();
  service.registerTarget('did:prov', { rejectAfterPay: true });
  await service.negotiateOrder(
    { requesterDid: 'did:req', providerDid: 'did:prov', amountUsdc: '0.01', slaMinutes: 1 });
  const orderId = (await service.listOrders({ requesterDid: 'did:req' }))[0]?.id ?? '';
  await service.payOrder(orderId, 'did:req');
  clock.advance(150);
  const order = await service.getOrder(orderId);
  expect(order.status).toBe('rejected');
  expect(order.refundTxHash).toMatch(/^0x/);
  expect(events.some((e) => e.type === EventType.OrderRejected)).toBe(true);
  expect(events.some((e) => e.type === EventType.OrderExpired)).toBe(false);
});

test('non-target provider does not auto-accept; requirements carry onto the order', async () => {
  const { service } = setup();
  const neg = await service.negotiateOrder(
    { requesterDid: 'did:buyer', providerDid: 'did:deadman', amountUsdc: '0.05',
      slaMinutes: 1, requirements: 'did:prov' });
  expect(neg.status).toBe('pending');
  expect(await service.listOrders({ providerDid: 'did:deadman' })).toHaveLength(0);
  const accept = await service.acceptNegotiation(neg.id, 'did:deadman');
  const order = await service.getOrder(accept.orderId);
  expect(order.status).toBe('created');
  expect(order.requirements).toBe('did:prov');
});
