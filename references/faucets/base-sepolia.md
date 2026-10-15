# Base Sepolia faucets

> Chain id 84532. One `##` section per provider, best-working-first. Public provider facts only:
> no secrets, no campaign addresses (`README.md`). First written 2026-10-15 by a gate-concierge
> discovery pass.

## Google Cloud Web3 faucet (Ethereum Sepolia) + Base's L1StandardBridge

- **URL:** https://cloud.google.com/application/web3/faucet/ethereum/sepolia
  - The bridge is `L1StandardBridge` on Sepolia, `0xfd0Bf71F60660E2f608ed56e1659C450eB113120`.
  - Source for the bridge address: https://docs.base.org/base-chain/network-information/base-contracts,
    under "Ethereum Testnet (Sepolia)".
- **Gating:** oauth-google.
  - The claim needs a signed-in Google account. On an already signed-in Chrome session, no CAPTCHA
    was shown.
  - The faucet's FAQ says its risk system *may* ask for a mainnet balance (0.001 ETH) when it flags
    a request. It was not asked for here.
- **Drip + cooldown:** 0.05 Sepolia ETH per claim.
  - Rate-limited per Google account *and* per address.
  - The FAQ says the exact limit "depends on the chosen network" and does not state it.
- **Burner-compatible:** yes. A fresh, never-funded address received the full 0.05.
- **Last verified:** 2026-10-15.
  - The faucet tx succeeded (status 1). The faucet itself says it queues claims first.
  - Then `depositETH(200000, 0x)` with 0.048 ETH to the bridge succeeded on Sepolia (status 1).
- **Status:** verified.
- **Notes:**
  - **Google lists no Base Sepolia network** (2026-10-15 list: Ethereum Sepolia 0.05 ETH, Hoodi,
    and several non-EVM testnets). So this is a two-step route.
  - **Bridge with `cast`:**
    `cast send 0xfd0Bf71F60660E2f608ed56e1659C450eB113120 'depositETH(uint32,bytes)' 200000 0x --value <amt>ether --rpc-url <sepolia-rpc> --private-key <burner>`.
    - Keep about 0.002 ETH on Sepolia for gas. Sepolia gas was about 0.001 gwei that day, so the
      deposit cost almost nothing.
    - Before sending, sanity-check the bridge: `OTHER_BRIDGE()` returns
      `0x4200000000000000000000000000000000000010`.
  - **Deposit arrival on Base Sepolia:** about 5 min 20 s.
    - The L1 deposit block was at 18:11:36Z. The balance was first seen at 18:16:56Z, polling
      every 15 s.
    - The full 0.048 ETH arrived; L2 deposit fees were zero.
    - The deposit does not appear in Blockscout's normal tx list for the address. Check the balance
      instead.
  - **Public Sepolia RPC that worked:** `https://ethereum-sepolia-rpc.publicnode.com`.

## Coinbase Developer Platform (CDP) faucet

- **URL:** https://portal.cdp.coinbase.com/products/faucet
- **Gating:** a Coinbase account sign-in. The page redirects to `login.coinbase.com`, offering
  email, passkey, Google or Apple. An account signup is needed if you have none.
- **Drip + cooldown:** unknown. Not claim-tested, because there was no signed-in Coinbase session.
- **Burner-compatible:** unknown.
- **Last verified:** 2026-10-15. Only the sign-in gate was observed.
- **Status:** stale. The gating was observed, but no claim was attempted.
- **Notes:** Base's docs point to "Base faucets" without listing requirements. Try this first if
  the user already has a Coinbase account signed in.

## Superchain faucet (Optimism dev console)

- **URL:** https://console.optimism.io/faucet (choose network "Base Sepolia")
- **Gating:** sign-in, plus captcha.
  - The page says "Sign in to use the faucet".
  - The page says it's "protected by reCAPTCHA".
- **Drip + cooldown:** the page says "Anyone can claim 0.01 test ETH every 24 hours, or verify your
  onchain identity for more tokens".
- **Burner-compatible:** probably, at the 0.01 tier. Not claim-tested.
- **Last verified:** 2026-10-15. Only the page text was read.
- **Status:** stale. Gating and drip were read from the page; no claim was attempted.
- **Notes:** 0.01 ETH per day is below a 0.02 ETH deploy budget unless identity is verified.

## thirdweb

- **URL:** https://thirdweb.com/base-sepolia-testnet
- **Gating:** wallet-connect. The faucet widget shows "Connect Wallet".
- **Drip + cooldown:** "0.01 ETH/day", per the page.
- **Burner-compatible:** only if the burner is loaded into a connectable wallet. Not claim-tested.
- **Last verified:** 2026-10-15. Only the page text was read.
- **Status:** stale. No claim was attempted.
- **Notes:** none.

## Alchemy

- **URL:** https://www.alchemy.com/faucets/base-sepolia
- **Gating:** mainnet-balance.
  - The page's FAQ says: "at least 0.001 ETH on Ethereum Mainnet", "sufficient activity on
    Ethereum Mainnet", and a low existing testnet balance.
  - The FAQ also says "No account required".
- **Drip + cooldown:** 0.1 ETH per address every 24 hours.
- **Burner-compatible:** **no**. A fresh burner has no mainnet balance or history.
- **Last verified:** 2026-10-15. Only the page's FAQ was read.
- **Status:** verified as not burner-compatible. Skip it for burner gates.
- **Notes:** a wallet with mainnet history could use it.
