import { Interface } from 'ethers';
import type { TxHash } from '../domain/types.js';
import capcore from './abis/capcore.json' with { type: 'json' };
import capvault from './abis/capvault.json' with { type: 'json' };

export interface RawLog {
  topics: string[];
  data: string;
  transactionHash: string;
}

export interface CapDecodedEvent {
  name: string;
  orderId: string;
  txHash: TxHash;
}

const iface = new Interface([...capcore, ...capvault]);

export function decodeCapLogs(logs: RawLog[]): CapDecodedEvent[] {
  const out: CapDecodedEvent[] = [];
  for (const log of logs) {
    let parsed;
    try {
      parsed = iface.parseLog({ topics: log.topics, data: log.data });
    } catch {
      parsed = null;
    }
    if (!parsed) continue;
    const orderId: unknown = parsed.args.getValue('orderId');
    out.push({
      name: parsed.name,
      orderId: typeof orderId === 'bigint' ? orderId.toString() : String(orderId),
      txHash: log.transactionHash as TxHash,
    });
  }
  return out;
}

export function findRefundForExpiry(logs: RawLog[], orderId: string | number): TxHash | null {
  const decoded = decodeCapLogs(logs);
  const target = String(orderId);
  const expired = decoded.find((d) => d.name === 'OrderExpired' && d.orderId === target);
  if (!expired) return null;
  const refund = decoded.find((d) => d.name === 'EscrowRefunded' && d.orderId === target);
  return refund ? refund.txHash : null;
}
