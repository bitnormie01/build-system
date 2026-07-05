# chain-decode Implementation Plan

**Goal:** Decode CAPCore/CAPVault event logs from Base using ABIs sourced verbatim from
`cap-contracts`, and extract the `EscrowRefunded` tx that proves an `OrderExpired` — while returning
`null` for a provider-reject refund — tested purely on recorded fixtures (never live RPC).
**Architecture:** ABI fragments live as JSON; `decodeCapLogs` uses one merged ethers `Interface` to parse
raw logs; `findRefundForExpiry` correlates an expiry with its refund tx by `orderId`. Recorded fixtures
(one expiry+refund, one reject+refund) are committed and drive the tests.
**Tech Stack:** TypeScript ^5.6 (strict, NodeNext, resolveJsonModule), vitest ^2.1, ethers ^6.13.
**Source spec:** docs/superpowers/specs/2026-07-05-deadman-design.md

> **Provenance:** ABIs transcribed 2026-07-05 from `github.com/CROO-Network/cap-contracts`
> (`contracts/interfaces/ICAPCore.sol`, `ICAPVault.sol`, main). Fixtures were generated with ethers
> `encodeEventLog` against these exact signatures. The topic0 hashes are real keccak256 of the event
> signatures. **HUMAN_TODO:** re-verify the on-chain ABI/log shape before the live decode run.
>
> **ESM rule:** relative imports carry `.js`; `import type` for types; never `as any`. Never a secret value.

---

### Task 1: Sourced ABIs & canonical addresses

**Files:**
- Create: `src/chain/abis/capcore.json`
- Create: `src/chain/abis/capvault.json`
- Create: `src/chain/addresses.ts`
- Test:   `src/chain/addresses.test.ts`

**Depends on:** foundation Task 1
**Effort:** low
**Provides:** `CAP_CORE_ADDRESS`, `CAP_VAULT_ADDRESS`, `USDC_BASE_ADDRESS`, `BASE_CHAIN_ID`
**Requires:** (none)

- [ ] **Step 1: Write the failing test**
      ```ts
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
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/chain/addresses.test.ts`
      Expected: FAIL — cannot find module `./addresses.js`
