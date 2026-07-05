import { test, expect } from 'vitest';
import { decodeCapLogs, findRefundForExpiry } from './decode.js';
import type { RawLog } from './decode.js';
import expiry from './fixtures/expiry-refund.json' with { type: 'json' };
import reject from './fixtures/reject-refund.json' with { type: 'json' };

test('decodes CAPCore and CAPVault events from a mixed log set', () => {
  const decoded = decodeCapLogs(expiry as RawLog[]);
  expect(decoded.map((d) => d.name)).toEqual(['OrderExpired', 'EscrowRefunded']);
  expect(decoded[0]?.orderId).toBe('42');
});

test('findRefundForExpiry returns the refund tx for an expired order', () => {
  expect(findRefundForExpiry(expiry as RawLog[], 42)).toBe(
    '0xaaaa000000000000000000000000000000000000000000000000000000000001');
});

test('findRefundForExpiry returns null for a provider-reject refund (not downtime)', () => {
  expect(findRefundForExpiry(reject as RawLog[], 43)).toBeNull();
});

test('ignores logs with unknown topics', () => {
  const junk: RawLog[] = [{ topics: ['0x' + '00'.repeat(32)], data: '0x', transactionHash: '0xdead' }];
  expect(decodeCapLogs(junk)).toEqual([]);
});
