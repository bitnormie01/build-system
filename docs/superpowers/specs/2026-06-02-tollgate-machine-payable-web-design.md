# Tollgate — Machine-Payable Web on Sui — Design Spec

**Status:** Approved (design gate passed 2026-06-02; three open decisions resolved with the builder).
**Source brief:** `docs/idea-forge/2026-06-01-tollgate-machine-payable-web-brief.md`
**Event:** Sui Overflow 2026 (Mysten Labs) — https://www.deepsurge.xyz/hackathons/b587dc0c-4cb8-4e63-ada5-519df38103bf
**Primary track:** The Agentic Web. **Secondary framing:** DeFi & Payments.

## Constraints (verbatim, non-negotiable)

- **Chain:** Sui **testnet**. Project must deploy on-chain and surface its own **Package ID**.
- **Money:** testnet stablecoin. **Demo default = our own mintable mock USD (`mUSD`, 6 decimals)**; the
  on-chain module is **generic over `Coin<T>`** so real Circle testnet USDC
  (`0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC`) works by swapping
  one type argument. Mock USD is chosen because Circle's faucet is rate-limited (20 USDC / 2h / address),
  which would throttle funding multiple agent wallets and repeated demo runs.
- **Language/runtime:** TypeScript everywhere (Node ≥ 20, ESM, `strict`). Minimal Sui Move (Move 2024 edition).
- **LLM provider for the demo agent:** **DGrid** — a decentralized, OpenAI-compatible inference gateway
  (`https://api.dgrid.ai/v1`, Bearer auth, OpenRouter-style `provider/model` IDs). Use the `openai` SDK
  pointed at DGrid's `baseURL`. Key + base URL + model via env (`DGRID_API_KEY`, `DGRID_BASE_URL`,
  `TOLLGATE_AGENT_MODEL`); the model defaults to the **cheapest Claude** (haiku-class, e.g.
  `anthropic/claude-3.5-haiku`) and is env-configurable so the exact catalog ID is never hardcoded.
  **Never hardcode secrets.**
- **Deadline:** Handbook says June 21, 2026; DeepSurge shows June 20, 2026 (Pacific). **Plan to June 20**
  as the safe target. *Human-gate todo:* confirm exact cutoff in the DeepSurge submission UI.
- **Team:** solo builder + AI executor pool. Builder runs both the paid services and the agent, so the
  money shot is fully controllable end-to-end; no external blocker.

## Executive summary

AI agents can read and call the whole web but cannot **pay** for any of it — every paid API is
human-gated (accounts, API keys, cards) and Stripe can't do accountless, sub-cent, instant, global
settlement. **Tollgate is a machine-payable web rail on Sui.** A provider wraps any endpoint in
Tollgate middleware. An autonomous agent that calls it gets **HTTP 402 + a Sui payment intent**; the
agent's SDK **auto-pays a stablecoin micropayment on-chain from its own wallet**, retries with the
on-chain receipt as proof, and gets the response. No accounts, no API keys, no Stripe. The on-chain
`PaymentReceipt` event **is** the access credential. A provider can `withdraw` accrued earnings at any time.

## Goals

1. A one-line-adoption **Express 402 middleware** that gates a route on a verified on-chain payment.
2. An **agent auto-pay SDK** (`payAndRetry`) that turns a 402 into a signed Sui micropayment + retry,
   fully autonomously, used inside a **real LLM tool-use loop**.
3. A **thin Sui Move `tollgate` module** deployed to testnet (its own Package ID): register a metered
   resource, pay into it (emitting a verifiable `PaymentReceipt`), and capability-gated withdraw.
4. A **real-time React dashboard** visualizing 402 → payment → receipt → withdraw, driven by on-chain events.
5. A **fully controllable money shot:** one autonomous agent makes **3 real on-chain micropayments**
   across 3 paid tools in seconds, each a verifiable receipt on Sui Explorer, then the provider withdraws.

## Non-goals (deliberately out of scope — protects the money shot)

- No TEE / verifiable-compute proof that the provider served correct data (v1 trusts provider post-payment).
- No refunds, disputes, or escrow-with-arbitration — payment is for access, atomic and final in v1.
- No agent identity / reputation / KYC — the agent is just a wallet.
- No marketplace / discovery UI / provider directory / ratings — Tollgate is the rail, not a storefront.
- No payment channels / batching in v1 — pay-per-request keeps the demo legible (channels = future work).
- No mainnet / real money, no token, no LLM training. The agent loop is intentionally thin.
- No on-chain replay registry in v1 — nonce consumption is middleware-side (on-chain registry = future work).