- [ ] **Step 3: Create the ABIs and addresses**
      `src/chain/abis/capcore.json`:
      ```json
      [
        { "type": "event", "name": "OrderCreated", "anonymous": false, "inputs": [
          { "name": "orderId", "type": "uint256", "indexed": true },
          { "name": "requestor", "type": "address", "indexed": true },
          { "name": "provider", "type": "address", "indexed": true },
          { "name": "budget", "type": "uint256", "indexed": false },
          { "name": "paymentToken", "type": "address", "indexed": false },
          { "name": "deliveryWindow", "type": "uint256", "indexed": false },
          { "name": "serviceId", "type": "string", "indexed": false },
          { "name": "isFundOrder", "type": "bool", "indexed": false },
          { "name": "needEvaluation", "type": "bool", "indexed": false },
          { "name": "fundParams", "type": "bytes", "indexed": false }
        ] },
        { "type": "event", "name": "OrderPaid", "anonymous": false, "inputs": [
          { "name": "orderId", "type": "uint256", "indexed": true }
        ] },
        { "type": "event", "name": "OrderDelivered", "anonymous": false, "inputs": [
          { "name": "orderId", "type": "uint256", "indexed": true },
          { "name": "deliveryData", "type": "bytes", "indexed": false },
          { "name": "deliveredAt", "type": "uint256", "indexed": false }
        ] },
        { "type": "event", "name": "OrderCleared", "anonymous": false, "inputs": [
          { "name": "orderId", "type": "uint256", "indexed": true },
          { "name": "deliveryData", "type": "bytes", "indexed": false }
        ] },
        { "type": "event", "name": "OrderRejected", "anonymous": false, "inputs": [
          { "name": "orderId", "type": "uint256", "indexed": true },
          { "name": "rejectedBy", "type": "address", "indexed": false },
          { "name": "reason", "type": "string", "indexed": false }
        ] },
        { "type": "event", "name": "OrderExpired", "anonymous": false, "inputs": [
          { "name": "orderId", "type": "uint256", "indexed": true }
        ] }
      ]
      ```
      `src/chain/abis/capvault.json`:
      ```json
      [
        { "type": "event", "name": "EscrowLocked", "anonymous": false, "inputs": [
          { "name": "orderId", "type": "uint256", "indexed": true },
          { "name": "token", "type": "address", "indexed": false },
          { "name": "amount", "type": "uint256", "indexed": false }
        ] },
        { "type": "event", "name": "PaymentReleased", "anonymous": false, "inputs": [
          { "name": "orderId", "type": "uint256", "indexed": true },
          { "name": "provider", "type": "address", "indexed": false },
          { "name": "providerAmount", "type": "uint256", "indexed": false },
          { "name": "treasury", "type": "address", "indexed": false },
          { "name": "platformFee", "type": "uint256", "indexed": false }
        ] },
        { "type": "event", "name": "EscrowRefunded", "anonymous": false, "inputs": [
          { "name": "orderId", "type": "uint256", "indexed": true },
          { "name": "requestor", "type": "address", "indexed": false },
          { "name": "amount", "type": "uint256", "indexed": false }
        ] }
      ]
      ```
      `src/chain/addresses.ts`:
      ```ts
      export const CAP_CORE_ADDRESS = '0xaD46f1Eba2fe9cBB689D2874a52039192F2ac821';
      export const CAP_VAULT_ADDRESS = '0x33ECdcC8dD32330ec5a62AB1986F25ED5B5D170d';
      export const USDC_BASE_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
      export const BASE_CHAIN_ID = 8453;
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/chain/addresses.test.ts`
      Expected: PASS — "2 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(chain): sourced CAPCore/CAPVault ABIs and addresses`

---

### Task 2: Recorded log fixtures

**Files:**
- Create: `src/chain/fixtures/expiry-refund.json`
- Create: `src/chain/fixtures/reject-refund.json`
- Test:   `src/chain/fixtures/fixtures.test.ts`

**Depends on:** Task 1, foundation Task 1
**Effort:** low
**Provides:** `expiry-refund.json`, `reject-refund.json`
**Requires:** (none)

- [ ] **Step 1: Write the failing test**
      The topic0 values are the real keccak256 of the event signatures (verified with ethers).
      ```ts
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
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/chain/fixtures/fixtures.test.ts`
      Expected: FAIL — cannot find module `./expiry-refund.json`
- [ ] **Step 3: Create the fixtures**
      `src/chain/fixtures/expiry-refund.json`:
      ```json
      [
        {
          "address": "0xaD46f1Eba2fe9cBB689D2874a52039192F2ac821",
          "topics": [
            "0x1ad308dc7017610c82d08084545f7176df5e2f08f078c3c8f8926cd7e5555514",
            "0x000000000000000000000000000000000000000000000000000000000000002a"
          ],
          "data": "0x",
          "blockNumber": 100,
          "transactionHash": "0xaaaa000000000000000000000000000000000000000000000000000000000001",
          "logIndex": 0
        },
        {
          "address": "0x33ECdcC8dD32330ec5a62AB1986F25ED5B5D170d",
          "topics": [
            "0xeac97bc1917fcedc984e3d0671d4e83b359890323d5d1c2de32b28d17c356ced",
            "0x000000000000000000000000000000000000000000000000000000000000002a"
          ],
          "data": "0x00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000002710",
          "blockNumber": 100,
          "transactionHash": "0xaaaa000000000000000000000000000000000000000000000000000000000001",
          "logIndex": 1
        }
      ]
      ```
      `src/chain/fixtures/reject-refund.json`:
      ```json
      [
        {
          "address": "0xaD46f1Eba2fe9cBB689D2874a52039192F2ac821",
          "topics": [
            "0xb1544707a474e6118a9704a2715d102eb87f02b3b079f4bd32f085640173105e",
            "0x000000000000000000000000000000000000000000000000000000000000002b"
          ],
          "data": "0x00000000000000000000000022222222222222222222222222222222222222220000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000001170726f7669646572206465636c696e6573000000000000000000000000000000",
          "blockNumber": 101,
          "transactionHash": "0xbbbb000000000000000000000000000000000000000000000000000000000002",
          "logIndex": 0
        },
        {
          "address": "0x33ECdcC8dD32330ec5a62AB1986F25ED5B5D170d",
          "topics": [
            "0xeac97bc1917fcedc984e3d0671d4e83b359890323d5d1c2de32b28d17c356ced",
            "0x000000000000000000000000000000000000000000000000000000000000002b"
          ],
          "data": "0x00000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000000000000002710",
          "blockNumber": 101,
          "transactionHash": "0xbbbb000000000000000000000000000000000000000000000000000000000002",
          "logIndex": 1
        }
      ]
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/chain/fixtures/fixtures.test.ts`
      Expected: PASS — "2 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(chain): recorded expiry/reject log fixtures`

