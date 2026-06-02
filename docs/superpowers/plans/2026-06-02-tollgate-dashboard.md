# Dashboard Implementation Plan

**Goal:** Build `@tollgate/dashboard` — a React/Vite single-screen visualizer that renders the 402 → payment → receipt → withdraw money shot in real time, driven entirely by on-chain `PaymentReceipt` events (single source of truth), each linking to Sui Explorer.
**Architecture:** A Vite React app. `fetchReceipts`/`useReceipts` poll `client.queryEvents` for `${packageId}::tollgate::PaymentReceipt` via `@tollgate/shared`. `PaymentTimeline` renders a live feed with Explorer links; `App` wires the client from `VITE_*` env, shows running totals, and the timeline. Read-only; ships no secrets.
**Tech Stack:** TypeScript `^5.6` (ESM, strict), `react ^18.3`, `react-dom ^18.3`, `vite ^6`, `@vitejs/plugin-react ^4.3`, `vite-tsconfig-paths ^5.1`, `@mysten/sui ^2.17.0`, `@tollgate/shared`; tests `vitest ^2.1` + `@testing-library/react ^16` + `jsdom ^25` (dashboard-local vitest config).
**Source spec:** docs/superpowers/specs/2026-06-02-tollgate-machine-payable-web-design.md

> Conventions: strict TS, no `as any` (use `as unknown as T`), no placeholders, exact paths, complete code, named exports. No secrets in client code — only `VITE_*` public config. Intra-package imports are relative; cross-package shared imports use `@tollgate/shared/*`. Sync the repo before work; commit before done.

---

### Task 1: Scaffold the Vite React app

**Files:**
- Create: `packages/dashboard/package.json`
- Create: `packages/dashboard/tsconfig.json`
- Create: `packages/dashboard/vite.config.ts`
- Create: `packages/dashboard/vitest.config.ts`
- Create: `packages/dashboard/index.html`
- Create: `packages/dashboard/src/vite-env.d.ts`
- Create: `packages/dashboard/src/main.tsx`
- Create: `packages/dashboard/src/Hello.tsx`
- Test:   `packages/dashboard/src/Hello.test.tsx`

**Depends on:** Task 1 of the shared plan (`shared:1`)
**Effort:** medium
**Provides:** package `@tollgate/dashboard`; a working Vite+React+vitest(jsdom) setup; `function Hello(): JSX.Element`
**Requires:** npm workspace + `@tollgate/shared` (shared:1)

- [ ] **Step 1: Create `packages/dashboard/package.json`**
      ```json
      {
        "name": "@tollgate/dashboard",
        "version": "0.1.0",
        "private": true,
        "type": "module",
        "scripts": {
          "dev": "vite",
          "build": "vite build",
          "preview": "vite preview",
          "typecheck": "tsc --noEmit"
        },
        "dependencies": {
          "@mysten/sui": "^2.17.0",
          "@tollgate/shared": "*",
          "react": "^18.3.1",
          "react-dom": "^18.3.1"
        },
        "devDependencies": {
          "@testing-library/react": "^16.0.1",
          "@types/react": "^18.3.5",
          "@types/react-dom": "^18.3.0",
          "@vitejs/plugin-react": "^4.3.1",
          "jsdom": "^25.0.0",
          "vite": "^6.0.0",
          "vite-tsconfig-paths": "^5.1.0"
        }
      }
      ```
- [ ] **Step 2: Create `packages/dashboard/tsconfig.json`**
      ```json
      {
        "extends": "../../tsconfig.base.json",
        "compilerOptions": {
          "jsx": "react-jsx",
          "lib": ["ES2022", "DOM", "DOM.Iterable"]
        },
        "include": ["src"]
      }
      ```
- [ ] **Step 3: Create `packages/dashboard/vite.config.ts`**
      ```ts
      import { defineConfig } from 'vite';
      import react from '@vitejs/plugin-react';
      import tsconfigPaths from 'vite-tsconfig-paths';

      export default defineConfig({
        plugins: [react(), tsconfigPaths()],
      });
      ```