## The money shot (acceptance demo, ~15s the judge remembers)

An autonomous AI agent is given: *"Compile a live market report using these three paid data tools."*
On screen it calls each tool, hits **402 Payment Required**, and **pays its own way: three real `mUSD`
micropayments fire on Sui in seconds**, each a `PaymentReceipt` opening on Sui Explorer; the agent
assembles the report. No human clicked anything, no API keys, no Stripe. **Closer:** the provider clicks
"Withdraw" (or runs the withdraw script) and pulls its real on-chain earnings; the dashboard balance updates.

---

## Architecture

### Monorepo layout (npm workspaces)

```
tollgate/
├── package.json                 # workspaces root; shared dev deps; scripts
├── tsconfig.base.json           # strict, ESM, path alias @tollgate/shared → packages/shared/src
├── vitest.workspace.ts          # discovers package vitest configs
├── move/
│   └── tollgate/                # Sui Move package (Move.toml, sources/, tests/)
├── packages/
│   ├── shared/                  # @tollgate/shared — types, Sui client, PTB builders, receipt reader
│   ├── middleware/              # @tollgate/middleware — tollgate() 402 middleware + demo paid server
│   ├── agent/                   # @tollgate/agent — payAndRetry SDK + LLM tool-use loop + demo runner
│   ├── dashboard/               # @tollgate/dashboard — React/Vite real-time visualizer
│   └── deploy-demo/             # @tollgate/deploy-demo — publish, register, fund, withdraw scripts (human-gated runs)
└── README.md                    # root — setup, architecture, Package ID, Judging Quickstart
```

`@tollgate/shared` is consumed via a TypeScript path alias (`tsconfig.base.json` `paths`) so every
package type-checks and unit-tests against shared **source** with no pre-build step; the dashboard
resolves the same alias via `vite-tsconfig-paths`. This keeps packages independently buildable by
stateless executors in any order.

### Subsystems → plan files

| # | Subsystem | Package(s) | Depends on | Plan file |
|---|-----------|-----------|-----------|-----------|
| 1 | **move** | `move/tollgate` | — | `plans/2026-06-02-tollgate-move.md` |
| 2 | **shared** | `packages/shared` | move ABI | `plans/2026-06-02-tollgate-shared.md` |
| 3 | **middleware** | `packages/middleware` | shared | `plans/2026-06-02-tollgate-middleware.md` |
| 4 | **agent** | `packages/agent` | shared | `plans/2026-06-02-tollgate-agent.md` |
| 5 | **dashboard** | `packages/dashboard` | shared | `plans/2026-06-02-tollgate-dashboard.md` |
| 6 | **deploy-demo** | `deploy-demo`, root README | shared, middleware, agent, move | `plans/2026-06-02-tollgate-deploy-demo.md` |

---

## The Tollgate protocol

### 1. Unpaid request → 402 challenge

A request to a gated route without a valid `X-Tollgate-Payment` header gets:

```
HTTP/1.1 402 Payment Required
Content-Type: application/json
WWW-Authenticate: Tollgate

{
  "resourceId":  "0x<MeteredResource object id>",
  "packageId":   "0x<tollgate package id>",
  "coinType":    "0x<pkg>::mock_usd::MOCK_USD",
  "price":       "1000",                  // u64 base units, decimal string (0.001 mUSD @ 6 decimals)
  "recipient":   "0x<resource owner addr>",
  "nonce":       "a1b2…f0",               // hex, server-issued, single-use
  "expiresAt":   1750000000000            // epoch ms; challenge TTL
}
```

The server stores `nonce → { resourceId, expiresAt, consumed:false }` in a TTL nonce store.

### 2. Agent pays on-chain

The agent builds a PTB calling `tollgate::pay<MOCK_USD>(resource, coin, nonce, clock)` where `coin` has
`value ≥ price` and `nonce` is the challenge nonce as bytes. It signs with **its own keypair**, submits,
and waits for finality (`showEvents:true`). Sui emits `PaymentReceipt`.

