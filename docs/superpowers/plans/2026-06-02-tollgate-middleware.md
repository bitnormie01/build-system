# Middleware Implementation Plan

**Goal:** Build `@tollgate/middleware` — the one-line Express `tollgate()` 402 middleware (challenge issuance, authoritative on-chain receipt verification, nonce-based replay protection) and the demo "paid services" server exposing 3 self-contained paid tools.
**Architecture:** `tollgate(opts)` returns an Express `RequestHandler`. No `X-Tollgate-Payment` header → issue a single-use nonce and respond `402` + a `PaymentChallenge`. Header present → read the tx by digest via `@tollgate/shared`, verify the `PaymentReceipt` (resource + amount), then consume the nonce (binds payment to the issued challenge, blocks replay) → `next()`. The paid server wires 3 gated routes, each returning server-generated data (no third-party API → fully controllable).
**Tech Stack:** TypeScript `^5.6` (ESM, strict), `express ^4.21`, `cors ^2.8.5`, `@mysten/sui ^2.17.0`, `@tollgate/shared`, `vitest ^2.1` + `supertest ^7`.
**Source spec:** docs/superpowers/specs/2026-06-02-tollgate-machine-payable-web-design.md

> Conventions: strict TS, no `as any` (use `as unknown as T`), no placeholders, exact paths, complete code, named exports. Never serve a gated resource without an accepted on-chain receipt. Sync the repo before work; commit before done.

---

### Task 1: Scaffold `@tollgate/middleware`

**Files:**
- Create: `packages/middleware/package.json`
- Create: `packages/middleware/tsconfig.json`
- Create: `packages/middleware/src/constants.ts`
- Test:   `packages/middleware/src/constants.test.ts`

**Depends on:** Task 1 of the shared plan (`shared:1`)
**Effort:** low
**Provides:**
- package `@tollgate/middleware` (subpath exports `./*` → `./src/*.ts`)
- `const TOLLGATE_HEADER = 'x-tollgate-payment'`

**Requires:** npm workspace + `@tollgate/shared` (shared:1)

- [ ] **Step 1: Create `packages/middleware/package.json`**
      ```json
      {
        "name": "@tollgate/middleware",
        "version": "0.1.0",
        "private": true,
        "type": "module",
        "exports": { "./*": "./src/*.ts" },
        "scripts": { "typecheck": "tsc --noEmit", "start": "tsx src/main.ts" },
        "dependencies": {
          "@mysten/sui": "^2.17.0",
          "@tollgate/shared": "*",
          "cors": "^2.8.5",
          "express": "^4.21.0"
        },
        "devDependencies": {
          "@types/cors": "^2.8.17",
          "@types/express": "^4.17.21",
          "@types/supertest": "^6.0.2",
          "supertest": "^7.0.0"
        }
      }
      ```
- [ ] **Step 2: Create `packages/middleware/tsconfig.json`**
      ```json
      {
        "extends": "../../tsconfig.base.json",
        "include": ["src"]
      }
      ```
- [ ] **Step 3: Create source + test**
      `packages/middleware/src/constants.ts`:
      ```ts
      /** Header carrying the on-chain payment tx digest on a retry. */
      export const TOLLGATE_HEADER = 'x-tollgate-payment';
      ```
      `packages/middleware/src/constants.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { TOLLGATE_HEADER } from './constants';

      describe('constants', () => {
        it('uses a lowercase header name', () => {
          expect(TOLLGATE_HEADER).toBe('x-tollgate-payment');
        });
      });
      ```
- [ ] **Step 4: Install workspace deps**
      Run: `npm install`
      Expected: exits 0 (express, cors, supertest, and `@tollgate/*` links resolved).
