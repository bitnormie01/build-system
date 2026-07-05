import { test, expect } from 'vitest';
import { createLiveEnvironment } from './live-environment.js';
import type { SdkAgentClient } from './sdk-agent-client.js';

const fakeSdk = { payOrder: async () => ({ orderId: 'o' }) } as unknown as SdkAgentClient;

test('builds a LiveCapClient per agent from its key; control is null in live mode', async () => {
  const env = await createLiveEnvironment({
    agentKeys: { 'did:a': 'key-a', 'did:b': 'key-b' },
    sdkFactory: () => fakeSdk,
  });
  expect(env.control).toBeNull();
  expect(typeof env.forAgent('did:a').payOrder).toBe('function');
});

test('throws for an agent with no configured key', async () => {
  const env = await createLiveEnvironment({ agentKeys: {}, sdkFactory: () => fakeSdk });
  expect(() => env.forAgent('did:missing')).toThrow(/key/i);
});
