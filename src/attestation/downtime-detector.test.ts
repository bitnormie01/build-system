import { test, expect } from 'vitest';
import { ManualClock } from '../cap/clock.js';
import { createMockEnvironment } from '../cap/environment.js';
import { AttestationStore } from './attestation-store.js';
import { DowntimeDetector } from './downtime-detector.js';

async function flush(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve();
}

test('records downtime on expiry but NOT on provider-reject (a refund alone is not downtime)', async () => {
  const clock = new ManualClock();
  const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
  env.control?.registerTarget('did:dead');
  env.control?.registerTarget('did:declining', { rejectAfterPay: true });
  const store = new AttestationStore();
  const detector = new DowntimeDetector(store);
  const req = env.forAgent('did:req');
  detector.attach(await req.connectWebSocket());

  const n1 = await req.negotiateOrder(
    { requesterDid: 'did:req', providerDid: 'did:dead', amountUsdc: '0.01', slaMinutes: 1 });
  const o1 = (await req.listOrders({ providerDid: 'did:dead' })).find((o) => o.negotiationId === n1.id);
  await req.payOrder(o1?.id ?? '');
  env.control?.killTarget('did:dead');
  clock.advance(1200);
  await flush();

  const n2 = await req.negotiateOrder(
    { requesterDid: 'did:req', providerDid: 'did:declining', amountUsdc: '0.01', slaMinutes: 1 });
  const o2 = (await req.listOrders({ providerDid: 'did:declining' })).find((o) => o.negotiationId === n2.id);
  await req.payOrder(o2?.id ?? '');
  clock.advance(150);
  await flush();

  expect(store.get('did:dead')?.incidents ?? []).toHaveLength(1);
  expect(store.get('did:dead')?.incidents[0]?.refundTxHash).toMatch(/^0x/);
  expect(store.get('did:declining')?.incidents ?? []).toHaveLength(0);
  expect(store.get('did:declining')?.lastResolvedStatus).toBe('rejected');
});

test('completed heartbeats are recorded as uptime', async () => {
  const clock = new ManualClock();
  const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
  env.control?.registerTarget('did:alive');
  const store = new AttestationStore();
  new DowntimeDetector(store).attach(await env.forAgent('did:req').connectWebSocket());
  const req = env.forAgent('did:req');
  const n = await req.negotiateOrder(
    { requesterDid: 'did:req', providerDid: 'did:alive', amountUsdc: '0.01', slaMinutes: 1 });
  const o = (await req.listOrders({ providerDid: 'did:alive' })).find((x) => x.negotiationId === n.id);
  await req.payOrder(o?.id ?? '');
  clock.advance(150);
  await flush();
  expect(store.get('did:alive')?.completedHeartbeats).toBe(1);
  expect(store.get('did:alive')?.incidents ?? []).toHaveLength(0);
});
