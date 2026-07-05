import type { AttestationStore } from './attestation-store.js';
import type { CapEventStream } from '../domain/cap-client.js';
import { EventType } from '../domain/types.js';

export class DowntimeDetector {
  constructor(private readonly store: AttestationStore) {}

  attach(stream: CapEventStream): void {
    stream.on(EventType.OrderCompleted, (e) => {
      this.store.recordCompleted(e.providerDid);
    });
    stream.on(EventType.OrderExpired, (e) => {
      if (e.refundTxHash === null) return; // an expiry without refund evidence is not counted
      this.store.recordDowntime(e.providerDid, {
        orderId: e.orderId,
        expiredAt: e.timestamp,
        refundTxHash: e.refundTxHash,
        slaMinutes: e.slaMinutes,
      });
    });
    stream.on(EventType.OrderRejected, (e) => {
      this.store.recordRejected(e.providerDid); // provider-reject refund is NOT downtime
    });
  }
}