### 3. Retry with proof

```
GET /tools/crypto-price
X-Tollgate-Payment: <txDigest>
```

### 4. Middleware verifies (authoritative on-chain read)

The middleware calls `getTransactionBlock({ digest, options:{ showEvents:true }})` and accepts iff **all**
hold:
- the tx contains a `PaymentReceipt` event from this `packageId`,
- `receipt.resource_id == challenge.resourceId`,
- `receipt.amount >= price`,
- `bytesToHex(receipt.nonce) == challenge.nonce`,
- the nonce exists in the store, is **unconsumed**, and **not expired**,
- (the tx executed successfully).

On success it marks the nonce `consumed` and calls `next()`. On failure it returns `402` (no/invalid
proof) or `403` (proof present but invalid: wrong resource, underpaid, replayed, expired) with a JSON reason.

**Why this design:** the digest is the trust-minimizing input — the middleware independently re-reads the
chain rather than trusting any agent-supplied receipt body. The server-issued nonce binds a payment to a
specific challenge and prevents replay. Settlement, the access credential, and withdraw all live on Sui.

---

## Component specs

### C1. Move package `tollgate` (testnet)

One package, two modules. Move 2024 edition. **Target: own Package ID on testnet.**

#### Module `tollgate::tollgate`

Structs:
- `MeteredResource<phantom T> has key` — `{ id: UID, owner: address, price: u64, balance: Balance<T> }`,
  a **shared** object.
- `OwnerCap has key, store` — `{ id: UID, resource_id: ID }`, transferred to the registrant.
- `PaymentReceipt has copy, drop` (event) — `{ resource_id: ID, payer: address, amount: u64,
  nonce: vector<u8>, timestamp_ms: u64 }`.
- `ResourceRegistered has copy, drop` (event) — `{ resource_id: ID, owner: address, price: u64 }`.

Errors: `EInsufficientPayment = 0`, `ENotOwner = 1`, `EInsufficientBalance = 2`.

Entries:
- `register_resource<T>(price: u64, ctx)` → creates `MeteredResource<T>` with zero balance, shares it,
  mints an `OwnerCap` to sender, emits `ResourceRegistered`.
- `pay<T>(resource: &mut MeteredResource<T>, payment: Coin<T>, nonce: vector<u8>, clock: &Clock, ctx)` →
  asserts `coin::value(&payment) >= resource.price` (else `EInsufficientPayment`), joins payment into
  `resource.balance`, emits `PaymentReceipt`.
- `withdraw<T>(resource: &mut MeteredResource<T>, cap: &OwnerCap, amount: u64, ctx)` → asserts
  `cap.resource_id == object::id(resource)` (else `ENotOwner`) and sufficient balance (else
  `EInsufficientBalance`), takes `amount` from balance, transfers the coin to `ctx.sender()`.

Public views (for SDK/tests): `price<T>(&MeteredResource<T>): u64`, `balance_value<T>(&MeteredResource<T>): u64`,
`owner<T>(&MeteredResource<T>): address`.

#### Module `tollgate::mock_usd` (demo coin)

- `MOCK_USD has drop` — one-time witness.
- `init(witness, ctx)` → `coin::create_currency(witness, 6, b"mUSD", b"Tollgate Mock USD", <desc>,
  option::none(), ctx)`; freezes metadata; transfers `TreasuryCap<MOCK_USD>` to publisher.
- `mint(treasury: &mut TreasuryCap<MOCK_USD>, amount: u64, recipient: address, ctx)` → mints and transfers.

Tests (`sui move test`): register emits + shares; pay credits balance and emits receipt; pay below price
aborts `EInsufficientPayment`; withdraw with wrong cap aborts `ENotOwner`; withdraw moves funds; mock_usd
mint produces a coin of the right value.

### C2. `packages/shared` (`@tollgate/shared`)

The single, centralized Sui integration surface (per the SDK checklist: centralize tx construction,
keep direct chain reads for confirmation-critical state). Named exports only.

- `config.ts` — `loadConfig()` reads & validates env (zod): `SUI_NETWORK` (`testnet`), `SUI_RPC_URL`
  (default testnet fullnode), `TOLLGATE_PACKAGE_ID`, `MUSD_COIN_TYPE`, and (for tooling) optional
  `RESOURCE_IDS`. Throws a clear error naming the missing var.
