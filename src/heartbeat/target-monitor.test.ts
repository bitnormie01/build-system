import { test, expect } from 'vitest';
import { ManualClock } from '../cap/clock.js';
import { createMockEnvironment } from '../cap/environment.js';
import { RequesterShard } from './requester-shard.js';
import { TargetMonitor } from './target-monitor.js';

async function flush(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve();
}

test('keeps exactly one in-flight paid order and reopens on completion', async () => {
  const clock = new ManualClock();
  const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
  env.control?.registerTarget('did:t');
  const shard = new RequesterShard('did:req', env.forAgent('did:req'));
  const monitor = new TargetMonitor(shard, 'did:t', { amountUsdc: '0.01', slaMinutes: 1 });
  await monitor.start();
  await flush();
  const first = monitor.getState().inFlightOrderId;
  expect(first).not.toBeNull();
  clock.advance(150);         // auto-deliver completes the first heartbeat
  await flush();
  const second = monitor.getState().inFlightOrderId;
  expect(second).not.toBeNull();
  expect(second).not.toBe(first);
  expect(monitor.getState().resolved).toBe(1);
  monitor.stop();
});

test('kill → in-flight order expires; monitor records expiry and reopens', async () => {
  const clock = new ManualClock();
  const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
  env.control?.registerTarget('did:t');
  const shard = new RequesterShard('did:req', env.forAgent('did:req'));
  const monitor = new TargetMonitor(shard, 'did:t', { amountUsdc: '0.01', slaMinutes: 1 });
  await monitor.start();
  await flush();
  env.control?.killTarget('did:t');
  clock.advance(1200);        // auto-deliver no-ops (dead), SLA expires
  await flush();
  expect(monitor.getState().lastStatus).toBe('expired');
  monitor.stop();
});