- [ ] **Step 5: Run the test** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/middleware/src/constants.test.ts`
      Expected: PASS — `1 passed`.
- [ ] **Step 6: Commit**
      ```bash
      git add packages/middleware/package.json packages/middleware/tsconfig.json packages/middleware/src/constants.ts packages/middleware/src/constants.test.ts package-lock.json
      git commit -m "chore(middleware): scaffold @tollgate/middleware"
      ```

---

### Task 2: `nonceStore.ts` — single-use challenge nonces

**Files:**
- Create: `packages/middleware/src/nonceStore.ts`
- Test:   `packages/middleware/src/nonceStore.test.ts`

**Depends on:** Task 1
**Effort:** medium
**Provides:**
- `interface IssuedNonce { nonce: string; expiresAt: number }`
- `type ConsumeResult = 'ok'|'unknown'|'expired'|'consumed'|'wrong-resource'`
- `interface NonceStore { issue(resourceId, ttlMs): IssuedNonce; validateAndConsume(nonce, resourceId): ConsumeResult }`
- `class InMemoryNonceStore implements NonceStore` (injectable `now` for tests)

**Requires:** `@tollgate/middleware` package (Task 1)

- [ ] **Step 1: Write the failing test**
      `packages/middleware/src/nonceStore.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { InMemoryNonceStore } from './nonceStore';

      describe('InMemoryNonceStore', () => {
        it('issues a nonce that validates once', () => {
          const s = new InMemoryNonceStore();
          const { nonce } = s.issue('0xr', 60_000);
          expect(s.validateAndConsume(nonce, '0xr')).toBe('ok');
          expect(s.validateAndConsume(nonce, '0xr')).toBe('consumed');
        });
        it('rejects unknown and wrong-resource nonces', () => {
          const s = new InMemoryNonceStore();
          const { nonce } = s.issue('0xr', 60_000);
          expect(s.validateAndConsume('deadbeef', '0xr')).toBe('unknown');
          expect(s.validateAndConsume(nonce, '0xother')).toBe('wrong-resource');
        });
        it('rejects expired nonces', () => {
          let t = 1_000;
          const s = new InMemoryNonceStore(() => t);
          const { nonce } = s.issue('0xr', 5_000);
          t = 7_000;
          expect(s.validateAndConsume(nonce, '0xr')).toBe('expired');
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/middleware/src/nonceStore.test.ts`
      Expected: FAIL — `InMemoryNonceStore` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/middleware/src/nonceStore.ts`:
      ```ts
      import { randomBytes } from 'node:crypto';

      export interface IssuedNonce {
        nonce: string;
        expiresAt: number;
      }

      export type ConsumeResult = 'ok' | 'unknown' | 'expired' | 'consumed' | 'wrong-resource';

      export interface NonceStore {
        issue(resourceId: string, ttlMs: number): IssuedNonce;
        validateAndConsume(nonce: string, resourceId: string): ConsumeResult;
      }

      interface NonceRecord {
        resourceId: string;
        expiresAt: number;
        consumed: boolean;
      }

      export class InMemoryNonceStore implements NonceStore {
        private readonly map = new Map<string, NonceRecord>();

        constructor(private readonly now: () => number = () => Date.now()) {}

        issue(resourceId: string, ttlMs: number): IssuedNonce {
          const nonce = randomBytes(16).toString('hex');
          const expiresAt = this.now() + ttlMs;
          this.map.set(nonce, { resourceId, expiresAt, consumed: false });
          return { nonce, expiresAt };
        }

        validateAndConsume(nonce: string, resourceId: string): ConsumeResult {
          const rec = this.map.get(nonce);
          if (!rec) return 'unknown';
          if (rec.resourceId !== resourceId) return 'wrong-resource';
          if (rec.consumed) return 'consumed';
          if (this.now() > rec.expiresAt) return 'expired';
          rec.consumed = true;
          return 'ok';
        }
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/middleware/src/nonceStore.test.ts`
      Expected: PASS — `3 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/middleware/src/nonceStore.ts packages/middleware/src/nonceStore.test.ts
      git commit -m "feat(middleware): single-use nonce store"
      ```

---

### Task 3: `tollgate.ts` — the 402 middleware

**Files:**
- Create: `packages/middleware/src/tollgate.ts`
- Test:   `packages/middleware/src/tollgate.test.ts`

**Depends on:** Task 2, Task 5 of shared plan (`shared:5`), Task 2 of shared plan (`shared:2`)
**Effort:** high
**Provides:**
- `interface TollgateOptions { suiClient: SuiClient; packageId: string; resource: ResourceConfig; nonceStore?: NonceStore; challengeTtlMs?: number }`
- `function tollgate(opts: TollgateOptions): RequestHandler`

**Requires:**
```ts
// from shared/types (shared:2):
export interface ResourceConfig { resourceId: string; coinType: string; price: string; recipient: string }
export interface PaymentChallenge { resourceId: string; packageId: string; coinType: string; price: string; recipient: string; nonce: string; expiresAt: number }
// from shared/receipts (shared:5):
export async function readReceiptFromDigest(client: SuiClient, digest: string, packageId: string): Promise<PaymentReceiptEvent | null>;
export function verifyReceipt(receipt: PaymentReceiptEvent, expected: { resourceId: string; price: string; nonce: string }): { ok: boolean; reason?: string };
export function hexToBytes(hex: string): Uint8Array;   // used by the test to craft the mocked event nonce
// from this package:
export const TOLLGATE_HEADER = 'x-tollgate-payment';                       // constants (Task 1)
export interface NonceStore { issue(resourceId, ttlMs): { nonce: string; expiresAt: number }; validateAndConsume(nonce, resourceId): 'ok'|'unknown'|'expired'|'consumed'|'wrong-resource' }   // nonceStore (Task 2)
```

- [ ] **Step 1: Write the failing test**
      `packages/middleware/src/tollgate.test.ts`:
      ```ts
      import { describe, it, expect, vi } from 'vitest';
      import express from 'express';
      import request from 'supertest';
      import type { SuiClient } from '@mysten/sui/client';
      import { hexToBytes } from '@tollgate/shared/receipts';
      import type { ResourceConfig } from '@tollgate/shared/types';
      import { InMemoryNonceStore } from './nonceStore';
      import { tollgate } from './tollgate';

      const PKG = '0xpkg';
      const resource: ResourceConfig = { resourceId: '0xr', coinType: `${PKG}::mock_usd::MOCK_USD`, price: '1000', recipient: '0xowner' };

      function appWith(suiClient: SuiClient, store: InMemoryNonceStore) {
        const app = express();
        app.get('/tool', tollgate({ suiClient, packageId: PKG, resource, nonceStore: store }), (_req, res) => { res.json({ data: 'secret' }); });
        return app;
      }

      function receiptTx(nonceHex: string, amount: string, resourceId = '0xr') {
        return { events: [{ type: `${PKG}::tollgate::PaymentReceipt`, parsedJson: { resource_id: resourceId, payer: '0xb', amount, nonce: Array.from(hexToBytes(nonceHex)), timestamp_ms: '1' } }] };
      }

      it('returns 402 + challenge when unpaid', async () => {
        const store = new InMemoryNonceStore();
        const sui = { getTransactionBlock: vi.fn() } as unknown as SuiClient;
        const res = await request(appWith(sui, store)).get('/tool');
        expect(res.status).toBe(402);
        expect(res.body.resourceId).toBe('0xr');
        expect(res.body.price).toBe('1000');
        expect(typeof res.body.nonce).toBe('string');
      });

      it('serves the resource on a valid receipt, then blocks replay', async () => {
        const store = new InMemoryNonceStore();
        const getTx = vi.fn();
        const sui = { getTransactionBlock: getTx } as unknown as SuiClient;
        const app = appWith(sui, store);

        const challenge = (await request(app).get('/tool')).body;
        getTx.mockResolvedValue(receiptTx(challenge.nonce, '1000'));

        const ok = await request(app).get('/tool').set('x-tollgate-payment', '0xdigest');
        expect(ok.status).toBe(200);
        expect(ok.body.data).toBe('secret');

        const replay = await request(app).get('/tool').set('x-tollgate-payment', '0xdigest');
        expect(replay.status).toBe(403);
      });

      it('rejects an underpaid receipt with 403', async () => {
        const store = new InMemoryNonceStore();
        const getTx = vi.fn();
        const sui = { getTransactionBlock: getTx } as unknown as SuiClient;
        const app = appWith(sui, store);
        const challenge = (await request(app).get('/tool')).body;
        getTx.mockResolvedValue(receiptTx(challenge.nonce, '500'));
        const res = await request(app).get('/tool').set('x-tollgate-payment', '0xdigest');
        expect(res.status).toBe(403);
        expect(res.body.error).toBe('underpaid');
      });

      it('rejects when the tx has no receipt event', async () => {
        const store = new InMemoryNonceStore();
        const sui = { getTransactionBlock: vi.fn().mockResolvedValue({ events: [] }) } as unknown as SuiClient;
        const res = await request(appWith(sui, store)).get('/tool').set('x-tollgate-payment', '0xdigest');
        expect(res.status).toBe(403);
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/middleware/src/tollgate.test.ts`
      Expected: FAIL — `tollgate` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/middleware/src/tollgate.ts`:
      ```ts
      import type { RequestHandler } from 'express';
      import type { SuiClient } from '@mysten/sui/client';
      import type { PaymentChallenge, ResourceConfig } from '@tollgate/shared/types';
      import { readReceiptFromDigest, verifyReceipt } from '@tollgate/shared/receipts';
      import { InMemoryNonceStore, type NonceStore } from './nonceStore';
      import { TOLLGATE_HEADER } from './constants';

      export interface TollgateOptions {
        suiClient: SuiClient;
        packageId: string;
        resource: ResourceConfig;
        nonceStore?: NonceStore;
        challengeTtlMs?: number;
      }

      export function tollgate(opts: TollgateOptions): RequestHandler {
        const store: NonceStore = opts.nonceStore ?? new InMemoryNonceStore();
        const ttl = opts.challengeTtlMs ?? 120_000;
        const { resource, packageId, suiClient } = opts;

        return (req, res, next) => {
          void (async () => {
            const digest = req.header(TOLLGATE_HEADER);
            if (!digest) {
              const { nonce, expiresAt } = store.issue(resource.resourceId, ttl);
              const challenge: PaymentChallenge = {
                resourceId: resource.resourceId,
                packageId,
                coinType: resource.coinType,
                price: resource.price,
                recipient: resource.recipient,
                nonce,
                expiresAt,
              };
              res.status(402).set('WWW-Authenticate', 'Tollgate').json(challenge);
              return;
            }

            let receipt;
            try {
              receipt = await readReceiptFromDigest(suiClient, digest, packageId);
            } catch {
              res.status(503).json({ error: 'rpc read failed' });
              return;
            }
            if (!receipt) {
              res.status(403).json({ error: 'no PaymentReceipt in transaction' });
              return;
            }

            const v = verifyReceipt(receipt, { resourceId: resource.resourceId, price: resource.price, nonce: receipt.nonce });
            if (!v.ok) {
              res.status(403).json({ error: v.reason });
              return;
            }

            const consume = store.validateAndConsume(receipt.nonce, resource.resourceId);
            if (consume !== 'ok') {
              res.status(403).json({ error: `nonce ${consume}` });
              return;
            }

            next();
          })().catch(next);
        };
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/middleware/src/tollgate.test.ts`
      Expected: PASS — `4 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/middleware/src/tollgate.ts packages/middleware/src/tollgate.test.ts
      git commit -m "feat(middleware): 402 challenge + on-chain receipt verification + replay guard"
      ```

---

### Task 4: `tools.ts` — 3 self-contained paid tool handlers

**Files:**
- Create: `packages/middleware/src/tools.ts`
- Test:   `packages/middleware/src/tools.test.ts`

**Depends on:** Task 1
**Effort:** low
**Provides:**
- `const cryptoPrice: RequestHandler`, `const fxRate: RequestHandler`, `const newsHeadlines: RequestHandler` (each returns server-generated JSON; no external API)

**Requires:** `express` `RequestHandler`/`Request`/`Response` (Task 1 installed it)

- [ ] **Step 1: Write the failing test**
      `packages/middleware/src/tools.test.ts`:
      ```ts
      import { describe, it, expect, vi } from 'vitest';
      import type { Request, Response } from 'express';
      import { cryptoPrice, fxRate, newsHeadlines } from './tools';

      function run(handler: (req: Request, res: Response, next: () => void) => void) {
        const json = vi.fn();
        handler({} as Request, { json } as unknown as Response, () => {});
        return json.mock.calls[0]?.[0] as Record<string, unknown>;
      }

      describe('paid tools', () => {
        it('crypto-price returns a numeric price', () => {
          const body = run(cryptoPrice);
          expect(body.tool).toBe('crypto-price');
          expect(typeof body.priceUsd).toBe('number');
        });
        it('fx-rate returns a numeric rate', () => {
          const body = run(fxRate);
          expect(body.tool).toBe('fx-rate');
          expect(typeof body.rate).toBe('number');
        });
        it('news-headlines returns a non-empty list', () => {
          const body = run(newsHeadlines);
          expect(body.tool).toBe('news-headlines');
          expect(Array.isArray(body.headlines)).toBe(true);
          expect((body.headlines as string[]).length).toBeGreaterThan(0);
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/middleware/src/tools.test.ts`
      Expected: FAIL — handlers undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/middleware/src/tools.ts`:
      ```ts
      import type { RequestHandler } from 'express';

      function round2(n: number): number {
        return Math.round(n * 100) / 100;
      }

      export const cryptoPrice: RequestHandler = (_req, res) => {
        res.json({ tool: 'crypto-price', symbol: 'SUI', priceUsd: round2(2 + Math.random()), asOf: new Date().toISOString() });
      };

      export const fxRate: RequestHandler = (_req, res) => {
        res.json({ tool: 'fx-rate', pair: 'USD/EUR', rate: round2(0.9 + Math.random() * 0.05), asOf: new Date().toISOString() });
      };

      export const newsHeadlines: RequestHandler = (_req, res) => {
        res.json({
          tool: 'news-headlines',
          headlines: [
            'Sui throughput sets a new testnet record',
            'Stablecoin micropayment volume climbs',
            'Autonomous agents begin paying their own way',
          ],
          asOf: new Date().toISOString(),
        });
      };
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/middleware/src/tools.test.ts`
      Expected: PASS — `3 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/middleware/src/tools.ts packages/middleware/src/tools.test.ts
      git commit -m "feat(middleware): self-contained paid tool handlers"
      ```

---

### Task 5: `paidServer.ts` + `main.ts` — the demo provider

**Files:**
- Create: `packages/middleware/src/paidServer.ts`
- Create: `packages/middleware/src/main.ts`
- Test:   `packages/middleware/src/paidServer.test.ts`

**Depends on:** Task 3, Task 4
**Effort:** medium
**Provides:**
- `interface PaidServerConfig { suiClient: SuiClient; packageId: string; resources: { cryptoPrice: ResourceConfig; fxRate: ResourceConfig; newsHeadlines: ResourceConfig } }`
- `function createPaidServer(cfg: PaidServerConfig): Express`
- `main.ts` entry that loads config + `deployment.json` and listens on `PORT`

**Requires:**
```ts
// from this package:
export function tollgate(opts: TollgateOptions): RequestHandler;                  // tollgate (Task 3)
export const cryptoPrice: RequestHandler; export const fxRate: RequestHandler; export const newsHeadlines: RequestHandler;   // tools (Task 4)
// from shared:
export interface ResourceConfig { resourceId: string; coinType: string; price: string; recipient: string }   // shared/types
export function loadConfig(env?: NodeJS.ProcessEnv): { network: string; rpcUrl: string; packageId: string; musdCoinType: string };   // shared/config
export function getSuiClient(opts: { rpcUrl: string }): SuiClient;                // shared/client
```

- [ ] **Step 1: Write the failing test**
      `packages/middleware/src/paidServer.test.ts`:
      ```ts
      import { describe, it, expect, vi } from 'vitest';
      import request from 'supertest';
      import type { SuiClient } from '@mysten/sui/client';
      import type { ResourceConfig } from '@tollgate/shared/types';
      import { createPaidServer } from './paidServer';

      const PKG = '0xpkg';
      const mk = (id: string): ResourceConfig => ({ resourceId: id, coinType: `${PKG}::mock_usd::MOCK_USD`, price: '1000', recipient: '0xowner' });

      function server() {
        const suiClient = { getTransactionBlock: vi.fn() } as unknown as SuiClient;
        return createPaidServer({ suiClient, packageId: PKG, resources: { cryptoPrice: mk('0x1'), fxRate: mk('0x2'), newsHeadlines: mk('0x3') } });
      }

      describe('createPaidServer', () => {
        it('serves /healthz unpaid', async () => {
          const res = await request(server()).get('/healthz');
          expect(res.status).toBe(200);
          expect(res.body.ok).toBe(true);
        });
        it('gates /tools/crypto-price with 402', async () => {
          const res = await request(server()).get('/tools/crypto-price');
          expect(res.status).toBe(402);
          expect(res.body.resourceId).toBe('0x1');
        });
        it('gates all three tools', async () => {
          for (const [route, id] of [['/tools/crypto-price', '0x1'], ['/tools/fx-rate', '0x2'], ['/tools/news-headlines', '0x3']] as const) {
            const res = await request(server()).get(route);
            expect(res.status).toBe(402);
            expect(res.body.resourceId).toBe(id);
          }
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/middleware/src/paidServer.test.ts`
      Expected: FAIL — `createPaidServer` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/middleware/src/paidServer.ts`:
      ```ts
      import express, { type Express } from 'express';
      import cors from 'cors';
      import type { SuiClient } from '@mysten/sui/client';
      import type { ResourceConfig } from '@tollgate/shared/types';
      import { tollgate } from './tollgate';
      import { cryptoPrice, fxRate, newsHeadlines } from './tools';

      export interface PaidServerConfig {
        suiClient: SuiClient;
        packageId: string;
        resources: {
          cryptoPrice: ResourceConfig;
          fxRate: ResourceConfig;
          newsHeadlines: ResourceConfig;
        };
      }

      export function createPaidServer(cfg: PaidServerConfig): Express {
        const app = express();
        app.use(cors());
        app.get('/healthz', (_req, res) => { res.json({ ok: true }); });

        const gate = (resource: ResourceConfig) => tollgate({ suiClient: cfg.suiClient, packageId: cfg.packageId, resource });

        app.get('/tools/crypto-price', gate(cfg.resources.cryptoPrice), cryptoPrice);
        app.get('/tools/fx-rate', gate(cfg.resources.fxRate), fxRate);
        app.get('/tools/news-headlines', gate(cfg.resources.newsHeadlines), newsHeadlines);
        return app;
      }
      ```
      `packages/middleware/src/main.ts`:
      ```ts
      import { readFileSync } from 'node:fs';
      import { loadConfig } from '@tollgate/shared/config';
      import { getSuiClient } from '@tollgate/shared/client';
      import type { ResourceConfig } from '@tollgate/shared/types';
      import { createPaidServer } from './paidServer';

      interface Deployment {
        resources: { cryptoPrice: ResourceConfig; fxRate: ResourceConfig; newsHeadlines: ResourceConfig };
      }

      const cfg = loadConfig();
      const deployment = JSON.parse(readFileSync('deployment.json', 'utf8')) as Deployment;
      const app = createPaidServer({
        suiClient: getSuiClient({ rpcUrl: cfg.rpcUrl }),
        packageId: cfg.packageId,
        resources: deployment.resources,
      });
      const port = Number(process.env.PORT ?? 8402);
      app.listen(port, () => { console.log(`Tollgate paid server listening on :${port}`); });
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/middleware/src/paidServer.test.ts`
      Expected: PASS — `3 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/middleware/src/paidServer.ts packages/middleware/src/main.ts packages/middleware/src/paidServer.test.ts
      git commit -m "feat(middleware): paid demo server with 3 gated tools"
      ```

---

### Task 6: Strict typecheck gate for `@tollgate/middleware`

**Files:**
- Modify: `packages/middleware/package.json` (confirm `typecheck` script present)

**Depends on:** Task 2, Task 3, Task 4, Task 5
**Effort:** low
**Provides:** a green `tsc --noEmit` over the whole package (the strict-TS backstop vitest's esbuild can't provide)
**Requires:** all `@tollgate/middleware` source from Tasks 1–5

- [ ] **Step 1: Confirm the typecheck script exists**
      `packages/middleware/package.json` already declares `"scripts": { "typecheck": "tsc --noEmit", ... }` (created in Task 1). No change if present.
- [ ] **Step 2: Run the strict typecheck** *(THIS IS THE GATE)*
      Run: `npx tsc -p packages/middleware/tsconfig.json --noEmit`
      Expected: PASS — command exits 0 with no error output.
- [ ] **Step 3: Commit** (only if Step 1 changed the file; otherwise skip)
      ```bash
      git add packages/middleware/package.json
      git commit -m "chore(middleware): strict typecheck gate"
      ```