---

### Task 3: Log decoder & refund-for-expiry correlation

**Files:**
- Create: `src/chain/decode.ts`
- Test:   `src/chain/decode.test.ts`

**Depends on:** Task 1, Task 2, foundation Task 2
**Effort:** medium
**Provides:** `decodeCapLogs`, `findRefundForExpiry`, `RawLog`, `CapDecodedEvent`
**Requires:** `TxHash`

- [ ] **Step 1: Write the failing test**
      This is the chain-layer statement of the thesis: an expiry yields the refund tx; a reject (which also
      refunds) yields `null`.
      ```ts
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
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/chain/decode.test.ts`
      Expected: FAIL — cannot find module `./decode.js`
- [ ] **Step 3: Implement the decoder**
      Upstream: `TxHash` is `` `0x${string}` `` (from `src/domain/types.ts`). ethers v6 `Interface.parseLog`
      returns `null` for an unknown topic0; `parsed.args.getValue('orderId')` reads the indexed order id.
      ```ts
      import { Interface } from 'ethers';
      import type { TxHash } from '../domain/types.js';
      import capcore from './abis/capcore.json' with { type: 'json' };
      import capvault from './abis/capvault.json' with { type: 'json' };

      export interface RawLog {
        topics: string[];
        data: string;
        transactionHash: string;
      }

      export interface CapDecodedEvent {
        name: string;
        orderId: string;
        txHash: TxHash;
      }

      const iface = new Interface([...capcore, ...capvault]);

      export function decodeCapLogs(logs: RawLog[]): CapDecodedEvent[] {
        const out: CapDecodedEvent[] = [];
        for (const log of logs) {
          let parsed;
          try {
            parsed = iface.parseLog({ topics: log.topics, data: log.data });
          } catch {
            parsed = null;
          }
          if (!parsed) continue;
          const orderId: unknown = parsed.args.getValue('orderId');
          out.push({
            name: parsed.name,
            orderId: typeof orderId === 'bigint' ? orderId.toString() : String(orderId),
            txHash: log.transactionHash as TxHash,
          });
        }
        return out;
      }

      export function findRefundForExpiry(logs: RawLog[], orderId: string | number): TxHash | null {
        const decoded = decodeCapLogs(logs);
        const target = String(orderId);
        const expired = decoded.find((d) => d.name === 'OrderExpired' && d.orderId === target);
        if (!expired) return null;
        const refund = decoded.find((d) => d.name === 'EscrowRefunded' && d.orderId === target);
        return refund ? refund.txHash : null;
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/chain/decode.test.ts`
      Expected: PASS — "4 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(chain): CAP log decoder + refund-for-expiry correlation`
