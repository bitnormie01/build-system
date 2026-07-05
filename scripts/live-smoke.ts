// scripts/live-smoke.ts — HUMAN-GATED. Places REAL CAP orders and moves REAL USDC.
// Prereqs (see docs/runbooks/register-agents.md): agents registered, AA wallets funded, .env filled,
// DEADMAN_MODE=live. Run with: npm run live:smoke
import { JsonRpcProvider } from 'ethers';
import { resolveMode } from '../src/config/mode.js';
import { createLiveEnvironment } from '../src/live/live-environment.js';
import { findRefundForExpiry } from '../src/chain/decode.js';
import type { RawLog } from '../src/chain/decode.js';
import { CAP_VAULT_ADDRESS } from '../src/chain/addresses.js';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) throw new Error(`Missing required env var ${name}`);
  return value;
}
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  if (resolveMode(process.env) !== 'live') {
    console.error('Refusing to run: set DEADMAN_MODE=live (this places REAL orders and moves USDC).');
    process.exitCode = 1;
    return;
  }
  const rpcUrl = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
  const env = await createLiveEnvironment({
    agentKeys: {
      'did:deadman': requireEnv('CROO_SDK_KEY_DEADMAN'),
      'did:req1': requireEnv('CROO_SDK_KEY_REQUESTER_1'),
      'did:target': requireEnv('CROO_SDK_KEY_TARGET'),
    },
    rpcUrl,
  });
  const requester = env.forAgent('did:req1');

  console.log('1) Negotiating a $0.01 heartbeat to did:target (1-minute SLA)…');
  const neg = await requester.negotiateOrder(
    { requesterDid: 'did:req1', providerDid: 'did:target', amountUsdc: '0.01', slaMinutes: 1 });
  await sleep(5000);
  const created = (await requester.listOrders({ requesterDid: 'did:req1', providerDid: 'did:target' }))
    .find((o) => o.negotiationId === neg.id);
  if (!created) throw new Error('Order was not created — did the target agent accept the negotiation?');

  console.log('2) Paying (escrow locks). DO NOT deliver from the target.', created.id);
  await requester.payOrder(created.id);

  console.log('3) Waiting past the 1-minute SLA for auto-expiry + CAPVault refund…');
  await sleep(90000);
  const order = await requester.getOrder(created.id);
  console.log('   Order status:', order.status, '(expected: expired)');

  const provider = new JsonRpcProvider(rpcUrl);
  const latest = await provider.getBlockNumber();
  const logs = await provider.getLogs({
    address: CAP_VAULT_ADDRESS, fromBlock: latest - 5000, toBlock: latest,
  });
  const raw: RawLog[] = logs.map((l) => ({
    topics: [...l.topics], data: l.data, transactionHash: l.transactionHash,
  }));
  const decodedRefund = findRefundForExpiry(raw, Number(order.id) || 0);

  console.log('4) Refund tx (from order):', order.refundTxHash ?? '(none)');
  console.log('   Refund tx (decoded from CAPVault logs):', decodedRefund ?? '(verify orderId correlation live)');
  const proof = order.refundTxHash ?? decodedRefund;
  console.log('   Basescan:', proof ? `https://basescan.org/tx/${proof}` : 'n/a');
  console.log('   ⇒ Put this tx hash in the demo/README as the certificate incident proof.');
  await env.close();
}

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
