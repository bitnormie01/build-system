# dashboard-demo Implementation Plan

**Goal:** The single demo view: a web dashboard that shows monitored targets green/red with their
certificates, a working kill-switch, and a full mock-mode wiring runnable as `npm run demo` — plus a
headless end-to-end test that proves the money shot (kill → expiry → refund → certificate downgrade).
**Architecture:** `buildSnapshot` projects engine + store into a `DashboardSnapshot`. `DashboardServer`
(node `http` + `ws`) serves the static view, exposes `/api/state` and `/api/kill|revive`, and broadcasts on
change. The browser `app.ts` renders the snapshot (pure `renderState`, unit-tested) and wires the buttons.
`buildDemoSystem` wires the whole mock system; `main.ts` (`startDemo`) runs it real-time.
**Tech Stack:** TypeScript ^5.6 (strict, NodeNext), vitest ^2.1, ws ^8.18, esbuild ^0.24, Node `http`.
**Source spec:** docs/superpowers/specs/2026-07-05-deadman-design.md

> **ESM rule:** relative imports carry `.js`; `import type` for types; never `as any`. Never a secret value.
> `src/dashboard/view/` is excluded from `tsc` (browser globals; built by esbuild, `renderState` unit-tested).

---

### Task 1: Dashboard snapshot projection

**Files:**
- Create: `src/dashboard/snapshot.ts`
- Test:   `src/dashboard/snapshot.test.ts`

