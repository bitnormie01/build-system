import type { Did, OrderId, TxHash } from './types.js';

export interface DowntimeIncident {
  orderId: OrderId;
  expiredAt: number;
  refundTxHash: TxHash;
  slaMinutes: number;
}

export type UptimeStatus = 'healthy' | 'degraded' | 'down';

export interface UptimeCertificate {
  schemaVersion: '1.0';
  targetDid: Did;
  issuerDid: Did;
  issuedAt: number;
  windowStart: number;
  windowEnd: number;
  totalHeartbeats: number;
  completedHeartbeats: number;
  downtimeIncidents: DowntimeIncident[];
  uptimeRatio: number;
  status: UptimeStatus;
}
