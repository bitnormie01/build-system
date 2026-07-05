import { test, expect } from 'vitest';
import { RequesterShard } from './requester-shard.js';
import type { CapClient } from '../domain/cap-client.js';

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

test('pay calls serialize per shard (never two concurrent payOrder)', async () => {
  let active = 0;
  let maxActive = 0;
  const gates: Array<() => void> = [];
  const client = {
    payOrder(orderId: string) {
      active += 1;
      maxActive = Math.max(maxActive, active);
      return new Promise<{ orderId: string; escrowLocked: boolean }>((resolve) => {
        gates.push(() => {
          active -= 1;
          resolve({ orderId, escrowLocked: true });
        });
      });
    },
  } as unknown as CapClient;

  const shard = new RequesterShard('did:req', client);
  const p1 = shard.pay('o1');
  const p2 = shard.pay('o2');
  await flush();
  expect(gates).toHaveLength(1);      // only the first pay has started
  gates[0]?.();
  await p1;
  await flush();
  expect(gates).toHaveLength(2);      // the second pay starts only after the first resolves
  gates[1]?.();
  await p2;
  expect(maxActive).toBe(1);
});