- [ ] **Step 4: Create `packages/dashboard/vitest.config.ts`**
      ```ts
      import { defineConfig } from 'vitest/config';
      import react from '@vitejs/plugin-react';
      import tsconfigPaths from 'vite-tsconfig-paths';

      export default defineConfig({
        plugins: [react(), tsconfigPaths()],
        test: { environment: 'jsdom', globals: false },
      });
      ```
- [ ] **Step 5: Create `index.html`, `vite-env.d.ts`, `main.tsx`, `Hello.tsx`**
      `packages/dashboard/index.html`:
      ```html
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Tollgate</title>
        </head>
        <body>
          <div id="root"></div>
          <script type="module" src="/src/main.tsx"></script>
        </body>
      </html>
      ```
      `packages/dashboard/src/vite-env.d.ts`:
      ```ts
      /// <reference types="vite/client" />
      ```
      `packages/dashboard/src/Hello.tsx`:
      ```tsx
      export function Hello(): JSX.Element {
        return <div>tollgate</div>;
      }
      ```
      `packages/dashboard/src/main.tsx`:
      ```tsx
      import { StrictMode } from 'react';
      import { createRoot } from 'react-dom/client';
      import { Hello } from './Hello';

      const root = document.getElementById('root');
      if (!root) throw new Error('missing #root');
      createRoot(root).render(
        <StrictMode>
          <Hello />
        </StrictMode>,
      );
      ```
- [ ] **Step 6: Write the failing test**
      `packages/dashboard/src/Hello.test.tsx`:
      ```tsx
      import { describe, it, expect } from 'vitest';
      import { render, screen } from '@testing-library/react';
      import { Hello } from './Hello';

      describe('Hello', () => {
        it('renders the brand', () => {
          render(<Hello />);
          expect(screen.getByText('tollgate')).toBeTruthy();
        });
      });
      ```
- [ ] **Step 7: Install workspace deps**
      Run: `npm install`
      Expected: exits 0 (react, vite, testing-library, jsdom resolved).
- [ ] **Step 8: Run the test** *(THIS IS THE GATE)*
      Run: `npx vitest run --config packages/dashboard/vitest.config.ts packages/dashboard/src/Hello.test.tsx`
      Expected: PASS — `1 passed`.
- [ ] **Step 9: Commit**
      ```bash
      git add packages/dashboard package-lock.json
      git commit -m "chore(dashboard): scaffold Vite React app"
      ```

---

### Task 2: `receiptsFeed.ts` — on-chain receipt polling

**Files:**
- Create: `packages/dashboard/src/receiptsFeed.ts`
- Test:   `packages/dashboard/src/receiptsFeed.test.ts`

**Depends on:** Task 1, Task 5 of shared plan (`shared:5`)
**Effort:** medium
**Provides:**
- `interface ReceiptRow { resourceId; payer; amount; nonce; timestampMs; txDigest }`
- `async function fetchReceipts(client: SuiClient, packageId: string, limit?: number): Promise<ReceiptRow[]>`
- `function useReceipts(client: SuiClient, packageId: string, intervalMs?: number): ReceiptRow[]`

**Requires:**
```ts
// from shared/receipts (shared:5):
export function bytesToHex(bytes: Uint8Array | number[]): string;
// @mysten/sui: SuiClient.queryEvents({ query: { MoveEventType }, order, limit }) -> { data: Array<{ parsedJson, id: { txDigest } }> }
// PaymentReceipt parsedJson: { resource_id: string; payer: string; amount: string; nonce: number[]; timestamp_ms: string }
```

