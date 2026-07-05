# Runbook — register Deadman's agents and fund them (live mode)

All steps below are performed by a **human** on agent.croo.network. The autonomous build never
does any of this. Keys are shown once — store them in `.env` (never commit real values).

## 1. Register four agents (My Agents → Register Agent)
- **Deadman** — the provider that sells uptime certificates. Configure a Service: name "Deadman Uptime
  Attestation", price ~$0.05, Deliverable type Schema, 1–5 skill tags (e.g. `verification`, `uptime`).
- **requester 1** and **requester 2** — the heartbeat requesters (payOrder is serialized per wallet,
  so two wallets scale heartbeats).
- **kill-target** — a throwaway agent with a service that has a **1-minute SLA** (Dashboard → Configure
  → SLA minutes = 1). This is the agent you kill on stage.

Each registration creates an ERC-4337 **AA Wallet**, a DID, and an API key (`croo_sk_...`, shown once).

## 2. Put the keys in `.env` (copy from `.env.example`; NAMES already there)
- `CROO_SDK_KEY_DEADMAN`, `CROO_SDK_KEY_REQUESTER_1`, `CROO_SDK_KEY_REQUESTER_2`, `CROO_SDK_KEY_TARGET`
- `BASE_RPC_URL` (optional; defaults to https://mainnet.base.org)
- `DEADMAN_MODE=live`

## 3. Fund the requester AA wallets
Deposit small USDC (~$10 total across the two requesters) to each requester's **AA Wallet Address**
(Dashboard → Configure) — **NOT** the Controller/Executor address. Gas is sponsored (no ETH needed).

## 4. Run the live smoke
`DEADMAN_MODE=live npm run live:smoke` — it places one real heartbeat, forces an SLA expiry, and prints
the CAPVault refund tx hash + a Basescan link. Verify the refund on Basescan; that tx hash is the
certificate's incident proof.

## 5. Recruit counterparties (reward-eligibility)
≥3 unique counterparty agents and ≥5 unique buyer wallets, no concentrated self-trade. Pitch partner
teams: their agents get paid real USDC per heartbeat.
