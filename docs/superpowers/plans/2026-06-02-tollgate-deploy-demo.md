# Deploy & Demo Implementation Plan

**Goal:** Build `@tollgate/deploy-demo` — the scripts that publish the Move package, register the 3 metered resources, fund the agent wallet, and withdraw provider earnings — plus the root README/Judging-Quickstart. The **pure builders/parsers are TDD-gated**; the **actual broadcasts and CLI calls are human-gated runbook steps** (the pool authors and unit-tests the scripts; a human runs them).
**Architecture:** Each script splits into a pure, testable core (a PTB builder or an output parser) and a thin human-run `main()` that signs/broadcasts with a keypair from `DEPLOYER_PK`. `deployment.json` (package id, treasury cap, coin type, resources) is the artifact passed to the middleware/dashboard. The money shot itself is the already-built `npm run demo -w @tollgate/agent`.
**Tech Stack:** TypeScript `^5.6` (ESM, strict), `@mysten/sui ^2.17.0`, `@tollgate/shared`, `tsx ^4.19`, `vitest ^2.1`. Sui CLI for the human publish step.
**Source spec:** docs/superpowers/specs/2026-06-02-tollgate-machine-payable-web-design.md

> Conventions: strict TS, no `as any` (use `as unknown as T`), no placeholders, exact paths, complete code, named exports. **Never hardcode a key/secret** — `DEPLOYER_PK` / `AGENT_PK` come from env; `.env` is git-ignored. Executors never broadcast transactions or move funds: the `main()` functions are complete but are run by a human per the README runbook. Intra-package imports are relative; cross-package shared imports use `@tollgate/shared/*`. Sync the repo before work; commit before done.

---

### Task 1: Scaffold `@tollgate/deploy-demo` + `deployment.ts`

**Files:**
- Create: `packages/deploy-demo/package.json`
- Create: `packages/deploy-demo/tsconfig.json`
- Create: `packages/deploy-demo/src/deployment.ts`
- Test:   `packages/deploy-demo/src/deployment.test.ts`

**Depends on:** Task 1 of shared plan (`shared:1`), Task 2 of shared plan (`shared:2`)
**Effort:** medium
**Provides:**
- package `@tollgate/deploy-demo`
- `const DEPLOYMENT_FILE = 'deployment.json'`
- `interface ResourceTriple<T> { cryptoPrice: T; fxRate: T; newsHeadlines: T }`
- `interface DeploymentInfo { packageId; treasuryCapId; musdCoinType; resources?: ResourceTriple<ResourceConfig>; ownerCaps?: ResourceTriple<string> }`
- `function writeDeployment(info, file?): void`, `function readDeployment(file?): DeploymentInfo`

**Requires:**
```ts
// from shared/types (shared:2):
export interface ResourceConfig { resourceId: string; coinType: string; price: string; recipient: string }
```

- [ ] **Step 1: Create `packages/deploy-demo/package.json`**
      ```json
      {
        "name": "@tollgate/deploy-demo",
        "version": "0.1.0",
        "private": true,
        "type": "module",
        "exports": { "./*": "./src/*.ts" },
        "scripts": { "typecheck": "tsc --noEmit" },
        "dependencies": {
          "@mysten/sui": "^2.17.0",
          "@tollgate/shared": "*"
        }
      }
      ```
- [ ] **Step 2: Create `packages/deploy-demo/tsconfig.json`**
      ```json
      {
        "extends": "../../tsconfig.base.json",
        "include": ["src"]
      }
      ```
