import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const doc = readFileSync(new URL('../../docs/runbooks/register-agents.md', import.meta.url), 'utf8');

test('runbook covers the four agents, AA-wallet funding, and the key env names', () => {
  expect(doc).toContain('Deadman');
  expect(doc).toContain('requester');
  expect(doc).toContain('kill-target');
  expect(doc).toContain('AA Wallet');
  expect(doc).toContain('CROO_SDK_KEY_DEADMAN');
  expect(doc).toContain('DEADMAN_MODE=live');
});
