# Agent Implementation Plan

**Goal:** Build `@tollgate/agent` — the autonomous auto-pay SDK (`payAndRetry`: turn a 402 into a signed Sui micropayment + retry, fully autonomously) and a real LLM tool-use loop (via the DGrid OpenAI-compatible gateway) that drives the demo money shot.
**Architecture:** `createTollgateFetch` wraps `fetch`: on a 402 it parses the `PaymentChallenge`, builds + signs + submits `tollgate::pay<T>` from the agent's own keypair, waits for finality, and retries with `X-Tollgate-Payment: <digest>`. The LLM loop (`runAgent`) uses the `openai` SDK pointed at DGrid, exposes the 3 paid tools as function tools, and lets the model call them — each call auto-pays transparently.
**Tech Stack:** TypeScript `^5.6` (ESM, strict), `openai ^6.41.0` (baseURL → `https://api.dgrid.ai/v1`), `@mysten/sui ^2.17.0`, `@tollgate/shared`, `vitest ^2.1`, Node ≥ 20 (global `fetch`/`Response`/`Headers`).
**Source spec:** docs/superpowers/specs/2026-06-02-tollgate-machine-payable-web-design.md

> Conventions: strict TS, no `as any` (use `as unknown as T`), no placeholders, exact paths, complete code, named exports. **Never hardcode keys/secrets** — the keypair comes from `AGENT_PK`, the LLM key from `DGRID_API_KEY`. Intra-package imports are relative; only cross-package shared imports use `@tollgate/shared/*`. Sync the repo before work; commit before done.

---

### Task 1: Scaffold `@tollgate/agent`

**Files:**
- Create: `packages/agent/package.json`
- Create: `packages/agent/tsconfig.json`
- Create: `packages/agent/src/banner.ts`
- Test:   `packages/agent/src/banner.test.ts`

**Depends on:** Task 1 of the shared plan (`shared:1`)
**Effort:** low
**Provides:** package `@tollgate/agent` (subpath exports `./*` → `./src/*.ts`); `const AGENT_NAME: string`
**Requires:** npm workspace + `@tollgate/shared` (shared:1)

- [ ] **Step 1: Create `packages/agent/package.json`**
      ```json
      {
        "name": "@tollgate/agent",
        "version": "0.1.0",
        "private": true,
        "type": "module",
        "exports": { "./*": "./src/*.ts" },
        "scripts": { "typecheck": "tsc --noEmit", "demo": "tsx src/runDemo.ts" },
        "dependencies": {
          "@mysten/sui": "^2.17.0",
          "@tollgate/shared": "*",
          "openai": "^6.41.0"
        }
      }
      ```
- [ ] **Step 2: Create `packages/agent/tsconfig.json`**
      ```json
      {
        "extends": "../../tsconfig.base.json",
        "include": ["src"]
      }
      ```
- [ ] **Step 3: Create source + test**
      `packages/agent/src/banner.ts`:
      ```ts
      export const AGENT_NAME = 'tollgate-demo-agent';
      ```
      `packages/agent/src/banner.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { AGENT_NAME } from './banner';

      describe('agent banner', () => {
        it('names the agent', () => {
          expect(AGENT_NAME).toBe('tollgate-demo-agent');
        });
      });
      ```
- [ ] **Step 4: Install workspace deps**
      Run: `npm install`
      Expected: exits 0 (`openai` resolved, `@tollgate/*` links present).
