import { test, expect } from 'vitest';
import { ManualClock } from '../cap/clock.js';
import { createMockEnvironment } from '../cap/environment.js';
import { buildDemoSystem } from './demo-system.js';

async function flush(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve();
}

test('MONEY SHOT: kill a monitored target → in-flight order expires → certificate cites the refund tx', async () => {
  const clock = new ManualClock();
  const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
  env.control?.registerTarget('did:target');
  const system = await buildDemoSystem({
    env,
    issuerDid: 'did:deadman',
    requesterDids: ['did:req1', 'did:req2'],
    targets: [{ did: 'did:target', amountUsdc: '0.01', slaMinutes: 1 }],
    now: () => clock.now(),
  });
  await flush();
  clock.advance(150);          // first heartbeat completes (healthy)
  await flush();
  expect(system.getSnapshot().targets[0]?.status).not.toBe('down');

  system.control?.killTarget('did:target');   // kill AFTER escrow locks, before delivery
  clock.advance(1200);         // SLA lapses on the in-flight order
  await flush();

  const view = system.getSnapshot().targets[0];
  expect(view?.status).toBe('down');
  expect(view?.incidents[view.incidents.length - 1]?.refundTxHash).toMatch(/^0x/);
  system.stop();
  await env.close();
});
