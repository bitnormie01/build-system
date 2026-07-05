import { test, expect } from 'vitest';
import { CAP_CORE_ADDRESS, CAP_VAULT_ADDRESS, USDC_BASE_ADDRESS, BASE_CHAIN_ID } from './addresses.js';
import capcore from './abis/capcore.json' with { type: 'json' };
import capvault from './abis/capvault.json' with { type: 'json' };

test('canonical Base mainnet addresses (verbatim from the resource pack)', () => {
  expect(CAP_CORE_ADDRESS).toBe('0xaD46f1Eba2fe9cBB689D2874a52039192F2ac821');
  expect(CAP_VAULT_ADDRESS).toBe('0x33ECdcC8dD32330ec5a62AB1986F25ED5B5D170d');
  expect(USDC_BASE_ADDRESS).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
  expect(BASE_CHAIN_ID).toBe(8453);
});

test('ABIs declare the events the product depends on', () => {
  const coreNames = capcore.map((e) => e.name);
  expect(coreNames).toContain('OrderExpired');
  expect(coreNames).toContain('OrderRejected');
  const vaultNames = capvault.map((e) => e.name);
  expect(vaultNames).toContain('EscrowRefunded');
});
