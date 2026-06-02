# Shared Implementation Plan

**Goal:** Build `@tollgate/shared` — the single, centralized Sui integration surface (types, env config, client, PTB builders, coin selection, receipt reading/verification) that the middleware, agent, dashboard, and deploy scripts all import.
**Architecture:** npm-workspaces monorepo. `@tollgate/shared` exposes each module via a subpath export (`@tollgate/shared/<module>`) so packages import exactly what they need with no barrel-file race; resolution works for `tsc`, `vitest` (via `vite-tsconfig-paths`), and `tsx` runtime (via the workspace symlink). All Sui SDK calls live here.
**Tech Stack:** TypeScript `^5.6` (ESM, strict, `noUncheckedIndexedAccess`), `@mysten/sui ^2.17.0`, `zod ^3.23`, `vitest ^2.1`, `tsx ^4.19`, `vite-tsconfig-paths ^5.1`, Node ≥ 20.
**Source spec:** docs/superpowers/specs/2026-06-02-tollgate-machine-payable-web-design.md

> Conventions (apply to every task): strict TS, no `as any` (use `as unknown as T`), no placeholders, exact paths, complete code, named exports, paste required signatures. Never put a key/secret in any file — env-var names only. Sync the repo before work; commit before done.

---

### Task 1: Monorepo + `@tollgate/shared` scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `vitest.config.ts`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/version.ts`
- Test:   `packages/shared/src/version.test.ts`

**Depends on:** —
**Effort:** medium
**Provides:**
- npm workspace root (`workspaces: ["packages/*"]`), root dev deps, `tsconfig.base.json` with path alias `@tollgate/shared/* → packages/shared/src/*`, root `vitest.config.ts` (with `vite-tsconfig-paths`, jsdom for dashboard).
- package `@tollgate/shared` (subpath exports `./*` → `./src/*.ts`); `export const SHARED_VERSION: string`.

**Requires:** —

- [ ] **Step 1: Create root `package.json`**
      ```json
      {
        "name": "tollgate",
        "private": true,
        "type": "module",
        "workspaces": ["packages/*"],
        "engines": { "node": ">=20" },
        "scripts": {
          "test": "vitest run",
          "typecheck": "npm run typecheck --workspaces --if-present"
        },
        "devDependencies": {
          "@types/node": "^20.16.0",
          "tsx": "^4.19.0",
          "typescript": "^5.6.0",
          "vite-tsconfig-paths": "^5.1.0",
          "vitest": "^2.1.0"
        }
      }
      ```
- [ ] **Step 2: Create `tsconfig.base.json`**
      ```json
      {
        "compilerOptions": {
          "target": "ES2022",
          "module": "ESNext",
          "moduleResolution": "Bundler",
          "lib": ["ES2022", "DOM"],
          "strict": true,
          "noUncheckedIndexedAccess": true,
          "esModuleInterop": true,
          "skipLibCheck": true,
          "resolveJsonModule": true,
          "forceConsistentCasingInFileNames": true,
          "verbatimModuleSyntax": false,
          "baseUrl": ".",
          "paths": {
            "@tollgate/shared/*": ["packages/shared/src/*"]
          }
        }
      }
      ```
- [ ] **Step 3: Create root `vitest.config.ts`**
      ```ts
      import { defineConfig } from 'vitest/config';
      import tsconfigPaths from 'vite-tsconfig-paths';

      export default defineConfig({
        plugins: [tsconfigPaths()],
        test: {
          globals: false,
        },
      });
      ```
- [ ] **Step 4: Create `.gitignore`**
      ```gitignore
      node_modules/
      dist/
      .env
      *.log
      move/tollgate/build/
      deployment.json
      ```
- [ ] **Step 5: Create `.env.example`** (names only — never real values)
      ```dotenv
      # Sui
      SUI_NETWORK=testnet
      SUI_RPC_URL=https://fullnode.testnet.sui.io:443
      TOLLGATE_PACKAGE_ID=
      MUSD_COIN_TYPE=

      # Agent wallet — Sui Ed25519 private key (suiprivkey1... bech32). NEVER commit a real value.
      AGENT_PK=

      # DGrid LLM gateway (OpenAI-compatible). Verify the exact cheapest-Claude model id in DGrid's catalog.
      DGRID_API_KEY=
      DGRID_BASE_URL=https://api.dgrid.ai/v1
      TOLLGATE_AGENT_MODEL=anthropic/claude-3.5-haiku

      # Paid demo server
      PORT=8402
      ```