- `client.ts` — `getSuiClient(cfg): SuiClient` (from `@mysten/sui/client`).
- `types.ts` — `PaymentChallenge`, `ResourceConfig`, `PaymentReceiptEvent`, `VerifyResult`.
- `ptb.ts` — `buildRegisterTx`, `buildPayTx`, `buildWithdrawTx` (return `Transaction` from
  `@mysten/sui/transactions`). `buildPayTx` takes `{ packageId, coinType, resourceObjectId, coin, nonce }`
  and adds `moveCall` to `${packageId}::tollgate::pay` with the clock object `0x6`.
- `coins.ts` — `prepareExactCoin(tx, client, owner, coinType, amount)` selects/splits a coin of the coin
  type to exactly `amount` for use as the `pay` argument (handles merge+split via PTB).
- `receipts.ts` — `readReceiptFromDigest(client, digest, packageId): PaymentReceiptEvent | null` (parses
  the `PaymentReceipt` event), `bytesToHex`/`hexToBytes`, and
  `verifyReceipt(receipt, challenge): VerifyResult` (the pure predicate used by the middleware).

### C3. `packages/middleware` (`@tollgate/middleware`)

- `nonceStore.ts` — `NonceStore` interface (`issue(resourceId, ttlMs): {nonce, expiresAt}`,
  `validateAndConsume(nonce, resourceId): 'ok'|'unknown'|'expired'|'consumed'`) + `InMemoryNonceStore`.
- `tollgate.ts` — `tollgate(opts: TollgateOptions): RequestHandler`. `opts = { suiClient, packageId,
  resource: ResourceConfig (resourceId, coinType, price, recipient), nonceStore?, challengeTtlMs? }`.
  No header → issue nonce, 402 + challenge. Header → read digest, `verifyReceipt`, consume nonce,
  `next()`; else 402/403 + reason.
- `paidServer.ts` + `tools/*.ts` — the demo provider: an Express app with 3 gated routes, each returning
  **self-contained, server-generated data** (no third-party API): `GET /tools/crypto-price`,
  `GET /tools/fx-rate`, `GET /tools/news-headlines`. Each route wrapped with its own `tollgate(...)`
  using a distinct resource + sub-cent price. Plus `GET /healthz` (unpaid). Reads resource config + RPC
  from env (written by deploy).

### C4. `packages/agent` (`@tollgate/agent`)

- `payAndRetry.ts` — `createTollgateFetch(deps): (url, init?) => Promise<Response>`. `deps = { keypair:
  Ed25519Keypair, suiClient, packageId }`. On a 402 it parses the challenge, uses `shared` to build the
  `pay<coinType>` PTB with an exact coin, signs & executes (`signAndExecuteTransaction`,
  `showEvents:true`), waits for finality, then retries the original request with `X-Tollgate-Payment:
  <digest>`. Surfaces typed errors: `InsufficientBalanceError`, `ChallengeExpiredError`,
  `VerificationRejectedError`.
- `llm.ts` — `createLlmClient(env)` returns an `openai` `OpenAI` instance configured with
  `apiKey: DGRID_API_KEY`, `baseURL: DGRID_BASE_URL` (default `https://api.dgrid.ai/v1`); plus
  `getModel(env)` reading `TOLLGATE_AGENT_MODEL` (default `anthropic/claude-3.5-haiku`).
- `tools.ts` — declares the agent's tool schema (the 3 paid endpoints) in OpenAI function-calling
  format; each handler calls the tollgate fetch.
- `agentLoop.ts` — `runAgent({ llm, model, task, tools }): Promise<AgentResult>` — a real
  `chat.completions.create` tool-calling loop: model emits `tool_calls` → handlers auto-pay via
  `payAndRetry` → `role:"tool"` results fed back → until the model emits the final report. Model + key
  from env.
- `runDemo.ts` — wires keypair (from `AGENT_PK` env), Sui client, the DGrid LLM client, and the canned
  task; logs each 402 → payment → receipt with an Explorer URL; returns the assembled report. (The live
  run is human-gated.) *Aside: DGrid itself ships an x402 pay-per-call standard — independent of
  Tollgate's Sui-native rail, but a tidy echo of the same "machine pays per request" thesis.*

