import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const text = readFileSync(new URL('../../.env.example', import.meta.url), 'utf8');
const lines = text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
const map = new Map(lines.map((l) => {
  const i = l.indexOf('=');
  return [l.slice(0, i), l.slice(i + 1)] as const;
}));

test('lists all six required variables', () => {
  for (const name of ['CROO_SDK_KEY_DEADMAN','CROO_SDK_KEY_REQUESTER_1','CROO_SDK_KEY_REQUESTER_2',
    'CROO_SDK_KEY_TARGET','BASE_RPC_URL','DEADMAN_MODE']) {
    expect(map.has(name)).toBe(true);
  }
});
test('secret keys carry NO value (env names only)', () => {
  for (const name of ['CROO_SDK_KEY_DEADMAN','CROO_SDK_KEY_REQUESTER_1','CROO_SDK_KEY_REQUESTER_2',
    'CROO_SDK_KEY_TARGET']) {
    expect(map.get(name)).toBe('');
  }
});