- [ ] **Step 3: Write the failing test**
      `packages/deploy-demo/src/deployment.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { tmpdir } from 'node:os';
      import { join } from 'node:path';
      import { rmSync } from 'node:fs';
      import { writeDeployment, readDeployment, type DeploymentInfo } from './deployment';

      const sample: DeploymentInfo = {
        packageId: '0xpkg',
        treasuryCapId: '0xcap',
        musdCoinType: '0xpkg::mock_usd::MOCK_USD',
        resources: {
          cryptoPrice: { resourceId: '0x1', coinType: '0xpkg::mock_usd::MOCK_USD', price: '1000', recipient: '0xo' },
          fxRate: { resourceId: '0x2', coinType: '0xpkg::mock_usd::MOCK_USD', price: '1500', recipient: '0xo' },
          newsHeadlines: { resourceId: '0x3', coinType: '0xpkg::mock_usd::MOCK_USD', price: '2000', recipient: '0xo' },
        },
        ownerCaps: { cryptoPrice: '0xcapA', fxRate: '0xcapB', newsHeadlines: '0xcapC' },
      };

      describe('deployment I/O', () => {
        it('round-trips through a file', () => {
          const file = join(tmpdir(), `tollgate-deploy-${Date.now()}.json`);
          try {
            writeDeployment(sample, file);
            expect(readDeployment(file)).toEqual(sample);
          } finally {
            rmSync(file, { force: true });
          }
        });
      });
      ```
- [ ] **Step 4: Run to confirm it fails**
      Run: `npx vitest run packages/deploy-demo/src/deployment.test.ts`
      Expected: FAIL — `writeDeployment` undefined.
- [ ] **Step 5: Minimal implementation**
      `packages/deploy-demo/src/deployment.ts`:
      ```ts
      import { readFileSync, writeFileSync } from 'node:fs';
      import type { ResourceConfig } from '@tollgate/shared/types';

      export const DEPLOYMENT_FILE = 'deployment.json';

      export interface ResourceTriple<T> {
        cryptoPrice: T;
        fxRate: T;
        newsHeadlines: T;
      }

      export interface DeploymentInfo {
        packageId: string;
        treasuryCapId: string;
        musdCoinType: string;
        // Filled by `register` after publish; optional so `publish` can write the base file first.
        resources?: ResourceTriple<ResourceConfig>;
        ownerCaps?: ResourceTriple<string>;
      }

      export function writeDeployment(info: DeploymentInfo, file: string = DEPLOYMENT_FILE): void {
        writeFileSync(file, `${JSON.stringify(info, null, 2)}\n`);
      }

      export function readDeployment(file: string = DEPLOYMENT_FILE): DeploymentInfo {
        return JSON.parse(readFileSync(file, 'utf8')) as DeploymentInfo;
      }
      ```
- [ ] **Step 6: Install workspace deps**
      Run: `npm install`
      Expected: exits 0 (`@tollgate/deploy-demo` linked).