- [ ] **Step 6: Create `packages/shared/package.json`**
      ```json
      {
        "name": "@tollgate/shared",
        "version": "0.1.0",
        "private": true,
        "type": "module",
        "exports": { "./*": "./src/*.ts" },
        "scripts": { "typecheck": "tsc --noEmit" },
        "dependencies": {
          "@mysten/sui": "^2.17.0",
          "zod": "^3.23.0"
        }
      }
      ```
- [ ] **Step 7: Create `packages/shared/tsconfig.json`**
      ```json
      {
        "extends": "../../tsconfig.base.json",
        "include": ["src"]
      }
      ```
- [ ] **Step 8: Create source + test**
      `packages/shared/src/version.ts`:
      ```ts
      export const SHARED_VERSION = '0.1.0';
      ```
      `packages/shared/src/version.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { SHARED_VERSION } from './version';

      describe('shared', () => {
        it('exposes a version string', () => {
          expect(SHARED_VERSION).toBe('0.1.0');
        });
      });
      ```
- [ ] **Step 9: Install dependencies**
      Run: `npm install`
      Expected: exits 0 (lockfile written, `@tollgate/shared` symlinked into `node_modules`).
- [ ] **Step 10: Run the test** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/shared/src/version.test.ts`
      Expected: PASS — `1 passed`.
- [ ] **Step 11: Commit**
      ```bash
      git add package.json tsconfig.base.json vitest.config.ts .gitignore .env.example package-lock.json packages/shared
      git commit -m "chore: scaffold npm workspace and @tollgate/shared"
      ```

---

### Task 2: `types.ts` — protocol types + challenge schema

**Files:**
- Create: `packages/shared/src/types.ts`
- Test:   `packages/shared/src/types.test.ts`

**Depends on:** Task 1
**Effort:** low
**Provides:**
- `PaymentChallengeSchema` (zod) and `type PaymentChallenge = z.infer<...>` `{ resourceId, packageId, coinType, price, recipient, nonce: string(hex), expiresAt: number }`
- `interface ResourceConfig { resourceId; coinType; price; recipient }`
- `interface PaymentReceiptEvent { resourceId; payer; amount; nonce; timestampMs; txDigest }`
- `interface VerifyResult { ok: boolean; reason?: string }`

**Requires:** `@tollgate/shared` package (Task 1)

- [ ] **Step 1: Write the failing test**
      `packages/shared/src/types.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { PaymentChallengeSchema } from './types';

      const valid = {
        resourceId: '0xr', packageId: '0xp', coinType: '0xp::mock_usd::MOCK_USD',
        price: '1000', recipient: '0xo', nonce: 'a1b2', expiresAt: 1750000000000,
      };

      describe('PaymentChallengeSchema', () => {
        it('parses a valid challenge', () => {
          expect(PaymentChallengeSchema.parse(valid)).toEqual(valid);
        });
        it('rejects a challenge missing nonce', () => {
          const { nonce, ...rest } = valid;
          expect(PaymentChallengeSchema.safeParse(rest).success).toBe(false);
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/shared/src/types.test.ts`
      Expected: FAIL — cannot resolve `./types` / `PaymentChallengeSchema` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/shared/src/types.ts`:
      ```ts
      import { z } from 'zod';

      export const PaymentChallengeSchema = z.object({
        resourceId: z.string(),
        packageId: z.string(),
        coinType: z.string(),
        price: z.string(),
        recipient: z.string(),
        nonce: z.string(),
        expiresAt: z.number(),
      });
      export type PaymentChallenge = z.infer<typeof PaymentChallengeSchema>;

      export interface ResourceConfig {
        resourceId: string;
        coinType: string;
        price: string;
        recipient: string;
      }

      export interface PaymentReceiptEvent {
        resourceId: string;
        payer: string;
        amount: string;
        nonce: string;
        timestampMs: string;
        txDigest: string;
      }

      export interface VerifyResult {
        ok: boolean;
        reason?: string;
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/shared/src/types.test.ts`
      Expected: PASS — `2 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/shared/src/types.ts packages/shared/src/types.test.ts
      git commit -m "feat(shared): protocol types and PaymentChallenge schema"
      ```

---

### Task 3: `config.ts` — validated env loader

**Files:**
- Create: `packages/shared/src/config.ts`
- Test:   `packages/shared/src/config.test.ts`

**Depends on:** Task 1
**Effort:** low
**Provides:**
- `type SuiNetwork = 'testnet'|'mainnet'|'devnet'|'localnet'`
- `interface TollgateConfig { network: SuiNetwork; rpcUrl: string; packageId: string; musdCoinType: string }`
- `function loadConfig(env?: NodeJS.ProcessEnv): TollgateConfig` (throws naming missing vars)

**Requires:** `@tollgate/shared` package (Task 1)

- [ ] **Step 1: Write the failing test**
      `packages/shared/src/config.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { loadConfig } from './config';

      const base = {
        SUI_NETWORK: 'testnet',
        SUI_RPC_URL: 'https://fullnode.testnet.sui.io:443',
        TOLLGATE_PACKAGE_ID: '0xpkg',
        MUSD_COIN_TYPE: '0xpkg::mock_usd::MOCK_USD',
      } as NodeJS.ProcessEnv;

      describe('loadConfig', () => {
        it('loads a valid config', () => {
          const cfg = loadConfig(base);
          expect(cfg.network).toBe('testnet');
          expect(cfg.packageId).toBe('0xpkg');
          expect(cfg.musdCoinType).toContain('MOCK_USD');
        });
        it('throws naming the missing var', () => {
          const { TOLLGATE_PACKAGE_ID, ...rest } = base;
          expect(() => loadConfig(rest as NodeJS.ProcessEnv)).toThrow(/TOLLGATE_PACKAGE_ID/);
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/shared/src/config.test.ts`
      Expected: FAIL — `loadConfig` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/shared/src/config.ts`:
      ```ts
      import { z } from 'zod';

      const NETWORKS = ['testnet', 'mainnet', 'devnet', 'localnet'] as const;
      export type SuiNetwork = (typeof NETWORKS)[number];

      export interface TollgateConfig {
        network: SuiNetwork;
        rpcUrl: string;
        packageId: string;
        musdCoinType: string;
      }

      const EnvSchema = z.object({
        SUI_NETWORK: z.enum(NETWORKS).default('testnet'),
        SUI_RPC_URL: z.string().url(),
        TOLLGATE_PACKAGE_ID: z.string().min(3),
        MUSD_COIN_TYPE: z.string().min(3),
      });

      export function loadConfig(env: NodeJS.ProcessEnv = process.env): TollgateConfig {
        const parsed = EnvSchema.safeParse(env);
        if (!parsed.success) {
          const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
          throw new Error(`Invalid Tollgate config; check env vars: ${missing}`);
        }
        return {
          network: parsed.data.SUI_NETWORK,
          rpcUrl: parsed.data.SUI_RPC_URL,
          packageId: parsed.data.TOLLGATE_PACKAGE_ID,
          musdCoinType: parsed.data.MUSD_COIN_TYPE,
        };
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/shared/src/config.test.ts`
      Expected: PASS — `2 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/shared/src/config.ts packages/shared/src/config.test.ts
      git commit -m "feat(shared): validated env config loader"
      ```

---

### Task 4: `client.ts` — Sui client factory

**Files:**
- Create: `packages/shared/src/client.ts`
- Test:   `packages/shared/src/client.test.ts`

**Depends on:** Task 3
**Effort:** low
**Provides:**
- `function defaultRpcUrl(network: SuiNetwork): string`
- `function getSuiClient(opts: { rpcUrl: string }): SuiClient`

**Requires:**
```ts
// from Task 3 (config.ts):
export type SuiNetwork = 'testnet' | 'mainnet' | 'devnet' | 'localnet';
```

- [ ] **Step 1: Write the failing test**
      `packages/shared/src/client.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { SuiClient } from '@mysten/sui/client';
      import { defaultRpcUrl, getSuiClient } from './client';

      describe('client', () => {
        it('builds a testnet fullnode url', () => {
          expect(defaultRpcUrl('testnet')).toContain('testnet');
        });
        it('returns a SuiClient instance', () => {
          const client = getSuiClient({ rpcUrl: defaultRpcUrl('testnet') });
          expect(client).toBeInstanceOf(SuiClient);
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/shared/src/client.test.ts`
      Expected: FAIL — `getSuiClient` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/shared/src/client.ts`:
      ```ts
      import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
      import type { SuiNetwork } from './config';

      export function defaultRpcUrl(network: SuiNetwork): string {
        return getFullnodeUrl(network);
      }

      export function getSuiClient(opts: { rpcUrl: string }): SuiClient {
        return new SuiClient({ url: opts.rpcUrl });
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/shared/src/client.test.ts`
      Expected: PASS — `2 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/shared/src/client.ts packages/shared/src/client.test.ts
      git commit -m "feat(shared): Sui client factory"
      ```

---

### Task 5: `receipts.ts` — receipt read + verify

**Files:**
- Create: `packages/shared/src/receipts.ts`
- Test:   `packages/shared/src/receipts.test.ts`

**Depends on:** Task 2
**Effort:** medium
**Provides:**
- `function bytesToHex(bytes: Uint8Array | number[]): string`
- `function hexToBytes(hex: string): Uint8Array`
- `async function readReceiptFromDigest(client: SuiClient, digest: string, packageId: string): Promise<PaymentReceiptEvent | null>`
- `function verifyReceipt(receipt: PaymentReceiptEvent, expected: { resourceId: string; price: string; nonce: string }): VerifyResult`

**Requires:**
```ts
// from Task 2 (types.ts):
export interface PaymentReceiptEvent { resourceId: string; payer: string; amount: string; nonce: string; timestampMs: string; txDigest: string }
export interface VerifyResult { ok: boolean; reason?: string }
// on-chain event (Move) parsedJson shape: { resource_id: string; payer: string; amount: string; nonce: number[]; timestamp_ms: string }
// event type string: `${packageId}::tollgate::PaymentReceipt`
```

- [ ] **Step 1: Write the failing test**
      `packages/shared/src/receipts.test.ts`:
      ```ts
      import { describe, it, expect, vi } from 'vitest';
      import type { SuiClient } from '@mysten/sui/client';
      import { bytesToHex, hexToBytes, readReceiptFromDigest, verifyReceipt } from './receipts';

      const PKG = '0xpkg';

      describe('hex helpers', () => {
        it('round-trips', () => {
          expect(bytesToHex([1, 2, 255])).toBe('0102ff');
          expect(Array.from(hexToBytes('0102ff'))).toEqual([1, 2, 255]);
          expect(Array.from(hexToBytes('0x0102ff'))).toEqual([1, 2, 255]);
        });
      });

      describe('readReceiptFromDigest', () => {
        it('parses a PaymentReceipt event', async () => {
          const client = {
            getTransactionBlock: vi.fn().mockResolvedValue({
              events: [{
                type: `${PKG}::tollgate::PaymentReceipt`,
                parsedJson: { resource_id: '0xr', payer: '0xb', amount: '1500', nonce: [161, 178], timestamp_ms: '123' },
              }],
            }),
          } as unknown as SuiClient;
          const r = await readReceiptFromDigest(client, '0xdig', PKG);
          expect(r).toEqual({ resourceId: '0xr', payer: '0xb', amount: '1500', nonce: 'a1b2', timestampMs: '123', txDigest: '0xdig' });
        });
        it('returns null when no receipt event present', async () => {
          const client = { getTransactionBlock: vi.fn().mockResolvedValue({ events: [] }) } as unknown as SuiClient;
          expect(await readReceiptFromDigest(client, '0xdig', PKG)).toBeNull();
        });
      });

      describe('verifyReceipt', () => {
        const r = { resourceId: '0xr', payer: '0xb', amount: '1500', nonce: 'a1b2', timestampMs: '1', txDigest: '0xd' };
        it('accepts a matching, sufficient payment', () => {
          expect(verifyReceipt(r, { resourceId: '0xr', price: '1000', nonce: 'a1b2' })).toEqual({ ok: true });
        });
        it('rejects underpayment', () => {
          expect(verifyReceipt(r, { resourceId: '0xr', price: '2000', nonce: 'a1b2' })).toEqual({ ok: false, reason: 'underpaid' });
        });
        it('rejects wrong resource', () => {
          expect(verifyReceipt(r, { resourceId: '0xz', price: '1000', nonce: 'a1b2' }).ok).toBe(false);
        });
        it('rejects nonce mismatch', () => {
          expect(verifyReceipt(r, { resourceId: '0xr', price: '1000', nonce: 'ffff' }).ok).toBe(false);
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/shared/src/receipts.test.ts`
      Expected: FAIL — `bytesToHex` / `readReceiptFromDigest` / `verifyReceipt` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/shared/src/receipts.ts`:
      ```ts
      import type { SuiClient } from '@mysten/sui/client';
      import type { PaymentReceiptEvent, VerifyResult } from './types';

      export function bytesToHex(bytes: Uint8Array | number[]): string {
        return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      }

      export function hexToBytes(hex: string): Uint8Array {
        const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
        const out = new Uint8Array(clean.length / 2);
        for (let i = 0; i < out.length; i++) {
          out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
        }
        return out;
      }

      interface RawReceipt {
        resource_id: string;
        payer: string;
        amount: string;
        nonce: number[];
        timestamp_ms: string;
      }

      export async function readReceiptFromDigest(
        client: SuiClient,
        digest: string,
        packageId: string,
      ): Promise<PaymentReceiptEvent | null> {
        const tx = await client.getTransactionBlock({ digest, options: { showEvents: true } });
        const wanted = `${packageId}::tollgate::PaymentReceipt`;
        const ev = tx.events?.find((e) => e.type === wanted);
        if (!ev) return null;
        const j = ev.parsedJson as RawReceipt;
        return {
          resourceId: j.resource_id,
          payer: j.payer,
          amount: j.amount,
          nonce: bytesToHex(j.nonce),
          timestampMs: j.timestamp_ms,
          txDigest: digest,
        };
      }

      export function verifyReceipt(
        receipt: PaymentReceiptEvent,
        expected: { resourceId: string; price: string; nonce: string },
      ): VerifyResult {
        if (receipt.resourceId !== expected.resourceId) return { ok: false, reason: 'resource mismatch' };
        if (BigInt(receipt.amount) < BigInt(expected.price)) return { ok: false, reason: 'underpaid' };
        if (receipt.nonce.toLowerCase() !== expected.nonce.toLowerCase()) return { ok: false, reason: 'nonce mismatch' };
        return { ok: true };
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/shared/src/receipts.test.ts`
      Expected: PASS — `8 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/shared/src/receipts.ts packages/shared/src/receipts.test.ts
      git commit -m "feat(shared): on-chain receipt read and verification"
      ```

---

### Task 6: `coins.ts` — exact-coin preparation

**Files:**
- Create: `packages/shared/src/coins.ts`
- Test:   `packages/shared/src/coins.test.ts`

**Depends on:** Task 1
**Effort:** medium
**Provides:**
- `async function prepareExactCoin(tx: Transaction, client: SuiClient, owner: string, coinType: string, amount: bigint): Promise<TransactionObjectArgument>`

**Requires:** `@mysten/sui` `Transaction`, `TransactionObjectArgument`, `SuiClient` (Task 1 installed it)

- [ ] **Step 1: Write the failing test**
      `packages/shared/src/coins.test.ts`:
      ```ts
      import { describe, it, expect, vi } from 'vitest';
      import type { SuiClient } from '@mysten/sui/client';
      import { Transaction } from '@mysten/sui/transactions';
      import { prepareExactCoin } from './coins';

      function clientWith(coins: { coinObjectId: string; balance: string }[]): SuiClient {
        return { getCoins: vi.fn().mockResolvedValue({ data: coins }) } as unknown as SuiClient;
      }

      describe('prepareExactCoin', () => {
        it('returns a coin argument and records split/merge commands', async () => {
          const tx = new Transaction();
          const client = clientWith([{ coinObjectId: '0xc1', balance: '700' }, { coinObjectId: '0xc2', balance: '700' }]);
          const coin = await prepareExactCoin(tx, client, '0xowner', '0xp::mock_usd::MOCK_USD', 1000n);
          expect(coin).toBeDefined();
          const data = JSON.stringify(tx.getData());
          expect(data).toContain('MergeCoins');
          expect(data).toContain('SplitCoins');
        });
        it('throws when no coins', async () => {
          const tx = new Transaction();
          await expect(prepareExactCoin(tx, clientWith([]), '0xo', '0xc', 1n)).rejects.toThrow(/no .* coins/);
        });
        it('throws when insufficient balance', async () => {
          const tx = new Transaction();
          const client = clientWith([{ coinObjectId: '0xc1', balance: '100' }]);
          await expect(prepareExactCoin(tx, client, '0xo', '0xc', 1000n)).rejects.toThrow(/insufficient/);
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/shared/src/coins.test.ts`
      Expected: FAIL — `prepareExactCoin` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/shared/src/coins.ts`:
      ```ts
      import type { SuiClient } from '@mysten/sui/client';
      import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';

      /**
       * Within `tx`, merge all `coinType` coins owned by `owner` and split off exactly `amount`.
       * Returns the split coin argument to pass into a moveCall.
       */
      export async function prepareExactCoin(
        tx: Transaction,
        client: SuiClient,
        owner: string,
        coinType: string,
        amount: bigint,
      ): Promise<TransactionObjectArgument> {
        const { data } = await client.getCoins({ owner, coinType });
        if (data.length === 0) throw new Error(`no ${coinType} coins owned by ${owner}`);
        const total = data.reduce((sum, c) => sum + BigInt(c.balance), 0n);
        if (total < amount) throw new Error(`insufficient ${coinType}: have ${total}, need ${amount}`);

        const primary = data[0];
        if (!primary) throw new Error(`no ${coinType} coins owned by ${owner}`);
        const primaryRef = tx.object(primary.coinObjectId);
        const rest = data.slice(1);
        if (rest.length > 0) {
          tx.mergeCoins(primaryRef, rest.map((c) => tx.object(c.coinObjectId)));
        }
        const split = tx.splitCoins(primaryRef, [tx.pure.u64(amount)]);
        const exact = split[0];
        if (!exact) throw new Error('split produced no coin');
        return exact;
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/shared/src/coins.test.ts`
      Expected: PASS — `3 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/shared/src/coins.ts packages/shared/src/coins.test.ts
      git commit -m "feat(shared): exact-coin preparation helper"
      ```

---

### Task 7: `ptb.ts` — register / pay / withdraw transaction builders

**Files:**
- Create: `packages/shared/src/ptb.ts`
- Test:   `packages/shared/src/ptb.test.ts`

**Depends on:** Task 5, Task 6
**Effort:** medium
**Provides:**
- `function buildRegisterTx(p: { packageId: string; coinType: string; price: string }): Transaction`
- `async function buildPayTx(client: SuiClient, p: { packageId: string; coinType: string; resourceObjectId: string; owner: string; amount: string; nonceHex: string }): Promise<Transaction>`
- `function buildWithdrawTx(p: { packageId: string; coinType: string; resourceObjectId: string; ownerCapId: string; amount: string }): Transaction`

**Requires:**
```ts
// from Task 6 (coins.ts):
export async function prepareExactCoin(tx: Transaction, client: SuiClient, owner: string, coinType: string, amount: bigint): Promise<TransactionObjectArgument>;
// from Task 5 (receipts.ts):
export function hexToBytes(hex: string): Uint8Array;
// Move targets (move plan):
//   `${pkg}::tollgate::register_resource<T>(price: u64)`
//   `${pkg}::tollgate::pay<T>(resource, coin, nonce: vector<u8>, clock)`  (clock = 0x6)
//   `${pkg}::tollgate::withdraw<T>(resource, cap, amount: u64)`
```

- [ ] **Step 1: Write the failing test**
      `packages/shared/src/ptb.test.ts`:
      ```ts
      import { describe, it, expect, vi } from 'vitest';
      import type { SuiClient } from '@mysten/sui/client';
      import { Transaction } from '@mysten/sui/transactions';
      import { buildRegisterTx, buildPayTx, buildWithdrawTx } from './ptb';

      const PKG = '0xpkg';
      const COIN = '0xpkg::mock_usd::MOCK_USD';

      describe('ptb builders', () => {
        it('buildRegisterTx targets register_resource with the coin type', () => {
          const tx = buildRegisterTx({ packageId: PKG, coinType: COIN, price: '1000' });
          expect(tx).toBeInstanceOf(Transaction);
          expect(JSON.stringify(tx.getData())).toContain('register_resource');
        });

        it('buildWithdrawTx targets withdraw', () => {
          const tx = buildWithdrawTx({ packageId: PKG, coinType: COIN, resourceObjectId: '0xr', ownerCapId: '0xcap', amount: '500' });
          expect(JSON.stringify(tx.getData())).toContain('withdraw');
        });

        it('buildPayTx selects a coin and targets pay', async () => {
          const client = { getCoins: vi.fn().mockResolvedValue({ data: [{ coinObjectId: '0xc1', balance: '5000' }] }) } as unknown as SuiClient;
          const tx = await buildPayTx(client, { packageId: PKG, coinType: COIN, resourceObjectId: '0xr', owner: '0xowner', amount: '1000', nonceHex: 'a1b2' });
          const data = JSON.stringify(tx.getData());
          expect(data).toContain('pay');
          expect(data).toContain('SplitCoins');
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/shared/src/ptb.test.ts`
      Expected: FAIL — builders undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/shared/src/ptb.ts`:
      ```ts
      import { Transaction } from '@mysten/sui/transactions';
      import type { SuiClient } from '@mysten/sui/client';
      import { prepareExactCoin } from './coins';
      import { hexToBytes } from './receipts';

      const CLOCK_ID = '0x6';

      export function buildRegisterTx(p: { packageId: string; coinType: string; price: string }): Transaction {
        const tx = new Transaction();
        tx.moveCall({
          target: `${p.packageId}::tollgate::register_resource`,
          typeArguments: [p.coinType],
          arguments: [tx.pure.u64(BigInt(p.price))],
        });
        return tx;
      }

      export async function buildPayTx(
        client: SuiClient,
        p: { packageId: string; coinType: string; resourceObjectId: string; owner: string; amount: string; nonceHex: string },
      ): Promise<Transaction> {
        const tx = new Transaction();
        const coin = await prepareExactCoin(tx, client, p.owner, p.coinType, BigInt(p.amount));
        tx.moveCall({
          target: `${p.packageId}::tollgate::pay`,
          typeArguments: [p.coinType],
          arguments: [
            tx.object(p.resourceObjectId),
            coin,
            tx.pure.vector('u8', Array.from(hexToBytes(p.nonceHex))),
            tx.object(CLOCK_ID),
          ],
        });
        return tx;
      }

      export function buildWithdrawTx(p: {
        packageId: string; coinType: string; resourceObjectId: string; ownerCapId: string; amount: string;
      }): Transaction {
        const tx = new Transaction();
        tx.moveCall({
          target: `${p.packageId}::tollgate::withdraw`,
          typeArguments: [p.coinType],
          arguments: [tx.object(p.resourceObjectId), tx.object(p.ownerCapId), tx.pure.u64(BigInt(p.amount))],
        });
        return tx;
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/shared/src/ptb.test.ts`
      Expected: PASS — `3 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/shared/src/ptb.ts packages/shared/src/ptb.test.ts
      git commit -m "feat(shared): register/pay/withdraw PTB builders"
      ```

---

### Task 8: Strict typecheck gate for `@tollgate/shared`

**Files:**
- Modify: `packages/shared/package.json` (confirm `typecheck` script present)

**Depends on:** Task 2, Task 3, Task 4, Task 5, Task 6, Task 7
**Effort:** low
**Provides:** a green `tsc --noEmit` over the whole package (vitest uses esbuild and does NOT type-check, so this is the strict-TS backstop the conventions require)
**Requires:** all `@tollgate/shared` source from Tasks 2–7

- [ ] **Step 1: Confirm the typecheck script exists**
      `packages/shared/package.json` already declares `"scripts": { "typecheck": "tsc --noEmit" }` (created in Task 1). No change needed if present; otherwise add it.
- [ ] **Step 2: Run the strict typecheck** *(THIS IS THE GATE)*
      Run: `npx tsc -p packages/shared/tsconfig.json --noEmit`
      Expected: PASS — command exits 0 with no error output (no type errors across `src/`).
- [ ] **Step 3: Commit** (only if Step 1 changed the file; otherwise skip — nothing to commit)
      ```bash
      git add packages/shared/package.json
      git commit -m "chore(shared): strict typecheck gate"
      ```