- [ ] **Step 5: Run the test** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/agent/src/banner.test.ts`
      Expected: PASS — `1 passed`.
- [ ] **Step 6: Commit**
      ```bash
      git add packages/agent/package.json packages/agent/tsconfig.json packages/agent/src/banner.ts packages/agent/src/banner.test.ts package-lock.json
      git commit -m "chore(agent): scaffold @tollgate/agent"
      ```

---

### Task 2: `payAndRetry.ts` — autonomous 402 → pay → retry

**Files:**
- Create: `packages/agent/src/payAndRetry.ts`
- Test:   `packages/agent/src/payAndRetry.test.ts`

**Depends on:** Task 1, Task 7 of shared plan (`shared:7`), Task 2 of shared plan (`shared:2`)
**Effort:** high
**Provides:**
- `class InsufficientBalanceError extends Error`, `class ChallengeExpiredError extends Error`, `class VerificationRejectedError extends Error`
- `interface TollgateFetchDeps { keypair: Ed25519Keypair; suiClient: SuiClient; packageId: string; fetchImpl?: typeof fetch; onPayment?: (info: { url: string; digest: string; amount: string; resourceId: string }) => void }`
- `type TollgateFetch = (url: string, init?: RequestInit) => Promise<Response>`
- `function createTollgateFetch(deps: TollgateFetchDeps): TollgateFetch`

**Requires:**
```ts
// from shared/types (shared:2):
export const PaymentChallengeSchema; // zod; parses { resourceId, packageId, coinType, price, recipient, nonce, expiresAt }
// from shared/ptb (shared:7):
export async function buildPayTx(client: SuiClient, p: { packageId: string; coinType: string; resourceObjectId: string; owner: string; amount: string; nonceHex: string }): Promise<Transaction>;
// @mysten/sui: SuiClient.signAndExecuteTransaction({ signer, transaction, options }) -> { digest }; SuiClient.waitForTransaction({ digest }); Ed25519Keypair.toSuiAddress()
```

- [ ] **Step 1: Write the failing test**
      `packages/agent/src/payAndRetry.test.ts`:
      ```ts
      import { describe, it, expect, vi } from 'vitest';
      import type { SuiClient } from '@mysten/sui/client';
      import type { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
      import { createTollgateFetch, InsufficientBalanceError, ChallengeExpiredError } from './payAndRetry';

      const PKG = '0xpkg';
      const keypair = { toSuiAddress: () => '0xowner' } as unknown as Ed25519Keypair;

      function challenge(extra: Partial<Record<string, unknown>> = {}) {
        return {
          resourceId: '0xr', packageId: PKG, coinType: `${PKG}::mock_usd::MOCK_USD`,
          price: '1000', recipient: '0xowner', nonce: 'a1b2', expiresAt: Date.now() + 60_000, ...extra,
        };
      }
      const r402 = (body: object) => new Response(JSON.stringify(body), { status: 402, headers: { 'content-type': 'application/json' } });
      const r200 = () => new Response(JSON.stringify({ data: 'secret' }), { status: 200 });

      function suiOk() {
        return {
          getCoins: vi.fn().mockResolvedValue({ data: [{ coinObjectId: '0xc1', balance: '5000' }] }),
          signAndExecuteTransaction: vi.fn().mockResolvedValue({ digest: '0xpaid' }),
          waitForTransaction: vi.fn().mockResolvedValue({}),
        } as unknown as SuiClient;
      }

      describe('createTollgateFetch', () => {
        it('pays on 402 and retries with the digest header', async () => {
          const fetchImpl = vi.fn().mockResolvedValueOnce(r402(challenge())).mockResolvedValueOnce(r200());
          const onPayment = vi.fn();
          const tfetch = createTollgateFetch({ keypair, suiClient: suiOk(), packageId: PKG, fetchImpl, onPayment });
          const res = await tfetch('http://x/tools/crypto-price');
          expect(res.status).toBe(200);
          expect(onPayment).toHaveBeenCalledWith(expect.objectContaining({ digest: '0xpaid', amount: '1000' }));
          const retryInit = fetchImpl.mock.calls[1]?.[1] as RequestInit;
          expect(new Headers(retryInit.headers).get('X-Tollgate-Payment')).toBe('0xpaid');
        });

        it('passes through non-402 responses unchanged', async () => {
          const fetchImpl = vi.fn().mockResolvedValue(r200());
          const tfetch = createTollgateFetch({ keypair, suiClient: suiOk(), packageId: PKG, fetchImpl });
          expect((await tfetch('http://x')).status).toBe(200);
          expect(fetchImpl).toHaveBeenCalledTimes(1);
        });

        it('throws ChallengeExpiredError on a stale challenge', async () => {
          const fetchImpl = vi.fn().mockResolvedValueOnce(r402(challenge({ expiresAt: Date.now() - 1 })));
          const tfetch = createTollgateFetch({ keypair, suiClient: suiOk(), packageId: PKG, fetchImpl });
          await expect(tfetch('http://x')).rejects.toBeInstanceOf(ChallengeExpiredError);
        });

        it('throws InsufficientBalanceError when the wallet has no coins', async () => {
          const fetchImpl = vi.fn().mockResolvedValueOnce(r402(challenge()));
          const sui = { getCoins: vi.fn().mockResolvedValue({ data: [] }) } as unknown as SuiClient;
          const tfetch = createTollgateFetch({ keypair, suiClient: sui, packageId: PKG, fetchImpl });
          await expect(tfetch('http://x')).rejects.toBeInstanceOf(InsufficientBalanceError);
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/agent/src/payAndRetry.test.ts`
      Expected: FAIL — `createTollgateFetch` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/agent/src/payAndRetry.ts`:
      ```ts
      import type { SuiClient } from '@mysten/sui/client';
      import type { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
      import { PaymentChallengeSchema } from '@tollgate/shared/types';
      import { buildPayTx } from '@tollgate/shared/ptb';

      export class InsufficientBalanceError extends Error {}
      export class ChallengeExpiredError extends Error {}
      export class VerificationRejectedError extends Error {}

      export interface TollgateFetchDeps {
        keypair: Ed25519Keypair;
        suiClient: SuiClient;
        packageId: string;
        fetchImpl?: typeof fetch;
        onPayment?: (info: { url: string; digest: string; amount: string; resourceId: string }) => void;
      }

      export type TollgateFetch = (url: string, init?: RequestInit) => Promise<Response>;

      const HEADER = 'X-Tollgate-Payment';

      export function createTollgateFetch(deps: TollgateFetchDeps): TollgateFetch {
        const doFetch = deps.fetchImpl ?? fetch;
        return async (url, init) => {
          const first = await doFetch(url, init);
          if (first.status !== 402) return first;

          const challenge = PaymentChallengeSchema.parse(await first.json());
          if (Date.now() > challenge.expiresAt) {
            throw new ChallengeExpiredError(`challenge for ${url} expired`);
          }

          let tx;
          try {
            tx = await buildPayTx(deps.suiClient, {
              packageId: deps.packageId,
              coinType: challenge.coinType,
              resourceObjectId: challenge.resourceId,
              owner: deps.keypair.toSuiAddress(),
              amount: challenge.price,
              nonceHex: challenge.nonce,
            });
          } catch (e) {
            if (e instanceof Error && /insufficient|no .* coins/.test(e.message)) {
              throw new InsufficientBalanceError(e.message);
            }
            throw e;
          }

          const result = await deps.suiClient.signAndExecuteTransaction({
            signer: deps.keypair,
            transaction: tx,
            options: { showEffects: true, showEvents: true },
          });
          await deps.suiClient.waitForTransaction({ digest: result.digest });
          deps.onPayment?.({ url: String(url), digest: result.digest, amount: challenge.price, resourceId: challenge.resourceId });

          const headers = new Headers(init?.headers);
          headers.set(HEADER, result.digest);
          const retry = await doFetch(url, { ...init, headers });
          if (retry.status === 402 || retry.status === 403) {
            throw new VerificationRejectedError(`payment rejected for ${url}: ${retry.status} ${await retry.text()}`);
          }
          return retry;
        };
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/agent/src/payAndRetry.test.ts`
      Expected: PASS — `4 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/agent/src/payAndRetry.ts packages/agent/src/payAndRetry.test.ts
      git commit -m "feat(agent): autonomous payAndRetry fetch wrapper"
      ```

---

### Task 3: `llm.ts` — DGrid OpenAI-compatible client

**Files:**
- Create: `packages/agent/src/llm.ts`
- Test:   `packages/agent/src/llm.test.ts`

**Depends on:** Task 1
**Effort:** low
**Provides:**
- `function createLlmClient(env?: NodeJS.ProcessEnv): OpenAI` (apiKey=`DGRID_API_KEY`, baseURL=`DGRID_BASE_URL` ?? `https://api.dgrid.ai/v1`)
- `function getModel(env?: NodeJS.ProcessEnv): string` (`TOLLGATE_AGENT_MODEL` ?? `anthropic/claude-3.5-haiku`)

**Requires:** `openai` (Task 1 installed it). `new OpenAI({ apiKey, baseURL })`; instance exposes readonly `.baseURL`.

- [ ] **Step 1: Write the failing test**
      `packages/agent/src/llm.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { createLlmClient, getModel } from './llm';

      describe('llm', () => {
        it('points the client at the DGrid gateway by default', () => {
          const client = createLlmClient({ DGRID_API_KEY: 'sk-test' } as NodeJS.ProcessEnv);
          expect(client.baseURL).toBe('https://api.dgrid.ai/v1');
        });
        it('honors a custom base url', () => {
          const client = createLlmClient({ DGRID_API_KEY: 'sk-test', DGRID_BASE_URL: 'https://example.test/v1' } as NodeJS.ProcessEnv);
          expect(client.baseURL).toBe('https://example.test/v1');
        });
        it('throws without an api key', () => {
          expect(() => createLlmClient({} as NodeJS.ProcessEnv)).toThrow(/DGRID_API_KEY/);
        });
        it('defaults to the cheapest claude model and honors overrides', () => {
          expect(getModel({} as NodeJS.ProcessEnv)).toBe('anthropic/claude-3.5-haiku');
          expect(getModel({ TOLLGATE_AGENT_MODEL: 'anthropic/claude-3.5-sonnet' } as NodeJS.ProcessEnv)).toBe('anthropic/claude-3.5-sonnet');
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/agent/src/llm.test.ts`
      Expected: FAIL — `createLlmClient` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/agent/src/llm.ts`:
      ```ts
      import OpenAI from 'openai';

      const DEFAULT_BASE_URL = 'https://api.dgrid.ai/v1';
      const DEFAULT_MODEL = 'anthropic/claude-3.5-haiku';

      export function createLlmClient(env: NodeJS.ProcessEnv = process.env): OpenAI {
        const apiKey = env.DGRID_API_KEY;
        if (!apiKey) throw new Error('Missing DGRID_API_KEY');
        const baseURL = env.DGRID_BASE_URL ?? DEFAULT_BASE_URL;
        return new OpenAI({ apiKey, baseURL });
      }

      export function getModel(env: NodeJS.ProcessEnv = process.env): string {
        return env.TOLLGATE_AGENT_MODEL ?? DEFAULT_MODEL;
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/agent/src/llm.test.ts`
      Expected: PASS — `4 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/agent/src/llm.ts packages/agent/src/llm.test.ts
      git commit -m "feat(agent): DGrid OpenAI-compatible LLM client"
      ```

---

### Task 4: `tools.ts` — paid-tool function schema + handlers

**Files:**
- Create: `packages/agent/src/tools.ts`
- Test:   `packages/agent/src/tools.test.ts`

**Depends on:** Task 2
**Effort:** medium
**Provides:**
- `const toolDefs: OpenAI.Chat.Completions.ChatCompletionTool[]` (3 function tools: `get_crypto_price`, `get_fx_rate`, `get_news_headlines`)
- `type ToolHandler = (args: Record<string, unknown>) => Promise<string>`
- `function createToolHandlers(tfetch: TollgateFetch, baseUrl: string): Record<string, ToolHandler>`

**Requires:**
```ts
// from this package (payAndRetry, Task 2):
export type TollgateFetch = (url: string, init?: RequestInit) => Promise<Response>;
// paid server routes (middleware plan): GET {baseUrl}/tools/crypto-price | /tools/fx-rate | /tools/news-headlines
```

- [ ] **Step 1: Write the failing test**
      `packages/agent/src/tools.test.ts`:
      ```ts
      import { describe, it, expect, vi } from 'vitest';
      import { toolDefs, createToolHandlers } from './tools';

      describe('agent tools', () => {
        it('declares three function tools', () => {
          const names = toolDefs.map((t) => t.function.name);
          expect(names).toEqual(['get_crypto_price', 'get_fx_rate', 'get_news_headlines']);
        });

        it('handlers call the tollgate fetch at the right path and return text', async () => {
          const tfetch = vi.fn().mockResolvedValue(new Response('{"priceUsd":3}', { status: 200 }));
          const handlers = createToolHandlers(tfetch, 'http://srv');
          const out = await handlers.get_crypto_price({});
          expect(out).toBe('{"priceUsd":3}');
          expect(tfetch).toHaveBeenCalledWith('http://srv/tools/crypto-price');
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/agent/src/tools.test.ts`
      Expected: FAIL — `toolDefs` / `createToolHandlers` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/agent/src/tools.ts`:
      ```ts
      import type OpenAI from 'openai';
      import type { TollgateFetch } from './payAndRetry';

      const noArgs = { type: 'object', properties: {}, additionalProperties: false } as const;

      export const toolDefs: OpenAI.Chat.Completions.ChatCompletionTool[] = [
        { type: 'function', function: { name: 'get_crypto_price', description: 'Get the latest SUI price in USD.', parameters: noArgs } },
        { type: 'function', function: { name: 'get_fx_rate', description: 'Get the latest USD/EUR FX rate.', parameters: noArgs } },
        { type: 'function', function: { name: 'get_news_headlines', description: 'Get current market news headlines.', parameters: noArgs } },
      ];

      export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;

      export function createToolHandlers(tfetch: TollgateFetch, baseUrl: string): Record<string, ToolHandler> {
        const call = async (path: string): Promise<string> => {
          const res = await tfetch(`${baseUrl}${path}`);
          return res.text();
        };
        return {
          get_crypto_price: () => call('/tools/crypto-price'),
          get_fx_rate: () => call('/tools/fx-rate'),
          get_news_headlines: () => call('/tools/news-headlines'),
        };
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/agent/src/tools.test.ts`
      Expected: PASS — `2 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/agent/src/tools.ts packages/agent/src/tools.test.ts
      git commit -m "feat(agent): paid-tool function schema and handlers"
      ```

---

### Task 5: `agentLoop.ts` — LLM tool-calling loop

**Files:**
- Create: `packages/agent/src/agentLoop.ts`
- Test:   `packages/agent/src/agentLoop.test.ts`

**Depends on:** Task 4
**Effort:** high
**Provides:**
- `interface AgentResult { report: string; toolCalls: number }`
- `interface RunAgentParams { llm: OpenAI; model: string; task: string; tools: OpenAI.Chat.Completions.ChatCompletionTool[]; handlers: Record<string, ToolHandler>; maxSteps?: number }`
- `async function runAgent(p: RunAgentParams): Promise<AgentResult>`

**Requires:**
```ts
// from this package (tools, Task 4):
export type ToolHandler = (args: Record<string, unknown>) => Promise<string>;
// openai: client.chat.completions.create({ model, messages, tools }) -> { choices: [{ message: { content, tool_calls? } }] }
//   a tool_call has { id, type:'function', function: { name, arguments } }
//   feed results back as { role:'tool', tool_call_id, content }
```

- [ ] **Step 1: Write the failing test**
      `packages/agent/src/agentLoop.test.ts`:
      ```ts
      import { describe, it, expect, vi } from 'vitest';
      import type OpenAI from 'openai';
      import { runAgent } from './agentLoop';

      describe('runAgent', () => {
        it('executes a tool call then returns the final report', async () => {
          const create = vi.fn()
            .mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: null, tool_calls: [{ id: 't1', type: 'function', function: { name: 'get_crypto_price', arguments: '{}' } }] } }] })
            .mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'Report: SUI looks healthy.' } }] });
          const llm = { chat: { completions: { create } } } as unknown as OpenAI;
          const getPrice = vi.fn().mockResolvedValue('{"priceUsd":3}');

          const result = await runAgent({ llm, model: 'm', task: 'compile a report', tools: [], handlers: { get_crypto_price: getPrice } });

          expect(result.toolCalls).toBe(1);
          expect(result.report).toContain('Report');
          expect(getPrice).toHaveBeenCalledTimes(1);
          expect(create).toHaveBeenCalledTimes(2);
        });

        it('returns immediately when the model emits no tool calls', async () => {
          const create = vi.fn().mockResolvedValueOnce({ choices: [{ message: { role: 'assistant', content: 'Done.' } }] });
          const llm = { chat: { completions: { create } } } as unknown as OpenAI;
          const result = await runAgent({ llm, model: 'm', task: 't', tools: [], handlers: {} });
          expect(result).toEqual({ report: 'Done.', toolCalls: 0 });
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/agent/src/agentLoop.test.ts`
      Expected: FAIL — `runAgent` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/agent/src/agentLoop.ts`:
      ```ts
      import type OpenAI from 'openai';
      import type { ToolHandler } from './tools';

      export interface AgentResult {
        report: string;
        toolCalls: number;
      }

      export interface RunAgentParams {
        llm: OpenAI;
        model: string;
        task: string;
        tools: OpenAI.Chat.Completions.ChatCompletionTool[];
        handlers: Record<string, ToolHandler>;
        maxSteps?: number;
      }

      function safeParse(s: string): Record<string, unknown> {
        try {
          return JSON.parse(s) as Record<string, unknown>;
        } catch {
          return {};
        }
      }

      export async function runAgent(p: RunAgentParams): Promise<AgentResult> {
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
          { role: 'system', content: 'You are a market-research agent. Use the provided paid tools to gather data, then write a concise report.' },
          { role: 'user', content: p.task },
        ];
        const maxSteps = p.maxSteps ?? 8;
        let toolCalls = 0;

        for (let step = 0; step < maxSteps; step++) {
          const resp = await p.llm.chat.completions.create({ model: p.model, messages, tools: p.tools });
          const choice = resp.choices[0];
          if (!choice) throw new Error('LLM returned no choices');
          const msg = choice.message;

          const calls = msg.tool_calls ?? [];
          if (calls.length === 0) {
            return { report: msg.content ?? '', toolCalls };
          }

          messages.push({ role: 'assistant', content: msg.content ?? '', tool_calls: msg.tool_calls });
          for (const tc of calls) {
            if (tc.type !== 'function') continue;
            const handler = p.handlers[tc.function.name];
            const content = handler ? await handler(safeParse(tc.function.arguments)) : `error: unknown tool ${tc.function.name}`;
            toolCalls++;
            messages.push({ role: 'tool', tool_call_id: tc.id, content });
          }
        }
        return { report: '', toolCalls };
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/agent/src/agentLoop.test.ts`
      Expected: PASS — `2 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/agent/src/agentLoop.ts packages/agent/src/agentLoop.test.ts
      git commit -m "feat(agent): LLM tool-calling loop"
      ```

---

### Task 6: `runDemo.ts` — the money-shot entry (human-run live)

**Files:**
- Create: `packages/agent/src/runDemo.ts`
- Test:   `packages/agent/src/runDemo.test.ts`

**Depends on:** Task 2, Task 3, Task 4, Task 5, Task 3 of shared plan (`shared:3`), Task 4 of shared plan (`shared:4`)
**Effort:** medium
**Provides:**
- `function explorerTxUrl(network: string, digest: string): string`
- `function keypairFromEnv(pk: string): Ed25519Keypair`
- `async function main(): Promise<void>` (wires keypair + Sui client + DGrid LLM + tools; runs the agent; logs receipts + Explorer links). Guarded so importing the module does not execute `main`.

**Requires:**
```ts
// from this package: createTollgateFetch (Task 2), createLlmClient/getModel (Task 3), toolDefs/createToolHandlers (Task 4), runAgent (Task 5), AGENT_NAME (Task 1)
// from shared: loadConfig (shared:3), getSuiClient (shared:4)
// @mysten/sui: Ed25519Keypair.fromSecretKey(Uint8Array); decodeSuiPrivateKey(suiprivkey) -> { secretKey }; Ed25519Keypair.generate()/.getSecretKey()/.toSuiAddress()
```

- [ ] **Step 1: Write the failing test**
      `packages/agent/src/runDemo.test.ts`:
      ```ts
      import { describe, it, expect } from 'vitest';
      import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
      import { explorerTxUrl, keypairFromEnv } from './runDemo';

      describe('runDemo helpers', () => {
        it('builds a Suiscan tx url for the network', () => {
          expect(explorerTxUrl('testnet', '0xabc')).toBe('https://suiscan.xyz/testnet/tx/0xabc');
        });
        it('reconstructs a keypair from a suiprivkey string', () => {
          const kp = Ed25519Keypair.generate();
          const pk = kp.getSecretKey(); // ephemeral, generated in-test — not a real secret
          expect(keypairFromEnv(pk).toSuiAddress()).toBe(kp.toSuiAddress());
        });
      });
      ```
- [ ] **Step 2: Run to confirm it fails**
      Run: `npx vitest run packages/agent/src/runDemo.test.ts`
      Expected: FAIL — `explorerTxUrl` / `keypairFromEnv` undefined.
- [ ] **Step 3: Minimal implementation**
      `packages/agent/src/runDemo.ts`:
      ```ts
      import { pathToFileURL } from 'node:url';
      import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
      import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
      import { loadConfig } from '@tollgate/shared/config';
      import { getSuiClient } from '@tollgate/shared/client';
      import { createTollgateFetch } from './payAndRetry';
      import { createLlmClient, getModel } from './llm';
      import { toolDefs, createToolHandlers } from './tools';
      import { runAgent } from './agentLoop';
      import { AGENT_NAME } from './banner';

      export function explorerTxUrl(network: string, digest: string): string {
        return `https://suiscan.xyz/${network}/tx/${digest}`;
      }

      export function keypairFromEnv(pk: string): Ed25519Keypair {
        const { secretKey } = decodeSuiPrivateKey(pk);
        return Ed25519Keypair.fromSecretKey(secretKey);
      }

      export async function main(): Promise<void> {
        const cfg = loadConfig();
        const pk = process.env.AGENT_PK;
        if (!pk) throw new Error('Missing AGENT_PK');
        const baseUrl = process.env.TOLLGATE_SERVER_URL ?? 'http://localhost:8402';

        const keypair = keypairFromEnv(pk);
        const suiClient = getSuiClient({ rpcUrl: cfg.rpcUrl });
        console.log(`${AGENT_NAME} @ ${keypair.toSuiAddress()} → ${baseUrl}`);

        const tfetch = createTollgateFetch({
          keypair,
          suiClient,
          packageId: cfg.packageId,
          onPayment: (i) => console.log(`  paid ${i.amount} for ${i.url} → ${explorerTxUrl(cfg.network, i.digest)}`),
        });
        const llm = createLlmClient();
        const handlers = createToolHandlers(tfetch, baseUrl);
        const result = await runAgent({
          llm,
          model: getModel(),
          task: 'Compile a live market report using the available paid tools (crypto price, FX rate, and news).',
          tools: toolDefs,
          handlers,
        });

        console.log('\n=== REPORT ===\n' + result.report);
        console.log(`\nTotal on-chain micropayments: ${result.toolCalls}`);
      }

      if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
        main().catch((e: unknown) => {
          console.error(e);
          process.exitCode = 1;
        });
      }
      ```
- [ ] **Step 4: Run to confirm it passes** *(THIS IS THE GATE)*
      Run: `npx vitest run packages/agent/src/runDemo.test.ts`
      Expected: PASS — `2 passed`.
- [ ] **Step 5: Commit**
      ```bash
      git add packages/agent/src/runDemo.ts packages/agent/src/runDemo.test.ts
      git commit -m "feat(agent): money-shot demo runner"
      ```

---

### Task 7: Strict typecheck gate for `@tollgate/agent`

**Files:**
- Modify: `packages/agent/package.json` (confirm `typecheck` script present)

**Depends on:** Task 2, Task 3, Task 4, Task 5, Task 6
**Effort:** low
**Provides:** a green `tsc --noEmit` over the whole package (strict-TS backstop)
**Requires:** all `@tollgate/agent` source from Tasks 1–6

- [ ] **Step 1: Confirm the typecheck script exists** (`"typecheck": "tsc --noEmit"` was added in Task 1).
- [ ] **Step 2: Run the strict typecheck** *(THIS IS THE GATE)*
      Run: `npx tsc -p packages/agent/tsconfig.json --noEmit`
      Expected: PASS — command exits 0 with no error output.
- [ ] **Step 3: Commit** (only if Step 1 changed the file; otherwise skip)
      ```bash
      git add packages/agent/package.json
      git commit -m "chore(agent): strict typecheck gate"
      ```