- [ ] **Step 7: Run the test** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/deploy-demo/src/deployment.test.ts`
      Expected: PASS — `1 passed`.
- [ ] **Step 8: Commit**
      ```bash
      git add packages/deploy-demo/package.json packages/deploy-demo/tsconfig.json packages/deploy-demo/src/deployment.ts packages/deploy-demo/src/deployment.test.ts package-lock.json
      git commit -m "chore(deploy-demo): scaffold package and deployment I/O"
      ```

---

### Task 2: `publish.ts` — parse `sui client publish` output

**Files:**
- Create: `packages/deploy-demo/src/publish.ts`
- Test:   `packages/deploy-demo/src/publish.test.ts`

**Depends on:** Task 1
**Effort:** medium
**Human-gate:** the `main()` runs the Sui CLI publish (broadcast) — human-run per README.
**Provides:**
- `interface PublishedPackage { packageId: string; treasuryCapId: string; musdCoinType: string }`
- `function parsePublishOutput(raw: string): PublishedPackage`
- `main()` — reads `publish.json` (produced by the human's `sui client publish --json`), prints/persists package info

**Requires:** `DeploymentInfo` shape (Task 1). `sui client publish --json` emits `{ objectChanges: [{ type:'published', packageId }, { type:'created', objectType:'0x2::coin::TreasuryCap<...::mock_usd::MOCK_USD>', objectId }, ...] }`.

- [ ] **Step 1: Write the failing test**
      `packages/deploy-demo/src/publish.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { parsePublishOutput } from './publish';

      const raw = JSON.stringify({
        objectChanges: [
          { type: 'published', packageId: '0xPKG' },
          { type: 'created', objectType: '0x2::coin::TreasuryCap<0xPKG::mock_usd::MOCK_USD>', objectId: '0xCAP' },
          { type: 'created', objectType: '0x2::coin::CoinMetadata<0xPKG::mock_usd::MOCK_USD>', objectId: '0xMETA' },
        ],
      });

      describe('parsePublishOutput', () => {
        it('extracts package id, treasury cap, and coin type', () => {
          expect(parsePublishOutput(raw)).toEqual({
            packageId: '0xPKG',
            treasuryCapId: '0xCAP',
            musdCoinType: '0xPKG::mock_usd::MOCK_USD',
          });
        });
        it('throws when no package was published', () => {
          expect(() => parsePublishOutput(JSON.stringify({ objectChanges: [] }))).toThrow(/published/);
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/deploy-demo/src/publish.test.ts`
      Expected: FAIL — `parsePublishOutput` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/deploy-demo/src/publish.ts`:
      ```ts
      import { pathToFileURL } from 'node:url';
      import { readFileSync } from 'node:fs';
      import { writeDeployment } from './deployment';

      export interface PublishedPackage {
        packageId: string;
        treasuryCapId: string;
        musdCoinType: string;
      }

      interface ObjectChange {
        type: string;
        packageId?: string;
        objectId?: string;
        objectType?: string;
      }

      export function parsePublishOutput(raw: string): PublishedPackage {
        const parsed = JSON.parse(raw) as { objectChanges?: ObjectChange[] };
        const changes = parsed.objectChanges ?? [];
        const published = changes.find((c) => c.type === 'published');
        if (!published?.packageId) throw new Error('no published package found in publish output');
        const packageId = published.packageId;
        const cap = changes.find(
          (c) => c.type === 'created' && (c.objectType ?? '').includes('TreasuryCap') && (c.objectType ?? '').includes('MOCK_USD'),
        );
        if (!cap?.objectId) throw new Error('no TreasuryCap<MOCK_USD> created in publish output');
        return { packageId, treasuryCapId: cap.objectId, musdCoinType: `${packageId}::mock_usd::MOCK_USD` };
      }

      export function main(): void {
        const raw = readFileSync('publish.json', 'utf8');
        const info = parsePublishOutput(raw);
        writeDeployment(info); // base file; `register` fills resources + ownerCaps
        console.log('Wrote deployment.json:');
        console.log(JSON.stringify(info, null, 2));
        console.log('\nNext: set TOLLGATE_PACKAGE_ID + MUSD_COIN_TYPE in .env, then run register.');
      }

      if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
        main();
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/deploy-demo/src/publish.test.ts`
      Expected: PASS — `2 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/deploy-demo/src/publish.ts packages/deploy-demo/src/publish.test.ts
      git commit -m "feat(deploy-demo): parse sui client publish output"
      ```

---

### Task 3: `signer.ts` + `register.ts` — register the 3 resources

**Files:**
- Create: `packages/deploy-demo/src/signer.ts`
- Create: `packages/deploy-demo/src/register.ts`
- Test:   `packages/deploy-demo/src/register.test.ts`

**Depends on:** Task 1, Task 7 of shared plan (`shared:7`)
**Effort:** high
**Human-gate:** `register` `main()` broadcasts 3 register txs — human-run per README.
**Provides:**
- `function keypairFromEnv(pk: string): Ed25519Keypair`
- `async function submitAndWait(client: SuiClient, signer: Ed25519Keypair, tx: Transaction): Promise<SuiTransactionBlockResponse>`
- `interface RegisteredResource { resourceId: string; ownerCapId: string }`
- `function parseRegisterOutput(raw: string): RegisteredResource`
- `function registerTx(packageId: string, musdCoinType: string, price: string): Transaction`
- `main()` — registers crypto-price/fx-rate/news-headlines and writes `deployment.json`

**Requires:**
```ts
// from shared/ptb (shared:7):
export function buildRegisterTx(p: { packageId: string; coinType: string; price: string }): Transaction;
// MeteredResource objectType contains "::tollgate::MeteredResource<"; OwnerCap objectType contains "::tollgate::OwnerCap"
// @mysten/sui: Ed25519Keypair.fromSecretKey(Uint8Array); decodeSuiPrivateKey(suiprivkey)->{secretKey}; client.signAndExecuteTransaction({signer,transaction,options:{showObjectChanges:true}})->{digest, objectChanges}; client.waitForTransaction({digest})
```

- [ ] **Step 1: Write the failing test**
      `packages/deploy-demo/src/register.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
      import { Transaction } from '@mysten/sui/transactions';
      import { keypairFromEnv } from './signer';
      import { registerTx, parseRegisterOutput } from './register';

      describe('signer', () => {
        it('reconstructs a keypair from a suiprivkey string', () => {
          const kp = Ed25519Keypair.generate();
          const pk = kp.getSecretKey(); // ephemeral, generated in-test
          expect(keypairFromEnv(pk).toSuiAddress()).toBe(kp.toSuiAddress());
        });
      });

      describe('register', () => {
        it('builds a register_resource tx', () => {
          const tx = registerTx('0xpkg', '0xpkg::mock_usd::MOCK_USD', '1000');
          expect(tx).toBeInstanceOf(Transaction);
          expect(JSON.stringify(tx.getData())).toContain('register_resource');
        });
        it('parses the resource id and owner cap id from objectChanges', () => {
          const raw = JSON.stringify({
            objectChanges: [
              { type: 'created', objectType: '0xpkg::tollgate::MeteredResource<0xpkg::mock_usd::MOCK_USD>', objectId: '0xRES' },
              { type: 'created', objectType: '0xpkg::tollgate::OwnerCap', objectId: '0xCAP' },
            ],
          });
          expect(parseRegisterOutput(raw)).toEqual({ resourceId: '0xRES', ownerCapId: '0xCAP' });
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/deploy-demo/src/register.test.ts`
      Expected: FAIL — `keypairFromEnv` / `registerTx` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/deploy-demo/src/signer.ts`:
      ```ts
      import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
      import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
      import type { SuiClient, SuiTransactionBlockResponse } from '@mysten/sui/client';
      import type { Transaction } from '@mysten/sui/transactions';

      export function keypairFromEnv(pk: string): Ed25519Keypair {
        const { secretKey } = decodeSuiPrivateKey(pk);
        return Ed25519Keypair.fromSecretKey(secretKey);
      }

      export async function submitAndWait(
        client: SuiClient,
        signer: Ed25519Keypair,
        tx: Transaction,
      ): Promise<SuiTransactionBlockResponse> {
        const res = await client.signAndExecuteTransaction({
          signer,
          transaction: tx,
          options: { showObjectChanges: true, showEffects: true },
        });
        await client.waitForTransaction({ digest: res.digest });
        return res;
      }
      ```
      `packages/deploy-demo/src/register.ts`:
      ```ts
      import { pathToFileURL } from 'node:url';
      import type { Transaction } from '@mysten/sui/transactions';
      import { buildRegisterTx } from '@tollgate/shared/ptb';
      import type { ResourceConfig } from '@tollgate/shared/types';
      import { loadConfig } from '@tollgate/shared/config';
      import { getSuiClient } from '@tollgate/shared/client';
      import { keypairFromEnv, submitAndWait } from './signer';
      import { readDeployment, writeDeployment, type ResourceTriple } from './deployment';

      export interface RegisteredResource {
        resourceId: string;
        ownerCapId: string;
      }

      interface ObjectChange {
        type: string;
        objectType?: string;
        objectId?: string;
      }

      export function registerTx(packageId: string, musdCoinType: string, price: string): Transaction {
        return buildRegisterTx({ packageId, coinType: musdCoinType, price });
      }

      export function parseRegisterOutput(raw: string): RegisteredResource {
        const changes = (JSON.parse(raw) as { objectChanges?: ObjectChange[] }).objectChanges ?? [];
        const res = changes.find((c) => (c.objectType ?? '').includes('::tollgate::MeteredResource<'));
        const cap = changes.find((c) => (c.objectType ?? '').includes('::tollgate::OwnerCap'));
        if (!res?.objectId) throw new Error('no MeteredResource created');
        if (!cap?.objectId) throw new Error('no OwnerCap created');
        return { resourceId: res.objectId, ownerCapId: cap.objectId };
      }

      export async function main(): Promise<void> {
        const cfg = loadConfig();
        const pk = process.env.DEPLOYER_PK;
        if (!pk) throw new Error('Missing DEPLOYER_PK');
        const signer = keypairFromEnv(pk);
        const client = getSuiClient({ rpcUrl: cfg.rpcUrl });
        const owner = signer.toSuiAddress();

        const prices = { cryptoPrice: '1000', fxRate: '1500', newsHeadlines: '2000' } as const;
        const resources = {} as ResourceTriple<ResourceConfig>;
        const ownerCaps = {} as ResourceTriple<string>;
        for (const key of Object.keys(prices) as (keyof typeof prices)[]) {
          const price = prices[key];
          const res = await submitAndWait(client, signer, registerTx(cfg.packageId, cfg.musdCoinType, price));
          const { resourceId, ownerCapId } = parseRegisterOutput(JSON.stringify(res));
          resources[key] = { resourceId, coinType: cfg.musdCoinType, price, recipient: owner };
          ownerCaps[key] = ownerCapId;
          console.log(`registered ${key}: resource ${resourceId}, cap ${ownerCapId} @ ${price}`);
        }

        const existing = readDeployment();
        writeDeployment({ ...existing, resources, ownerCaps });
        console.log('wrote deployment.json resources + ownerCaps');
      }

      if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
        main().catch((e: unknown) => {
          console.error(e);
          process.exitCode = 1;
        });
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/deploy-demo/src/register.test.ts`
      Expected: PASS — `3 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/deploy-demo/src/signer.ts packages/deploy-demo/src/register.ts packages/deploy-demo/src/register.test.ts
      git commit -m "feat(deploy-demo): keypair signer + resource registration"
      ```

---

### Task 4: `fund.ts` — mint mUSD to the agent wallet

**Files:**
- Create: `packages/deploy-demo/src/fund.ts`
- Test:   `packages/deploy-demo/src/fund.test.ts`

**Depends on:** Task 3
**Effort:** medium
**Human-gate:** `main()` mints/transfers (broadcast) — human-run per README.
**Provides:**
- `function buildMintTx(p: { packageId: string; treasuryCapId: string; amount: string; recipient: string }): Transaction`
- `main()` — mints mUSD + sends SUI gas to the agent address

**Requires:**
```ts
// Move target: `${packageId}::mock_usd::mint(treasury: &mut TreasuryCap<MOCK_USD>, amount: u64, recipient: address)`
// from this package: keypairFromEnv, submitAndWait (Task 3); readDeployment (Task 1)
// @mysten/sui Transaction: tx.moveCall, tx.object, tx.pure.u64, tx.pure.address, tx.splitCoins(tx.gas, [..]), tx.transferObjects
```

- [ ] **Step 1: Write the failing test**
      `packages/deploy-demo/src/fund.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { Transaction } from '@mysten/sui/transactions';
      import { buildMintTx } from './fund';

      describe('buildMintTx', () => {
        it('builds a mock_usd::mint call', () => {
          const tx = buildMintTx({ packageId: '0xpkg', treasuryCapId: '0xcap', amount: '1000000', recipient: '0xagent' });
          expect(tx).toBeInstanceOf(Transaction);
          expect(JSON.stringify(tx.getData())).toContain('mint');
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/deploy-demo/src/fund.test.ts`
      Expected: FAIL — `buildMintTx` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/deploy-demo/src/fund.ts`:
      ```ts
      import { pathToFileURL } from 'node:url';
      import { Transaction } from '@mysten/sui/transactions';
      import { loadConfig } from '@tollgate/shared/config';
      import { getSuiClient } from '@tollgate/shared/client';
      import { keypairFromEnv, submitAndWait } from './signer';
      import { readDeployment } from './deployment';

      export function buildMintTx(p: { packageId: string; treasuryCapId: string; amount: string; recipient: string }): Transaction {
        const tx = new Transaction();
        tx.moveCall({
          target: `${p.packageId}::mock_usd::mint`,
          arguments: [tx.object(p.treasuryCapId), tx.pure.u64(BigInt(p.amount)), tx.pure.address(p.recipient)],
        });
        return tx;
      }

      export async function main(): Promise<void> {
        const cfg = loadConfig();
        const pk = process.env.DEPLOYER_PK;
        if (!pk) throw new Error('Missing DEPLOYER_PK');
        const agent = process.env.AGENT_ADDRESS;
        if (!agent) throw new Error('Missing AGENT_ADDRESS');
        const musdAmount = process.env.FUND_MUSD ?? '1000000'; // 1.0 mUSD @ 6 decimals
        const suiAmount = process.env.FUND_SUI_MIST ?? '100000000'; // 0.1 SUI for gas

        const signer = keypairFromEnv(pk);
        const client = getSuiClient({ rpcUrl: cfg.rpcUrl });
        const dep = readDeployment();

        await submitAndWait(client, signer, buildMintTx({ packageId: cfg.packageId, treasuryCapId: dep.treasuryCapId, amount: musdAmount, recipient: agent }));
        console.log(`minted ${musdAmount} mUSD to ${agent}`);

        const gasTx = new Transaction();
        const [gas] = gasTx.splitCoins(gasTx.gas, [gasTx.pure.u64(BigInt(suiAmount))]);
        gasTx.transferObjects([gas], gasTx.pure.address(agent));
        await submitAndWait(client, signer, gasTx);
        console.log(`sent ${suiAmount} MIST SUI gas to ${agent}`);
      }

      if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
        main().catch((e: unknown) => {
          console.error(e);
          process.exitCode = 1;
        });
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/deploy-demo/src/fund.test.ts`
      Expected: PASS — `1 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/deploy-demo/src/fund.ts packages/deploy-demo/src/fund.test.ts
      git commit -m "feat(deploy-demo): fund agent wallet with mUSD and gas"
      ```

---

### Task 5: `withdraw.ts` — provider withdraw closer

**Files:**
- Create: `packages/deploy-demo/src/withdraw.ts`
- Test:   `packages/deploy-demo/src/withdraw.test.ts`

**Depends on:** Task 3, Task 7 of shared plan (`shared:7`)
**Effort:** medium
**Human-gate:** `main()` broadcasts a withdraw — human-run per README.
**Provides:**
- `function withdrawTx(p: { packageId: string; coinType: string; resourceObjectId: string; ownerCapId: string; amount: string }): Transaction`
- `main()` — withdraws accrued earnings from one resource to the provider

**Requires:**
```ts
// from shared/ptb (shared:7):
export function buildWithdrawTx(p: { packageId: string; coinType: string; resourceObjectId: string; ownerCapId: string; amount: string }): Transaction;
// from this package: keypairFromEnv, submitAndWait (Task 3); readDeployment (Task 1)
```

- [ ] **Step 1: Write the failing test**
      `packages/deploy-demo/src/withdraw.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { Transaction } from '@mysten/sui/transactions';
      import { withdrawTx } from './withdraw';

      describe('withdrawTx', () => {
        it('builds a withdraw call', () => {
          const tx = withdrawTx({ packageId: '0xpkg', coinType: '0xpkg::mock_usd::MOCK_USD', resourceObjectId: '0xr', ownerCapId: '0xcap', amount: '500' });
          expect(tx).toBeInstanceOf(Transaction);
          expect(JSON.stringify(tx.getData())).toContain('withdraw');
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/deploy-demo/src/withdraw.test.ts`
      Expected: FAIL — `withdrawTx` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/deploy-demo/src/withdraw.ts`:
      ```ts
      import { pathToFileURL } from 'node:url';
      import type { Transaction } from '@mysten/sui/transactions';
      import { buildWithdrawTx } from '@tollgate/shared/ptb';
      import { loadConfig } from '@tollgate/shared/config';
      import { getSuiClient } from '@tollgate/shared/client';
      import { keypairFromEnv, submitAndWait } from './signer';
      import { readDeployment } from './deployment';

      export function withdrawTx(p: {
        packageId: string; coinType: string; resourceObjectId: string; ownerCapId: string; amount: string;
      }): Transaction {
        return buildWithdrawTx(p);
      }

      export async function main(): Promise<void> {
        const cfg = loadConfig();
        const pk = process.env.DEPLOYER_PK;
        if (!pk) throw new Error('Missing DEPLOYER_PK');
        const amount = process.env.WITHDRAW_AMOUNT;
        if (!amount) throw new Error('Missing WITHDRAW_AMOUNT (base units)');

        const signer = keypairFromEnv(pk);
        const client = getSuiClient({ rpcUrl: cfg.rpcUrl });
        const dep = readDeployment();
        // Withdraw from the first resource for the demo closer; cap id was recorded by `register`.
        const r = dep.resources?.cryptoPrice;
        const ownerCapId = dep.ownerCaps?.cryptoPrice;
        if (!r || !ownerCapId) throw new Error('deployment.json missing resources/ownerCaps — run register first');

        const res = await submitAndWait(
          client,
          signer,
          withdrawTx({ packageId: cfg.packageId, coinType: r.coinType, resourceObjectId: r.resourceId, ownerCapId, amount }),
        );
        console.log(`withdrew ${amount} from ${r.resourceId} → digest ${res.digest}`);
      }

      if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
        main().catch((e: unknown) => {
          console.error(e);
          process.exitCode = 1;
        });
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/deploy-demo/src/withdraw.test.ts`
      Expected: PASS — `1 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/deploy-demo/src/withdraw.ts packages/deploy-demo/src/withdraw.test.ts
      git commit -m "feat(deploy-demo): provider withdraw script"
      ```

---

### Task 6: Root `README.md` — setup + Judging Quickstart + runbook

**Files:**
- Create: `README.md`

**Depends on:** Task 3 of move plan (`move:3`), Task 5 of middleware plan (`middleware:5`), Task 6 of agent plan (`agent:6`), Task 4 of dashboard plan (`dashboard:4`), Task 2, Task 3, Task 4, Task 5
**Effort:** medium
**Provides:** the public README judges read — overview, architecture, **Package ID** location, **Judging Quickstart**, **Why Sui**, human-gated runbook, deadline note
**Requires:** the full system layout + the runbook command sequence (publish → register → fund → serve → demo → withdraw)

- [ ] **Step 1: Create `README.md`** (complete; the human fills the real Package ID into `.env`/`deployment.json` after the publish step)
      ```markdown
      # Tollgate — the machine-payable web on Sui

      HTTP 402, reborn for AI agents. Any API wraps an endpoint in Tollgate middleware; an autonomous
      agent that hits it gets `402` + a Sui payment intent, auto-pays a stablecoin micropayment on-chain
      from its own wallet, and retries with the on-chain receipt as proof. No accounts, no API keys, no
      Stripe — the on-chain `PaymentReceipt` **is** the access credential.

      - **Track:** The Agentic Web (primary) · DeFi & Payments (secondary)
      - **Chain:** Sui testnet · **Money:** mintable `mUSD` (module is generic over `Coin<T>`; real USDC = one type-arg swap)
      - **Package ID:** see `deployment.json` (`packageId`) after the publish step below.

      ## Architecture

      ```
      packages/shared       @tollgate/shared      types, Sui client, PTB builders, receipt read/verify
      packages/middleware   @tollgate/middleware  tollgate() 402 middleware + paid demo server (3 tools)
      packages/agent        @tollgate/agent       payAndRetry SDK + DGrid LLM tool-use loop (the money shot)
      packages/dashboard    @tollgate/dashboard   React real-time 402→payment→receipt→withdraw view
      packages/deploy-demo  @tollgate/deploy-demo publish / register / fund / withdraw scripts
      move/tollgate         Move package          MeteredResource<T>, pay<T>, withdraw, PaymentReceipt, mock_usd
      ```

      Flow: `agent → GET /tool` → `402 + {price, nonce}` → `tollgate::pay<mUSD>(coin, nonce)` on Sui →
      retry with `X-Tollgate-Payment: <digest>` → middleware reads the tx, verifies the `PaymentReceipt`,
      consumes the nonce (replay guard) → serves the data. Provider `withdraw`s accrued earnings.

      ## Prerequisites

      - Node ≥ 20, npm
      - Sui CLI (testnet) with a funded address (`sui client faucet`)
      - A DGrid API key (https://dgrid.ai) for the agent LLM

      ## Setup

      ```bash
      npm install
      cp .env.example .env   # fill in values after the deploy steps below
      ```

      ## Why Sui

      Sub-cent, accountless, ~sub-second-finality, global stablecoin micropayments with an on-chain access
      receipt — unachievable on Stripe/Web2 rails. Settlement, the access credential, and provider
      withdraw all live on Sui; the module is generic over `Coin<T>`.

      ## Judging Quickstart (human-gated runbook)

      > These steps broadcast transactions / move test funds, so a human runs them.

      1. **Publish the Move package** (captures the Package ID, writes `deployment.json`):
         ```bash
         sui client publish --json move/tollgate > publish.json
         npx tsx packages/deploy-demo/src/publish.ts          # writes deployment.json (packageId, treasuryCap, coin type)
         ```
         Copy `packageId` → `TOLLGATE_PACKAGE_ID` and `musdCoinType` → `MUSD_COIN_TYPE` in `.env`.
      2. **Register the 3 metered resources** (writes `deployment.json` resources):
         ```bash
         DEPLOYER_PK=<suiprivkey> npx tsx packages/deploy-demo/src/register.ts
         ```
      3. **Fund the agent wallet** (mUSD + SUI gas):
         ```bash
         DEPLOYER_PK=<suiprivkey> AGENT_ADDRESS=<agent 0x…> npx tsx packages/deploy-demo/src/fund.ts
         ```
      4. **Start the paid server and the dashboard:**
         ```bash
         npm run start -w @tollgate/middleware       # :8402
         npm run dev   -w @tollgate/dashboard        # Vite dev server
         ```
      5. **Run the money shot** (the agent pays its own way across 3 paid tools):
         ```bash
         AGENT_PK=<suiprivkey> DGRID_API_KEY=<key> npm run demo -w @tollgate/agent
         ```
         Watch 3 real on-chain `mUSD` micropayments fire; each logs a Sui Explorer link, and the dashboard
         timeline updates live.
      6. **Withdraw provider earnings** (the closer):
         ```bash
         DEPLOYER_PK=<suiprivkey> WITHDRAW_AMOUNT=<base units> \
           npx tsx packages/deploy-demo/src/withdraw.ts
         ```

      ## What was built during the hackathon

      Everything in this repo: the `tollgate` Move module + `mock_usd` coin, the 402 middleware, the
      `payAndRetry` agent SDK, the DGrid-backed LLM loop, the React dashboard, and the deploy scripts.

      ## Security

      No keys/secrets are committed. Keys are env-only (`DEPLOYER_PK`, `AGENT_PK`, `DGRID_API_KEY`); `.env`
      is git-ignored. Deploy/fund/withdraw/demo steps are human-run.

      ## Deadline

      Target **June 20, 2026 (Pacific)** — the earlier of the handbook (June 21) and DeepSurge (June 20)
      dates. Confirm the exact cutoff in the DeepSurge submission UI before tagging the final commit.

      ## Out of scope (v1)

      TEE/verifiable-compute, refunds/disputes/escrow, agent identity/KYC, marketplace/discovery,
      payment channels/batching, mainnet/real money, governance token.
      ```
- [ ] **Step 2: Verify the README has the required sections** *(THIS IS THE GATE)*
      Run: `node -e "const s=require('fs').readFileSync('README.md','utf8');for(const h of ['Judging Quickstart','Package ID','Why Sui','payAndRetry','withdraw']){if(!s.includes(h)){console.error('missing: '+h);process.exit(1)}}console.log('README OK')"`
      Expected: PASS — prints `README OK`.
- [ ] **Step 3: Commit**
      ```bash
      git add README.md
      git commit -m "docs: root README with Judging Quickstart and runbook"
      ```

---

### Task 7: Strict typecheck gate for `@tollgate/deploy-demo`

**Files:**
- Modify: `packages/deploy-demo/package.json` (confirm `typecheck` script present)

**Depends on:** Task 2, Task 3, Task 4, Task 5
**Effort:** low
**Provides:** a green `tsc --noEmit` over the package (strict-TS backstop)
**Requires:** all `@tollgate/deploy-demo` source from Tasks 1–5

- [ ] **Step 1: Confirm the typecheck script exists** (`"typecheck": "tsc --noEmit"` from Task 1).
- [ ] **Step 2: Run the strict typecheck** *(THIS IS THE GATE)*
      Run: `npx tsc -p packages/deploy-demo/tsconfig.json --noEmit`
      Expected: PASS — command exits 0 with no error output.
- [ ] **Step 3: Commit** (only if Step 1 changed the file; otherwise skip)
      ```bash
      git add packages/deploy-demo/package.json
      git commit -m "chore(deploy-demo): strict typecheck gate"
      ```
