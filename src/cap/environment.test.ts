import { test, expect } from 'vitest';
import { ManualClock } from './clock.js';
import { createMockEnvironment } from './environment.js';

test('mock environment exposes forAgent clients and a live control surface', async () => {
  const clock = new ManualClock();
  const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
  expect(env.control).not.toBeNull();
  env.control?.registerTarget('did:prov');
  const requester = env.forAgent('did:req');
  const neg = await requester.negotiateOrder(
    { requesterDid: 'did:req', providerDid: 'did:prov', amountUsdc: '0.01', slaMinutes: 1 });
  expect(neg.status).toBe('accepted');
  const orderId = (await requester.listOrders({ requesterDid: 'did:req' }))[0]?.id ?? '';
  await requester.payOrder(orderId);
  env.control?.killTarget('did:prov');
  clock.advance(1200);
  expect((await requester.getOrder(orderId)).status).toBe('expired');
  await env.close();
});