### C5. `packages/dashboard` (`@tollgate/dashboard`)

React + Vite single screen, **driven entirely by on-chain events** (single source of truth): polls
`client.queryEvents` for `${packageId}::tollgate::PaymentReceipt` and `ResourceRegistered` with a cursor,
renders a live timeline of payments (payer, amount, resource, nonce, ts) each linking to Sui Explorer,
shows per-resource accrued totals, and a provider "earnings / withdraw" panel reflecting on-chain balance.
Config (packageId, RPC, network) via Vite env (`VITE_*`). No secrets in the client.

### C6. `deploy-demo` + root README

Scripts (TS, run with `tsx`), each authored test-first against a **mocked** `SuiClient`/keypair (the gate
is the mocked unit test); the **actual broadcasts are human-gated** runbook steps (see Deployment):
- `publish.ts` — wraps `sui client publish`, parses output, writes `deployment.json` (packageId,
  treasuryCap id, mUSD coin type) and an `.env` fragment.
- `register.ts` — builds + (human-)submits 3 `register_resource<MOCK_USD>` txs at set prices, records
  resource ids + owner cap ids.
- `fund.ts` — builds `mint` txs to fund agent wallet(s) with mUSD + transfers SUI for gas.
- `withdraw.ts` — builds the provider `withdraw<MOCK_USD>` tx.
- `moneyShot.ts` — top-level orchestration that runs the agent demo end-to-end and prints receipts +
  Explorer links (human-gated; moves real testnet funds).
- Root `README.md` — setup, architecture diagram, **Package ID**, **Judging Quickstart** (exact
  commands + links), why-Sui statement, what-was-built-during-hackathon, deadline note.

---

## End-to-end data flow

```
[Dashboard] ──polls queryEvents(PaymentReceipt, ResourceRegistered)──► [Sui testnet]
                                                                            ▲
[LLM loop] ─tool call─► [payAndRetry] ─GET /tool─► [middleware] ─402+nonce─┐│
     ▲                       │                                              ││
     │                       └─build pay<T>(coin,nonce)+sign+submit────────►┘│ emits PaymentReceipt
     │                       ◄────────────── txDigest ──────────────────────┘
     │                       └─GET /tool  X-Tollgate-Payment: digest─► [middleware]
     │                                          │ getTransactionBlock(digest, showEvents) ──► verify
     └──────────── tool_result (data) ◄─ 200 ◄──┘ consume nonce
(closer) [provider] ─withdraw<T>(cap, amount)─► [Sui testnet] ─► funds to owner; dashboard balance updates
```

## Error handling

- **Move:** `EInsufficientPayment` (underpay), `ENotOwner` (withdraw w/o matching cap),
  `EInsufficientBalance` (over-withdraw) — all aborts with stable codes.
- **Middleware:** missing/garbled `X-Tollgate-Payment` → `402` + fresh challenge. Proof present but
  invalid (wrong resource, underpaid, unknown/expired/consumed nonce, failed tx) → `403` + JSON reason.
  RPC read failure → `503` (retryable). Never serves the resource without an accepted on-chain receipt.
- **Agent:** insufficient balance → `InsufficientBalanceError` (demo funds first). Expired challenge →
  one re-request of the original URL. `403` on retry → `VerificationRejectedError` carrying the reason.
- **Config:** any missing env var → fail fast at boot with the variable name.

## Security & key safety (non-negotiable)

- **No private key, mnemonic, or secret in any file, plan, prompt, commit, or log.** Keys are referenced
  only by env-var name: `AGENT_PK`, `DEPLOYER_PK`/Sui CLI keystore, `DGRID_API_KEY`. `.env` is
  git-ignored; `.env.example` lists names with empty values (`DGRID_BASE_URL` and `TOLLGATE_AGENT_MODEL`
  carry safe non-secret defaults).
- A key exposed anywhere is **burned** — rotate, never reuse.
- **All key-operation / fund-moving / broadcasting steps are `human-gate: true`.** The executor pool
  authors and unit-tests the scripts (mocked client); a human runs the real publish/register/fund/demo/
  withdraw. Executors never broadcast signed transactions or move funds autonomously.
- Dashboard is read-only and ships no secrets (`VITE_*` public config only).

## Testing strategy

