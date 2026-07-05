import { keccak256, toUtf8Bytes } from 'ethers';
import type { TxHash } from '../domain/types.js';

export class IdFactory {
  private orderSeq = 0;
  private negotiationSeq = 0;
  private txSeq = 0;

  nextOrderId(): string {
    this.orderSeq += 1;
    return `order-${this.orderSeq}`;
  }

  nextNegotiationId(): string {
    this.negotiationSeq += 1;
    return `neg-${this.negotiationSeq}`;
  }

  refundTxHash(orderId: string): TxHash {
    this.txSeq += 1;
    return keccak256(toUtf8Bytes(`refund:${orderId}:${this.txSeq}`)) as TxHash;
  }

  deliveryHash(payload: unknown): TxHash {
    return keccak256(toUtf8Bytes(JSON.stringify(payload ?? null))) as TxHash;
  }
}
