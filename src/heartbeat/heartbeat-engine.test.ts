import { test, expect } from 'vitest';
import { ManualClock } from '../cap/clock.js';
import { createMockEnvironment } from '../cap/environment.js';
import { RequesterShard } from './requester-shard.js';
import { HeartbeatEngine } from './heartbeat-engine.js';

async function flush(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve();
}

test('round-robins targets across shards and keeps each in flight', async () => {
  const clock = new ManualClock();
  const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
  for (const t of ['did:t0', 'did:t1', 'did:t2']) env.control?.registerTarget(t);
  const shardA = new RequesterShard('did:reqA', env.forAgent('did:reqA'));
  const shardB = new RequesterShard('did:reqB', env.forAgent('did:reqB'));
  const engine = new HeartbeatEngine([shardA, shardB]);
  await engine.start([
    { did: 'did:t0', amountUsdc: '0.01', slaMinutes: 1 },
    { did: 'did:t1', amountUsdc: '0.01', slaMinutes: 1 },
    { did: 'did:t2', amountUsdc: '0.01', slaMinutes: 1 },
  ]);
  await flush();
  expect(engine.getStates()).toHaveLength(3);
  for (const s of engine.getStates()) expect(s.inFlightOrderId).not.toBeNull();
  const bOrders = await env.forAgent('did:reqB').listOrders({ requesterDid: 'did:reqB' });
  expect(bOrders.every((o) => o.providerDid === 'did:t1')).toBe(true);
  const aOrders = await env.forAgent('did:reqA').listOrders({ requesterDid: 'did:reqA' });
  expect(new Set(aOrders.map((o) => o.providerDid))).toEqual(new Set(['did:t0', 'did:t2']));
  engine.stop();
});

test('throws when constructed with no shards', () => {
  expect(() => new HeartbeatEngine([])).toThrow(/shard/);
});
