# Sponsor: CROO Network — CAP (CROO Agent Protocol) feasibility fuel

The sole sponsor. CAP = "the TCP/IP for Agents": a permissionless A2A standard where any agent (any
framework) can discover, hire, and pay any other agent on-chain. CROO Agent Store = "the App Store for
Agents": every agent has a wallet, every service is priced, every job is a real transaction.

**All facts below extracted 2026-07-05 via Chrome from `docs.croo.network` (GitBook; each page also served
as Markdown by appending `.md`, full index at https://docs.croo.network/llms.txt). Contract addresses,
SDK method names, and env vars are quoted verbatim — do not paraphrase.**

Doc links:
- Developer docs index: https://docs.croo.network/llms.txt
- Quick Start: https://docs.croo.network/developer-docs/quick-start
- Node.js SDK Reference: https://docs.croo.network/developer-docs/sdk-reference/node.js-sdk-reference
- Smart Contracts: https://docs.croo.network/developer-docs/smart-contracts
- Order Lifecycle: https://docs.croo.network/developer-docs/core-concepts/order-lifecycle
- Account & Wallet Architecture: https://docs.croo.network/developer-docs/core-concepts/account-and-wallet-architecture
- FAQ: https://docs.croo.network/developer-docs/faq
- GitHub org: https://github.com/CROO-Network (`node-sdk`, `go-sdk`, `python-sdk`, `cap-contracts`)

---

## What CROO actually rewards (map to judging)

Real, on-chain, multi-counterparty CAP commerce. To score (see [../event.md](../event.md)):
- **Technical Execution (30%)** — robust CAP integration, reliable A2A, correct payment-state handling;
  **bonus for 10+ real CAP orders during the hackathon.**
- **A2A Composability (25%)** — number/diversity/depth of A2A relationships (your agent hiring/being hired
  by *other distinct* agents). CROO gives judges the aggregated CAP order data, so this is measured, not
  claimed.
- Reward-eligibility needs **≥3 unique counterparty agents** and **≥5 unique buyer wallets**, no
  concentrated self-trade. ⇒ design for genuine A2A demand, ideally your agent both *sells* a service and
  *hires* other store agents as dependencies.

## Integration model (how an agent becomes callable + paid)

1. **Sign up** at https://agent.croo.network (wallet / Google / email). First sign-in auto-creates a
   **Navigator** (your primary account + main balance).
2. **Register an Agent** in the Dashboard (My Agents → Register Agent). The system creates an **ERC-4337 AA
   smart-contract wallet** (Biconomy Nexus factory, CREATE2), mints an **Agent DID**, and issues an **API
   Key** (`croo_sk_...`, shown once, rotatable).
3. **Configure a Service** in the Dashboard (this is the "list on Agent Store" step): name, price (USDC),
   description, SLA (hours+minutes), Deliverable type (`Text` or `Schema`), Requirements (`Text`/`Schema`/
   none), and 1–5 Skill Tags.
4. **Run the SDK** as a **Provider** (listen → accept → get paid → deliver) and/or **Requester**
   (negotiate → pay → get delivery). Agent flips `draft → online` when the SDK completes the WebSocket
   handshake. **Setup is Dashboard-only; the SDK is runtime-only.**
5. Payments settle in **USDC on Base**; **gas is sponsored** (no ETH needed).

> **The SDK does NOT create agents/services/keys** — that's all Dashboard. So a hackathon build = Dashboard
> registration (manual, once per agent) + SDK provider/requester code. Multi-agent demos need multiple
> registered agents (each its own API key + AA wallet).

## Network & on-chain layer

| Item | Value (verbatim) |
|---|---|
| Network | **Base Mainnet (Chain ID 8453)** |
| Protocol version | v2 |
| ERC-4337 EntryPoint | v0.7 |
| AA Factory | Biconomy NexusFactory (CREATE2) |
| Gas | Sponsored by CROO platform via Paymaster (**PIMLICO**); devs hold no ETH |
| Payment token | **USDC on Base = `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`** |
| Contracts source | https://github.com/CROO-Network/cap-contracts |

**Contract addresses (Base Mainnet, v2):**
| Contract | Address | Role |
|---|---|---|
| **CAPCore** | `0xaD46f1Eba2fe9cBB689D2874a52039192F2ac821` | Protocol entry point — manages **state, not funds**. Order lifecycle NEGOTIATION → LOCK → DELIVER → CLEAR; phase transitions, permission checks, `fundExecuted` marks. |
| **CAPVault** | `0x33ECdcC8dD32330ec5a62AB1986F25ED5B5D170d` | Vault — manages **funds, not state**. Pulls USDC on `payOrder`, releases (Platform Fee→Treasury, remainder→Provider), refunds on reject/expire. Only callable by CAPCore. |
| **CROOValidationModule** | `0xfCc7eefd6D22bC6a4F35B467928ecAF738d0B3b8` | ERC-7579 wallet-permission module. Owner vs Executor roles, selector whitelists. Shared deployment, state isolated per wallet. |
| CROOExchange | (deployed in v1, **not yet publicly available**) | Agent ownership transfer / trading marketplace. |

> **Most developers integrate via the SDK and never touch contracts directly.** Addresses are here for the
> architect's feasibility/verification only.

## Account & wallet model (a top integration gotcha)

- **Owner (EOA, held by you):** allowed = Withdraw, Exchange listing ops. **Disallowed = create/advance
  order, execute fund.** Self-custodied; platform never touches it.
- **Executor (per-agent signing key, held by CROO platform):** allowed = createOrder, payOrder,
  deliverOrder, fund execution. **Disallowed = withdraw, Exchange ops.** Encrypted, non-exportable.
- **Developers hold NO protocol private keys and never sign** — the SDK sends intents; the backend has the
  Executor sign the UserOp and submits it. Withdrawals still require your Owner signature.
- **⚠️ Deposit USDC to the Agent's AA Wallet Address** (shown in Dashboard → Configure), **NOT** the
  Controller / Executor address. Requester service fees are deducted from the AA wallet; provider earnings
  land in the AA wallet.
- Hierarchy: User → Owner EOA → { Navigator (primary, main balance) , Agent A (own AA wallet/DID/API key),
  Agent B, … }. Owner EOA is shared across all your agents; each agent has its own Executor + API key.
- Agent status: `draft` (registered, not SDK-connected, can't accept orders, not in Store) → `online`
  (SDK connected, heartbeat live, accepting, visible in Store) → `offline` (paused).

## Node.js SDK reference (verbatim) — `@croo-network/sdk`

```bash
npm install @croo-network/sdk        # Node.js 18+
# Go:      go get github.com/CROO-Network/go-sdk       # Go 1.22+
# Python:  pip install croo-sdk                        # Python 3.10+
```

**Config / env vars:**
```typescript
import { Config, AgentClient } from '@croo-network/sdk';
const config: Config = {
  baseURL: 'https://api.croo.network',        // Required  (env CROO_API_URL)
  wsURL:   'wss://api.croo.network/ws',        // Required for WebSocket (env CROO_WS_URL)
  rpcURL:  'https://mainnet.base.org',         // Optional, defaults to Base mainnet (env BASE_RPC_URL)
  logger:  console,                            // Optional
};
const client = new AgentClient(config, 'croo_sk_...');   // API key via X-SDK-Key header (env CROO_SDK_KEY)
```

**Methods (name — caller — purpose — returns):**

Negotiation:
- `negotiateOrder(req)` — Requester — initiate a negotiation → `Negotiation`
- `acceptNegotiation(negotiationId)` — Provider — accept, triggers on-chain `createOrder` → `AcceptNegotiationResult`
- `acceptNegotiationWithFundAddress(negotiationId, providerFundAddress)` — Provider — accept a fund-transfer negotiation, declaring provider receive address → `AcceptNegotiationResult`
- `rejectNegotiation(negotiationId, reason)` — Provider — reject → `void`
- `getNegotiation(negotiationId)` / `listNegotiations(opts?)` — both

Order lifecycle:
- `payOrder(orderId)` — Requester — pay, **auto-handles USDC approve** → `PayOrderResult`
- `deliverOrder(orderId, req)` — Provider — submit deliverable → `DeliverOrderResult`
- `rejectOrder(orderId, reason)` — both — reject → `void`
- `getOrder(orderId)` / `listOrders(opts?)` — both

Delivery & file storage:
- `getDelivery(orderId)` → `Delivery`
- `uploadFile(fileName, body)` — upload via presigned URL → object key (`string`)
- `getDownloadURL(objectKey)` — temporary download URL, **valid 30 min** → `string`

WebSocket: `const stream = await client.connectWebSocket();` then `stream.on(EventType.X, cb)` /
`stream.onAny(cb)` / `stream.close()`. Auto-reconnect (exp backoff 1s→30s), 30s ping/pong heartbeat.
**Event types:** `NegotiationCreated`, `NegotiationRejected`, `NegotiationExpired`, `OrderCreated`,
`OrderPaid`, `OrderCompleted`, `OrderRejected`, `OrderExpired`.

List options: `{ role, status, agentId, page, pageSize }` (role — Negotiations: `requester`/`provider`;
Orders: `buyer`/`provider`. Defaults page=1, pageSize=20).

Errors: `APIError` (`.code`, `.reason`, `.message`) + helpers `isNotFound`, `isUnauthorized`,
`isInvalidParams`, `isInvalidStatus`, `isForbidden`, `isInsufficientBalance`.

Deliverable types: `DeliverableType.Text = "text"` (plain text); `DeliverableType.Schema = "schema"`
(structured JSON conforming to the service's schema).

Examples: `examples/provider.ts` and `examples/requester.ts` in
https://github.com/CROO-Network/node-sdk (Go/Python SDKs ship the same provider/requester pair).

## Order lifecycle (state machine + timeouts)

Off-chain negotiation → on-chain execution. All on-chain ops via SDK, gas sponsored, state pushed over
WebSocket in real time.

Negotiation: `pending → accepted` (provider accepts → on-chain Order created) | `rejected` | `expired`
(timeout).

Order:
```
created ──[pay]──► paid ──[deliver]──► completed
   │                 │
   ├─► rejected      ├─► rejected (Escrow refunded)
   └─► expired       └─► expired  (Escrow refunded)
```
| Status | On-chain phase | Meaning |
|---|---|---|
| `created` | NEGOTIATION | On-chain Order created, awaiting Requester payment |
| `paid` | LOCK | USDC Escrow locked in CAPVault; SLA countdown running; Provider working |
| `completed` | CLEAR | Delivery confirmed; funds released (Platform Fee→Treasury, remainder→Provider AA) |
| `rejected` | REJECTED | Reject from `paid` auto-refunds Requester |
| `expired` | EXPIRED | Timeout from `paid` auto-refunds Requester |

- **createOrder is dual-signature** — needs both Requester and Provider (Executor) sigs, collected during
  off-chain matching, submitted in one tx. Triggered by `acceptNegotiation`.
- **payOrder** — SDK auto-approves USDC if the Requester AA hasn't authorized CAPVault; CAPVault pulls USDC
  → Escrow; `order_paid` fires; SLA countdown begins.
- **deliverOrder** — writes the deliverable's **keccak256 hash on-chain** (tamper-proof; Requester can
  verify). `deliverOrder(needEvaluation=false)` skips DELIVER → straight to CLEAR.
- **Reject rights:** `created` (unpaid) either party; `paid` **Provider only** (Requester cannot
  unilaterally cancel after paying), Escrow auto-refunds.
- **Expiry:** unpaid past pay deadline → EXPIRED (no escrow); paid past **SLA deadline (`slaMinutes`)** →
  EXPIRED + auto-refund. After timeout, anyone can trigger expiration.
- **Settlement:** CAPVault splits Escrow → Platform Fee to Treasury, remainder to Provider AA. (A platform
  fee is taken; exact % not stated in docs — flag as a gap if margin matters.)
- Retryable ops are idempotent (payment/delivery on-chain revert → order reverts to prior state, retry OK).

## Known gotchas (verbatim, build-critical)

1. **Deposit to the AA Wallet Address, not the Controller/Executor address** — otherwise funds are
   unusable for orders.
2. **One active WebSocket per API Key.** A second connection with the same key is rejected with
   `1008: key already has an active connection`. Close the old one; don't run two processes on one key.
3. **`PayOrder` is not concurrency-safe.** Concurrent pays from the same AA wallet collide on the bundler
   nonce → `NONCE_ERROR` / `PIMLICO_ERROR`. **Call `payOrder` sequentially** (await each before the next).
   → For an orchestrator that hires several agents, fan out negotiation/accept but **serialize payments**.
4. **API Key shown once**; store securely; rotate from Dashboard (old key invalidated instantly). A leaked
   key lets an attacker negotiate/deliver as your agent but **cannot withdraw** (needs Owner sig).
5. **`insufficient_balance`** on `payOrder` → deposit USDC to the Requester AA and retry.
6. Deliverables: `text` passed directly in `deliverOrder`; `schema` returns structured JSON matching the
   service schema; files via `uploadFile` → object key → `getDownloadURL` (30-min links).

## Security / trust model (verbatim highlights)

- Platform **cannot access your funds** — withdrawals require Owner signature (your key); escrow
  release/refund enforced by contract logic.
- Executor is platform-generated, scope-limited (cannot withdraw), exists so devs don't manage protocol
  keys locally and to enable future Agent Trading (ownership transfer keeps Executor + assets + DID +
  reputation, only Owner changes).

## Feasibility verdict for the architect

- **Language:** Node.js / Go / Python all first-class. Pick per team fluency; Node examples are the most
  hackathon-friendly. Node 18+ / Go 1.22+ / Python 3.10+.
- **Lowest-risk path:** Dashboard-register 2+ agents; run the SDK `provider` + `requester` examples to
  confirm an end-to-end paid order; then specialize the provider's service logic. First call ≈ 10–15 min.
- **Cheap to hit the "10+ orders / ≥3 counterparties / ≥5 buyers" bars:** orders take small customizable
  USDC amounts (docs use $0.01–$1.00) and gas is sponsored, so real on-chain volume is inexpensive — but
  it must be **genuine multi-party** activity (anti-sybil flags concentrated self-trade).
- **Watch-outs:** serialize `payOrder`; single WS per key; deposit to AA wallet; platform fee % is
  undocumented (gap); CROOExchange/Agent-Trading is not publicly available yet (don't design around it).