**Depends on:** heartbeat Task 2, downtime-attestation Task 1, downtime-attestation Task 3, foundation Task 2, foundation Task 4
**Effort:** medium
**Provides:** `buildSnapshot`, `DashboardSnapshot`, `TargetView`
**Requires:** `MonitorState`, `AttestationStore`, `buildCertificate`, `UptimeStatus`, `DowntimeIncident`, `Did`, `OrderStatus`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { AttestationStore } from '../attestation/attestation-store.js';
      import { buildSnapshot } from './snapshot.js';

      test('maps each monitored target to its certificate status and in-flight order', () => {
        const store = new AttestationStore();
        store.recordDowntime('did:t', { orderId: 'o1', expiredAt: 5, refundTxHash: '0xrefund', slaMinutes: 1 });
        const snap = buildSnapshot({
          issuerDid: 'did:deadman',
          now: 100,
          store,
          monitorStates: [{ targetDid: 'did:t', inFlightOrderId: 'o2', lastStatus: 'expired', resolved: 1 }],
        });
        expect(snap.issuerDid).toBe('did:deadman');
        expect(snap.targets[0]?.status).toBe('down');
        expect(snap.targets[0]?.inFlightOrderId).toBe('o2');
        expect(snap.targets[0]?.incidents[0]?.refundTxHash).toBe('0xrefund');
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/dashboard/snapshot.test.ts`
      Expected: FAIL — cannot find module `./snapshot.js`
- [ ] **Step 3: Implement the projection**
      Upstream: `MonitorState` (from `src/heartbeat/target-monitor.ts`) is
      `{ targetDid; inFlightOrderId; lastStatus; resolved }`. `buildCertificate(targetDid, issuerDid, store, now)`
      returns `UptimeCertificate` `{ status; totalHeartbeats; completedHeartbeats; uptimeRatio; downtimeIncidents; ... }`.
      `UptimeStatus` is `'healthy'|'degraded'|'down'`; `DowntimeIncident` is `{ orderId; expiredAt; refundTxHash; slaMinutes }`.
      ```ts
      import type { MonitorState } from '../heartbeat/target-monitor.js';
      import type { AttestationStore } from '../attestation/attestation-store.js';
      import { buildCertificate } from '../attestation/certificate-builder.js';
      import type { UptimeStatus, DowntimeIncident } from '../domain/certificate.js';
      import type { Did, OrderStatus } from '../domain/types.js';

      export interface TargetView {
        targetDid: Did;
        status: UptimeStatus;
        inFlightOrderId: string | null;
        lastStatus: OrderStatus | 'none';
        totalHeartbeats: number;
        completedHeartbeats: number;
        uptimeRatio: number;
        incidents: DowntimeIncident[];
      }

      export interface DashboardSnapshot {
        issuerDid: Did;
        generatedAt: number;
        targets: TargetView[];
      }

      export function buildSnapshot(params: {
        issuerDid: Did;
        monitorStates: MonitorState[];
        store: AttestationStore;
        now: number;
      }): DashboardSnapshot {
        const targets = params.monitorStates.map((ms): TargetView => {
          const cert = buildCertificate(ms.targetDid, params.issuerDid, params.store, params.now);
          return {
            targetDid: ms.targetDid,
            status: cert.status,
            inFlightOrderId: ms.inFlightOrderId,
            lastStatus: ms.lastStatus,
            totalHeartbeats: cert.totalHeartbeats,
            completedHeartbeats: cert.completedHeartbeats,
            uptimeRatio: cert.uptimeRatio,
            incidents: cert.downtimeIncidents,
          };
        });
        return { issuerDid: params.issuerDid, generatedAt: params.now, targets };
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/dashboard/snapshot.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(dashboard): snapshot projection`

---

### Task 2: Dashboard HTTP + WebSocket server

**Files:**
- Create: `src/dashboard/server.ts`
- Test:   `src/dashboard/server.test.ts`

**Depends on:** Task 1, mock-cap Task 6, foundation Task 1
**Effort:** high
**Provides:** `DashboardServer`, `DashboardServerDeps`
**Requires:** `DashboardSnapshot`, `MockControl`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { WebSocket } from 'ws';
      import { DashboardServer } from './server.js';
      import type { DashboardSnapshot } from './snapshot.js';

      function snap(targets: DashboardSnapshot['targets']): DashboardSnapshot {
        return { issuerDid: 'did:deadman', generatedAt: 0, targets };
      }

      test('serves state, kills via control, and broadcasts to ws clients', async () => {
        let killed: string | null = null;
        let state = snap([{ targetDid: 'did:t', status: 'healthy', inFlightOrderId: 'o1',
          lastStatus: 'none', totalHeartbeats: 0, completedHeartbeats: 0, uptimeRatio: 1, incidents: [] }]);
        const server = new DashboardServer({
          getSnapshot: () => state,
          control: {
            registerTarget() {},
            killTarget: (did) => { killed = did; state = snap([{ ...state.targets[0]!, status: 'down' }]); },
            reviveTarget() {},
          },
          staticDir: '/nonexistent',
        });
        const port = await server.listen(0);
        const stateRes = await fetch(`http://127.0.0.1:${port}/api/state`);
        expect(((await stateRes.json()) as DashboardSnapshot).targets[0]?.targetDid).toBe('did:t');

        const ws = new WebSocket(`ws://127.0.0.1:${port}`);
        const messages: DashboardSnapshot[] = [];
        await new Promise<void>((r) => ws.on('open', () => r()));
        ws.on('message', (d) => messages.push(JSON.parse(d.toString()) as DashboardSnapshot));
        await new Promise((r) => setTimeout(r, 30));

        const killRes = await fetch(`http://127.0.0.1:${port}/api/kill`,
          { method: 'POST', body: JSON.stringify({ did: 'did:t' }) });
        expect(killRes.status).toBe(200);
        expect(killed).toBe('did:t');
        await new Promise((r) => setTimeout(r, 30));
        expect(messages.some((m) => m.targets[0]?.status === 'down')).toBe(true);

        ws.close();
        await server.close();
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/dashboard/server.test.ts`
      Expected: FAIL — cannot find module `./server.js`
- [ ] **Step 3: Implement the server**
      Upstream: `DashboardSnapshot` (from `src/dashboard/snapshot.ts`); `MockControl` (from
      `src/cap/environment.ts`) has `registerTarget`, `killTarget(did)`, `reviveTarget(did)`.
      ```ts
      import { createServer } from 'node:http';
      import type { Server, IncomingMessage, ServerResponse } from 'node:http';
      import { readFile } from 'node:fs/promises';
      import { join } from 'node:path';
      import { WebSocketServer, WebSocket } from 'ws';
      import type { DashboardSnapshot } from './snapshot.js';
      import type { MockControl } from '../cap/environment.js';

      export interface DashboardServerDeps {
        getSnapshot: () => DashboardSnapshot;
        control: MockControl | null;
        staticDir: string;
      }

      export class DashboardServer {
        private readonly server: Server;
        private readonly wss: WebSocketServer;
        private readonly clients = new Set<WebSocket>();

        constructor(private readonly deps: DashboardServerDeps) {
          this.server = createServer((req, res) => {
            void this.handle(req, res);
          });
          this.wss = new WebSocketServer({ server: this.server });
          this.wss.on('connection', (ws) => {
            this.clients.add(ws);
            ws.send(JSON.stringify(this.deps.getSnapshot()));
            ws.on('close', () => this.clients.delete(ws));
          });
        }

        private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
          const url = req.url ?? '/';
          if (req.method === 'GET' && url === '/api/state') {
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify(this.deps.getSnapshot()));
            return;
          }
          if (req.method === 'POST' && (url === '/api/kill' || url === '/api/revive')) {
            const body = await readBody(req);
            const did = (JSON.parse(body || '{}') as { did?: string }).did ?? '';
            if (!this.deps.control) {
              res.writeHead(409);
              res.end('control unavailable in live mode');
              return;
            }
            if (url === '/api/kill') this.deps.control.killTarget(did);
            else this.deps.control.reviveTarget(did);
            this.broadcast();
            res.writeHead(200, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
            return;
          }
          const rel = url === '/' ? 'index.html' : url.replace(/^\//, '');
          if (rel.includes('..')) {
            res.writeHead(400);
            res.end('bad path');
            return;
          }
          try {
            const content = await readFile(join(this.deps.staticDir, rel));
            res.writeHead(200, { 'content-type': contentType(rel) });
            res.end(content);
          } catch {
            res.writeHead(404);
            res.end('not found');
          }
        }

        broadcast(): void {
          const msg = JSON.stringify(this.deps.getSnapshot());
          for (const ws of this.clients) {
            if (ws.readyState === ws.OPEN) ws.send(msg);
          }
        }

        listen(port: number): Promise<number> {
          return new Promise((resolve) => {
            this.server.listen(port, () => {
              const addr = this.server.address();
              resolve(typeof addr === 'object' && addr !== null ? addr.port : port);
            });
          });
        }

        async close(): Promise<void> {
          for (const ws of this.clients) ws.close();
          await new Promise<void>((resolve) => this.wss.close(() => resolve()));
          await new Promise<void>((resolve) => this.server.close(() => resolve()));
        }
      }

      function readBody(req: IncomingMessage): Promise<string> {
        return new Promise((resolve) => {
          let data = '';
          req.on('data', (c) => {
            data += String(c);
          });
          req.on('end', () => resolve(data));
        });
      }

      function contentType(file: string): string {
        if (file.endsWith('.html')) return 'text/html; charset=utf-8';
        if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
        if (file.endsWith('.css')) return 'text/css; charset=utf-8';
        return 'application/octet-stream';
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/dashboard/server.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(dashboard): http + websocket server with kill-switch`

---

### Task 3: Browser view (renderState + shell)

**Files:**
- Create: `src/dashboard/view/app.ts`
- Create: `src/dashboard/public/index.html`
- Test:   `src/dashboard/view/app.test.ts`

**Depends on:** Task 1
**Effort:** medium
**Provides:** `renderState`
**Requires:** `DashboardSnapshot`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { renderState } from './app.js';

      test('renders a down target citing its refund tx, and a healthy target', () => {
        const html = renderState({
          issuerDid: 'did:deadman',
          generatedAt: 0,
          targets: [
            { targetDid: 'did:down', status: 'down', inFlightOrderId: null, lastStatus: 'expired',
              totalHeartbeats: 2, completedHeartbeats: 1, uptimeRatio: 0.5,
              incidents: [{ orderId: 'o1', expiredAt: 5, refundTxHash: '0xrefund', slaMinutes: 1 }] },
            { targetDid: 'did:up', status: 'healthy', inFlightOrderId: 'o9', lastStatus: 'completed',
              totalHeartbeats: 3, completedHeartbeats: 3, uptimeRatio: 1, incidents: [] },
          ],
        });
        expect(html).toContain('DOWN');
        expect(html).toContain('0xrefund');
        expect(html).toContain('did:up');
        expect(html).toContain('HEALTHY');
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/dashboard/view/app.test.ts`
      Expected: FAIL — cannot find module `./app.js`
- [ ] **Step 3: Implement the view**
      Upstream: `DashboardSnapshot` (from `src/dashboard/snapshot.ts`) is
      `{ issuerDid; generatedAt; targets: TargetView[] }`; `TargetView` is
      `{ targetDid; status; inFlightOrderId; lastStatus; totalHeartbeats; completedHeartbeats; uptimeRatio; incidents }`.
      The bootstrap only runs in a browser (`typeof document !== 'undefined'`), so importing this module in
      vitest (node) exercises only `renderState`.
      `src/dashboard/view/app.ts`:
      ```ts
      import type { DashboardSnapshot } from '../snapshot.js';

      export function renderState(snapshot: DashboardSnapshot): string {
        const cards = snapshot.targets
          .map((t) => {
            const color = t.status === 'down' ? '#e5484d' : t.status === 'degraded' ? '#f5a623' : '#30a46c';
            const incidents = t.incidents
              .map((i) => `<li>SLA ${i.slaMinutes}m breached · refund <code>${i.refundTxHash}</code></li>`)
              .join('');
            return `<div class="card" style="border-color:${color}">
                <h3>${t.targetDid}</h3>
                <div class="status" style="color:${color}">${t.status.toUpperCase()}</div>
                <div>heartbeats ${t.completedHeartbeats}/${t.totalHeartbeats} · in-flight ${t.inFlightOrderId ?? '—'}</div>
                <ul>${incidents}</ul>
                <button data-kill="${t.targetDid}">Kill</button>
                <button data-revive="${t.targetDid}">Revive</button>
              </div>`;
          })
          .join('');
        return `<h1>Deadman — liveness oracle</h1>
          <p>issuer <code>${snapshot.issuerDid}</code> · a status page can lie, a refund tx cannot.</p>
          <div class="grid">${cards}</div>`;
      }

      function bootstrap(): void {
        const root = document.getElementById('root');
        const render = (s: DashboardSnapshot): void => {
          if (root) root.innerHTML = renderState(s);
        };
        const ws = new WebSocket(`ws://${location.host}`);
        ws.onmessage = (ev): void => render(JSON.parse(String(ev.data)) as DashboardSnapshot);
        document.addEventListener('click', (e) => {
          const el = e.target as HTMLElement;
          const kill = el.getAttribute('data-kill');
          const revive = el.getAttribute('data-revive');
          if (kill) void fetch('/api/kill', { method: 'POST', body: JSON.stringify({ did: kill }) });
          if (revive) void fetch('/api/revive', { method: 'POST', body: JSON.stringify({ did: revive }) });
        });
        void fetch('/api/state')
          .then((r) => r.json())
          .then((s) => render(s as DashboardSnapshot));
      }

      if (typeof document !== 'undefined') bootstrap();
      ```
      `src/dashboard/public/index.html`:
      ```html
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Deadman — liveness oracle</title>
          <style>
            body { font-family: system-ui, sans-serif; margin: 2rem; background: #0b0e11; color: #e6e6e6; }
            h1 { margin-bottom: 0; }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem; }
            .card { border: 2px solid #30a46c; border-radius: 10px; padding: 1rem; background: #14181d; }
            .status { font-size: 1.5rem; font-weight: 700; }
            code { font-size: 0.72rem; word-break: break-all; color: #9bd; }
            ul { padding-left: 1.1rem; }
            button { margin: 0.5rem 0.4rem 0 0; padding: 0.35rem 0.7rem; cursor: pointer; }
          </style>
        </head>
        <body>
          <div id="root">Loading…</div>
          <script type="module" src="/app.js"></script>
        </body>
      </html>
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/dashboard/view/app.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(dashboard): browser view (renderState + shell)`

---

### Task 4: Demo system wiring + money-shot end-to-end test

**Files:**
- Create: `src/dashboard/demo-system.ts`
- Test:   `src/dashboard/demo-system.test.ts`

**Depends on:** Task 1, mock-cap Task 1, mock-cap Task 6, heartbeat Task 1, heartbeat Task 3, downtime-attestation Task 1, downtime-attestation Task 2, downtime-attestation Task 4, foundation Task 2
**Effort:** high
**Provides:** `buildDemoSystem`, `DemoSystem`, `DemoConfig`
**Requires:** `CapEnvironment`, `MockControl`, `createMockEnvironment`, `ManualClock`, `RequesterShard`, `HeartbeatEngine`, `EngineTarget`, `DowntimeDetector`, `AttestationStore`, `AttestationProvider`, `buildSnapshot`, `DashboardSnapshot`, `Did`

- [ ] **Step 1: Write the failing test**
      This is the money shot proven headlessly: a monitored target is killed after escrow locks; its
      in-flight order expires; the certificate downgrades to `down` citing the refund tx.
      ```ts
      import { test, expect } from 'vitest';
      import { ManualClock } from '../cap/clock.js';
      import { createMockEnvironment } from '../cap/environment.js';
      import { buildDemoSystem } from './demo-system.js';

      async function flush(): Promise<void> {
        for (let i = 0; i < 50; i++) await Promise.resolve();
      }

      test('MONEY SHOT: kill a monitored target → in-flight order expires → certificate cites the refund tx', async () => {
        const clock = new ManualClock();
        const env = createMockEnvironment({ clock, msPerSlaMinute: 1000, autoDeliverMs: 100 });
        env.control?.registerTarget('did:target');
        const system = await buildDemoSystem({
          env,
          issuerDid: 'did:deadman',
          requesterDids: ['did:req1', 'did:req2'],
          targets: [{ did: 'did:target', amountUsdc: '0.01', slaMinutes: 1 }],
          now: () => clock.now(),
        });
        await flush();
        clock.advance(150);          // first heartbeat completes (healthy)
        await flush();
        expect(system.getSnapshot().targets[0]?.status).not.toBe('down');

        system.control?.killTarget('did:target');   // kill AFTER escrow locks, before delivery
        clock.advance(1200);         // SLA lapses on the in-flight order
        await flush();

        const view = system.getSnapshot().targets[0];
        expect(view?.status).toBe('down');
        expect(view?.incidents[view.incidents.length - 1]?.refundTxHash).toMatch(/^0x/);
        system.stop();
        await env.close();
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/dashboard/demo-system.test.ts`
      Expected: FAIL — cannot find module `./demo-system.js`
- [ ] **Step 3: Implement the wiring**
      Upstream: `CapEnvironment` (`forAgent(did): CapClient`, `control: MockControl | null`, `close()`);
      `RequesterShard(did, client)`; `HeartbeatEngine(shards)` with `start(targets: EngineTarget[])`,
      `getStates(): MonitorState[]`, `stop()`; `EngineTarget` is `{ did; amountUsdc; slaMinutes }`;
      `DowntimeDetector(store)` with `attach(stream)`; `AttestationStore`; `AttestationProvider(client,
      selfDid, store, now)` with `start()`, `stop()`; `buildSnapshot({ issuerDid, monitorStates, store, now })`.
      ```ts
      import type { CapEnvironment, MockControl } from '../cap/environment.js';
      import { RequesterShard } from '../heartbeat/requester-shard.js';
      import { HeartbeatEngine } from '../heartbeat/heartbeat-engine.js';
      import type { EngineTarget } from '../heartbeat/heartbeat-engine.js';
      import { DowntimeDetector } from '../attestation/downtime-detector.js';
      import { AttestationStore } from '../attestation/attestation-store.js';
      import { AttestationProvider } from '../attestation/attestation-provider.js';
      import { buildSnapshot } from './snapshot.js';
      import type { DashboardSnapshot } from './snapshot.js';
      import type { Did } from '../domain/types.js';

      export interface DemoConfig {
        env: CapEnvironment;
        issuerDid: Did;
        requesterDids: Did[];
        targets: EngineTarget[];
        now: () => number;
      }

      export interface DemoSystem {
        getSnapshot: () => DashboardSnapshot;
        control: MockControl | null;
        stop: () => void;
      }

      export async function buildDemoSystem(config: DemoConfig): Promise<DemoSystem> {
        const store = new AttestationStore();
        const shards: RequesterShard[] = [];
        for (const did of config.requesterDids) {
          const client = config.env.forAgent(did);
          new DowntimeDetector(store).attach(await client.connectWebSocket());
          shards.push(new RequesterShard(did, client));
        }
        const engine = new HeartbeatEngine(shards);
        await engine.start(config.targets);
        const provider = new AttestationProvider(
          config.env.forAgent(config.issuerDid), config.issuerDid, store, config.now);
        await provider.start();
        return {
          getSnapshot: (): DashboardSnapshot =>
            buildSnapshot({
              issuerDid: config.issuerDid,
              monitorStates: engine.getStates(),
              store,
              now: config.now(),
            }),
          control: config.env.control,
          stop: (): void => {
            engine.stop();
            provider.stop();
          },
        };
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/dashboard/demo-system.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(dashboard): demo system wiring + money-shot e2e test`

---

### Task 5: Real-time demo entrypoint

**Files:**
- Create: `src/dashboard/main.ts`
- Test:   `src/dashboard/main.test.ts`

**Depends on:** Task 1, Task 2, Task 4, mock-cap Task 6, foundation Task 5
**Effort:** medium
**Provides:** `startDemo`
**Requires:** `resolveMode`, `createMockEnvironment`, `buildDemoSystem`, `DemoSystem`, `DashboardServer`, `DashboardSnapshot`

- [ ] **Step 1: Write the failing test**
      ```ts
      import { test, expect } from 'vitest';
      import { startDemo } from './main.js';
      import type { DashboardSnapshot } from './snapshot.js';

      test('startDemo serves a mock-mode snapshot with monitored targets, then stops cleanly', async () => {
        const { port, stop } = await startDemo(0);
        try {
          const res = await fetch(`http://127.0.0.1:${port}/api/state`);
          const snap = (await res.json()) as DashboardSnapshot;
          expect(snap.issuerDid).toBe('did:deadman');
          expect(snap.targets.length).toBeGreaterThan(0);
        } finally {
          await stop();
        }
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run src/dashboard/main.test.ts`
      Expected: FAIL — cannot find module `./main.js`
- [ ] **Step 3: Implement the entrypoint**
      Upstream: `resolveMode(env): 'mock'|'live'`; `createMockEnvironment({ msPerSlaMinute, autoDeliverMs })`;
      `buildDemoSystem(config): Promise<DemoSystem>`; `DashboardServer({ getSnapshot, control, staticDir })`
      with `listen(port): Promise<number>`, `broadcast()`, `close()`.
      ```ts
      import { fileURLToPath } from 'node:url';
      import { dirname, join } from 'node:path';
      import { resolveMode } from '../config/mode.js';
      import { createMockEnvironment } from '../cap/environment.js';
      import { buildDemoSystem } from './demo-system.js';
      import { DashboardServer } from './server.js';

      export async function startDemo(port = 4000): Promise<{ port: number; stop: () => Promise<void> }> {
        const mode = resolveMode(process.env);
        if (mode === 'live') {
          throw new Error('DEADMAN_MODE=live: run the live smoke via `npm run live:smoke`, not the mock demo');
        }
        const env = createMockEnvironment({ msPerSlaMinute: 8000, autoDeliverMs: 1200 });
        env.control?.registerTarget('did:partner-a');
        env.control?.registerTarget('did:partner-b');
        env.control?.registerTarget('did:kill-target');
        env.control?.registerTarget('did:declining', { rejectAfterPay: true });
        const system = await buildDemoSystem({
          env,
          issuerDid: 'did:deadman',
          requesterDids: ['did:req1', 'did:req2'],
          targets: [
            { did: 'did:partner-a', amountUsdc: '0.01', slaMinutes: 1 },
            { did: 'did:partner-b', amountUsdc: '0.01', slaMinutes: 1 },
            { did: 'did:kill-target', amountUsdc: '0.01', slaMinutes: 1 },
            { did: 'did:declining', amountUsdc: '0.01', slaMinutes: 1 },
          ],
          now: () => Date.now(),
        });
        const staticDir = join(dirname(fileURLToPath(import.meta.url)), 'public');
        const server = new DashboardServer({
          getSnapshot: system.getSnapshot,
          control: system.control,
          staticDir,
        });
        const actualPort = await server.listen(port);
        const interval = setInterval(() => server.broadcast(), 1000);
        return {
          port: actualPort,
          stop: async (): Promise<void> => {
            clearInterval(interval);
            system.stop();
            await server.close();
            await env.close();
          },
        };
      }

      const invokedDirectly = process.argv[1] === fileURLToPath(import.meta.url);
      if (invokedDirectly) {
        startDemo(Number(process.env.PORT ?? 4000))
          .then(({ port }) => {
            console.log(`Deadman demo dashboard: http://localhost:${port} (mock mode). Open it, then click Kill.`);
          })
          .catch((err: unknown) => {
            console.error(err);
            process.exitCode = 1;
          });
      }
      ```
- [ ] **Step 4: Run to confirm it passes**   # <-- GATE
      Run: `npx vitest run src/dashboard/main.test.ts`
      Expected: PASS — "1 passed"
- [ ] **Step 5: Commit (kernel-performed — no agent runs this)**
      Message: `feat(dashboard): real-time mock demo entrypoint`