- [ ] **Step 1: Write the failing test**
      `packages/dashboard/src/receiptsFeed.test.ts`:
      ```ts
      import { describe, it, expect, vi } from 'vitest';
      import type { SuiClient } from '@mysten/sui/client';
      import { fetchReceipts } from './receiptsFeed';

      const PKG = '0xpkg';

      describe('fetchReceipts', () => {
        it('maps PaymentReceipt events to rows', async () => {
          const client = {
            queryEvents: vi.fn().mockResolvedValue({
              data: [{
                parsedJson: { resource_id: '0xr', payer: '0xb', amount: '1000', nonce: [161, 178], timestamp_ms: '7' },
                id: { txDigest: '0xdig' },
              }],
            }),
          } as unknown as SuiClient;
          const rows = await fetchReceipts(client, PKG);
          expect(rows).toEqual([{ resourceId: '0xr', payer: '0xb', amount: '1000', nonce: 'a1b2', timestampMs: '7', txDigest: '0xdig' }]);
          expect(client.queryEvents).toHaveBeenCalledWith(expect.objectContaining({ query: { MoveEventType: `${PKG}::tollgate::PaymentReceipt` } }));
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run --config packages/dashboard/vitest.config.ts packages/dashboard/src/receiptsFeed.test.ts`
      Expected: FAIL — `fetchReceipts` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/dashboard/src/receiptsFeed.ts`:
      ```ts
      import { useEffect, useState } from 'react';
      import type { SuiClient } from '@mysten/sui/client';
      import { bytesToHex } from '@tollgate/shared/receipts';

      export interface ReceiptRow {
        resourceId: string;
        payer: string;
        amount: string;
        nonce: string;
        timestampMs: string;
        txDigest: string;
      }

      interface RawReceipt {
        resource_id: string;
        payer: string;
        amount: string;
        nonce: number[];
        timestamp_ms: string;
      }

      export async function fetchReceipts(client: SuiClient, packageId: string, limit = 50): Promise<ReceiptRow[]> {
        const res = await client.queryEvents({
          query: { MoveEventType: `${packageId}::tollgate::PaymentReceipt` },
          order: 'descending',
          limit,
        });
        return res.data.map((e) => {
          const j = e.parsedJson as RawReceipt;
          return {
            resourceId: j.resource_id,
            payer: j.payer,
            amount: j.amount,
            nonce: bytesToHex(j.nonce),
            timestampMs: j.timestamp_ms,
            txDigest: e.id.txDigest,
          };
        });
      }

      export function useReceipts(client: SuiClient, packageId: string, intervalMs = 4000): ReceiptRow[] {
        const [rows, setRows] = useState<ReceiptRow[]>([]);
        useEffect(() => {
          let active = true;
          const tick = async (): Promise<void> => {
            try {
              const next = await fetchReceipts(client, packageId);
              if (active) setRows(next);
            } catch {
              /* keep last known rows on transient RPC errors */
            }
          };
          void tick();
          const id = setInterval(() => void tick(), intervalMs);
          return () => {
            active = false;
            clearInterval(id);
          };
        }, [client, packageId, intervalMs]);
        return rows;
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run --config packages/dashboard/vitest.config.ts packages/dashboard/src/receiptsFeed.test.ts`
      Expected: PASS — `1 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/dashboard/src/receiptsFeed.ts packages/dashboard/src/receiptsFeed.test.ts
      git commit -m "feat(dashboard): on-chain receipt polling feed"
      ```

---

### Task 3: `PaymentTimeline.tsx` — live payment feed

**Files:**
- Create: `packages/dashboard/src/PaymentTimeline.tsx`
- Test:   `packages/dashboard/src/PaymentTimeline.test.tsx`

**Depends on:** Task 2
**Effort:** medium
**Provides:**
- `function suiscanTxUrl(network: string, digest: string): string`
- `function PaymentTimeline(props: { rows: ReceiptRow[]; network: string }): JSX.Element`

**Requires:**
```ts
// from this package (receiptsFeed, Task 2):
export interface ReceiptRow { resourceId: string; payer: string; amount: string; nonce: string; timestampMs: string; txDigest: string }
```

- [ ] **Step 1: Write the failing test**
      `packages/dashboard/src/PaymentTimeline.test.tsx`:
      ```tsx
      import { describe, it, expect } from 'vitest';
      import { render, screen } from '@testing-library/react';
      import { PaymentTimeline, suiscanTxUrl } from './PaymentTimeline';
      import type { ReceiptRow } from './receiptsFeed';

      const rows: ReceiptRow[] = [
        { resourceId: '0xresource', payer: '0xpayeraddress', amount: '1000', nonce: 'a1', timestampMs: '1', txDigest: '0xdigest123' },
      ];

      describe('PaymentTimeline', () => {
        it('builds a Suiscan url', () => {
          expect(suiscanTxUrl('testnet', '0xa')).toBe('https://suiscan.xyz/testnet/tx/0xa');
        });
        it('renders a payment row with an explorer link', () => {
          render(<PaymentTimeline rows={rows} network="testnet" />);
          expect(screen.getByText('1000')).toBeTruthy();
          const link = screen.getByText('receipt ↗');
          expect(link.getAttribute('href')).toContain('0xdigest123');
        });
        it('shows an empty state with no rows', () => {
          render(<PaymentTimeline rows={[]} network="testnet" />);
          expect(screen.getByText(/No payments yet/)).toBeTruthy();
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run --config packages/dashboard/vitest.config.ts packages/dashboard/src/PaymentTimeline.test.tsx`
      Expected: FAIL — `PaymentTimeline` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/dashboard/src/PaymentTimeline.tsx`:
      ```tsx
      import type { ReceiptRow } from './receiptsFeed';

      function short(s: string): string {
        return s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
      }

      export function suiscanTxUrl(network: string, digest: string): string {
        return `https://suiscan.xyz/${network}/tx/${digest}`;
      }

      export function PaymentTimeline(props: { rows: ReceiptRow[]; network: string }): JSX.Element {
        const { rows, network } = props;
        if (rows.length === 0) {
          return <p className="empty">No payments yet…</p>;
        }
        return (
          <ul className="timeline">
            {rows.map((r) => (
              <li key={r.txDigest} className="payment">
                <span className="amount">{r.amount}</span>
                <span className="payer">{short(r.payer)}</span>
                <span className="resource">{short(r.resourceId)}</span>
                <a className="explorer" href={suiscanTxUrl(network, r.txDigest)} target="_blank" rel="noreferrer">
                  receipt ↗
                </a>
              </li>
            ))}
          </ul>
        );
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run --config packages/dashboard/vitest.config.ts packages/dashboard/src/PaymentTimeline.test.tsx`
      Expected: PASS — `3 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/dashboard/src/PaymentTimeline.tsx packages/dashboard/src/PaymentTimeline.test.tsx
      git commit -m "feat(dashboard): live payment timeline with explorer links"
      ```

---

### Task 4: `App.tsx` — wire the dashboard

**Files:**
- Create: `packages/dashboard/src/App.tsx`
- Modify: `packages/dashboard/src/main.tsx`
- Test:   `packages/dashboard/src/App.test.tsx`

**Depends on:** Task 2, Task 3, Task 4 of shared plan (`shared:4`), Task 3 of shared plan (`shared:3`)
**Effort:** medium
**Provides:** `function App(): JSX.Element` — reads `VITE_SUI_NETWORK` / `VITE_TOLLGATE_PACKAGE_ID` / `VITE_SUI_RPC_URL`, polls receipts, renders totals + timeline

**Requires:**
```ts
// from shared/client (shared:4): export function getSuiClient(opts: { rpcUrl: string }): SuiClient; export function defaultRpcUrl(network: SuiNetwork): string;
// from shared/config (shared:3): export type SuiNetwork = 'testnet'|'mainnet'|'devnet'|'localnet';
// from this package: useReceipts (Task 2), PaymentTimeline (Task 3)
```

- [ ] **Step 1: Write the failing test**
      `packages/dashboard/src/App.test.tsx`:
      ```tsx
      import { describe, it, expect, vi } from 'vitest';

      vi.mock('@tollgate/shared/client', () => ({
        getSuiClient: () => ({ queryEvents: vi.fn().mockResolvedValue({ data: [] }) }),
        defaultRpcUrl: () => 'https://fullnode.testnet.sui.io:443',
      }));

      import { render, screen } from '@testing-library/react';
      import { App } from './App';

      describe('App', () => {
        it('renders the header and an empty timeline', () => {
          render(<App />);
          expect(screen.getByText(/machine-payable web on Sui/)).toBeTruthy();
          expect(screen.getByText(/No payments yet/)).toBeTruthy();
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run --config packages/dashboard/vitest.config.ts packages/dashboard/src/App.test.tsx`
      Expected: FAIL — `App` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/dashboard/src/App.tsx`:
      ```tsx
      import { useMemo } from 'react';
      import { getSuiClient, defaultRpcUrl } from '@tollgate/shared/client';
      import type { SuiNetwork } from '@tollgate/shared/config';
      import { useReceipts } from './receiptsFeed';
      import { PaymentTimeline } from './PaymentTimeline';

      export function App(): JSX.Element {
        const network = (import.meta.env.VITE_SUI_NETWORK ?? 'testnet') as SuiNetwork;
        const packageId = import.meta.env.VITE_TOLLGATE_PACKAGE_ID ?? '';
        const rpcUrl = import.meta.env.VITE_SUI_RPC_URL ?? defaultRpcUrl(network);
        const client = useMemo(() => getSuiClient({ rpcUrl }), [rpcUrl]);
        const rows = useReceipts(client, packageId);
        const total = rows.reduce((sum, r) => sum + BigInt(r.amount), 0n).toString();

        return (
          <main className="app">
            <h1>Tollgate — machine-payable web on Sui</h1>
            <p className="totals">
              On-chain micropayments: {rows.length} · total paid: {total} base units
            </p>
            <PaymentTimeline rows={rows} network={network} />
          </main>
        );
      }
      ```
      Then modify `packages/dashboard/src/main.tsx` — replace the `Hello` import and render with `App`:
      ```tsx
      import { StrictMode } from 'react';
      import { createRoot } from 'react-dom/client';
      import { App } from './App';

      const root = document.getElementById('root');
      if (!root) throw new Error('missing #root');
      createRoot(root).render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run --config packages/dashboard/vitest.config.ts packages/dashboard/src/App.test.tsx`
      Expected: PASS — `1 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/dashboard/src/App.tsx packages/dashboard/src/main.tsx packages/dashboard/src/App.test.tsx
      git commit -m "feat(dashboard): wire App with live receipts and totals"
      ```

---

### Task 5: Strict typecheck + production build gate

**Files:**
- Modify: `packages/dashboard/package.json` (confirm `typecheck`/`build` scripts present)

**Depends on:** Task 2, Task 3, Task 4
**Effort:** low
**Provides:** a green `tsc --noEmit` over the dashboard (strict-TS backstop; the production `vite build` is documented for the human deploy step)
**Requires:** all `@tollgate/dashboard` source from Tasks 1–4

- [ ] **Step 1: Confirm scripts exist** (`typecheck` and `build` were added in Task 1).
- [ ] **Step 2: Run the strict typecheck** *(THIS IS THE GATE)*
      Run: `npx tsc -p packages/dashboard/tsconfig.json --noEmit`
      Expected: PASS — command exits 0 with no error output.
- [ ] **Step 3: Commit** (only if Step 1 changed the file; otherwise skip)
      ```bash
      git add packages/dashboard/package.json
      git commit -m "chore(dashboard): strict typecheck gate"
      ```