- **Move:** `sui move test` (unit, `test_scenario`) covering register/pay/withdraw happy + abort paths;
  `sui move build` must succeed. Gate per task = the specific test or build.
- **TS (shared/middleware/agent):** `vitest`, `strict`, **no `as any`** (use `as unknown as T`). Unit
  tests mock `SuiClient` (e.g., stub `getTransactionBlock`/`queryEvents`/`signAndExecuteTransaction`) so
  verification, PTB building, nonce store, and `payAndRetry` control flow are tested without the network.
- **Integration (optional, human-gated):** a single testnet round-trip (pay → verify → 200) behind an
  env flag, not in the default gate set.
- **E2E money shot:** the human-run `moneyShot.ts` against testnet.
- Each manifest task carries exactly one deterministic gate command with expected output.

## Deployment & human-gates

Order (human-run; documented in README "Judging Quickstart"):
1. `sui client publish move/tollgate` → capture **Package ID**, `TreasuryCap`, `MOCK_USD` type → `deployment.json`.
2. `register.ts` → 3 `MeteredResource`s + owner caps.
3. `fund.ts` → mint mUSD + send SUI gas to agent wallet(s).
4. Start `paidServer` + `dashboard`.
5. `moneyShot.ts` → agent runs the task; 3 payments fire; receipts on Explorer.
6. `withdraw.ts` → provider pulls earnings.

Steps 1–3, 5, 6 broadcast txs / move funds → **human-gate**. Confirm the submission cutoff (June 20 vs 21)
in the DeepSurge UI before the final tag.

## Tech stack & versions

- Node ≥ 20, TypeScript `^5.6`, ESM, `strict`. Test: `vitest ^2.1`. Script runner: `tsx ^4.19`.
- Sui SDK: `@mysten/sui ^2.17.0` (`/client`, `/transactions`, `/keypairs/ed25519`, `/utils`).
- Env/validation: `zod ^3.23`.
- Server: `express ^4.21` (+ `cors ^2.8`).
- Agent LLM: `openai ^6.41.0` (OpenAI-compatible client pointed at **DGrid**, `https://api.dgrid.ai/v1`,
  Bearer auth, OpenRouter-style `provider/model` IDs).
- Dashboard: `react ^18.3`, `react-dom ^18.3`, `vite ^6.0`, `@vitejs/plugin-react ^4.3`,
  `vite-tsconfig-paths ^5.1`.
- Move: Sui CLI (Move 2024 edition), `Sui` framework dep pinned to the `testnet` branch in `Move.toml`.

## Open risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Testnet RPC latency on the verify read | Agent waits for finality before retry; middleware reads by digest (already final); 503+retry on transient RPC error. |
| Coin selection / gas for exact payment | `prepareExactCoin` merges+splits in the PTB; fund script tops up SUI gas + mUSD. |
| DGrid API/key/model-ID issues during live demo | Thin loop; key+baseURL+model via env; model ID is config (verify exact cheapest-Claude ID in DGrid's catalog before demo); pre-run dry pass; fallback canned task input. |
| `@mysten/sui` API drift across 2.x minors | Pin `^2.17.0`; centralize all SDK calls in `shared` so any fix is one place. |
| Deadline ambiguity (Jun 20 vs 21) | Target Jun 20; human-confirm in submission UI; submit early. |
| nonce store lost on server restart mid-demo | Single long-lived server process for the demo; note Redis/on-chain registry as future work. |

## Submission mapping (judging weights)

- **Real-world application (50%)** — *any* existing API adopts Tollgate in one line and instantly sells
  to the whole agent economy; the missing accountless per-request rail, impossible on Stripe/Web2.
- **Product/UX (20%)** — one-line middleware adoption; the dashboard makes the invisible rail visible in
  real time.
- **Technical implementation (20%)** — meaningful Sui usage: settlement + the access credential + withdraw
  are on-chain; generic `Coin<T>` module; capability-gated withdraw; authoritative on-chain verification.
- **Presentation/vision (10%)** — the 15-second autonomous-agent money shot + the withdraw closer; clear
  "machine-payable web" thesis and channel/identity roadmap.

**Why-Sui (state in submission):** sub-cent, accountless, ~sub-second-finality, global stablecoin
micropayments with an on-chain access receipt — unachievable on Stripe/Web2; Sui's low fees and parallel
execution make per-request payment viable.
