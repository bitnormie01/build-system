import { test, expect } from 'vitest';
import expiry from './expiry-refund.json' with { type: 'json' };
import reject from './reject-refund.json' with { type: 'json' };

const ORDER_EXPIRED = '0x1ad308dc7017610c82d08084545f7176df5e2f08f078c3c8f8926cd7e5555514';
const ORDER_REJECTED = '0xb1544707a474e6118a9704a2715d102eb87f02b3b079f4bd32f085640173105e';
const ESCROW_REFUNDED = '0xeac97bc1917fcedc984e3d0671d4e83b359890323d5d1c2de32b28d17c356ced';

test('expiry fixture is an OrderExpired plus its EscrowRefunded', () => {
  expect(expiry).toHaveLength(2);
  expect(expiry[0]?.topics[0]).toBe(ORDER_EXPIRED);
  expect(expiry[1]?.topics[0]).toBe(ESCROW_REFUNDED);
  expect(expiry[0]?.transactionHash).toBe(expiry[1]?.transactionHash);
});

test('reject fixture is an OrderRejected plus its EscrowRefunded (no expiry)', () => {
  expect(reject).toHaveLength(2);
  expect(reject[0]?.topics[0]).toBe(ORDER_REJECTED);
  expect(reject[1]?.topics[0]).toBe(ESCROW_REFUNDED);
});
