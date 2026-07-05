import type { MonitorState } from '../heartbeat/target-monitor.js';
import type { AttestationStore } from '../attestation/attestation-store.js';
import { buildCertificate } from '../attestation/certificate-builder.js';
import type { UptimeStatus, DowntimeIncident } from '../domain/certificate.js';
import type { Did, OrderStatus } from '../domain/types.js';

export interface TargetView {
  targetDid: Did;
  status: UptimeStatus;
  inFlightOrderId: string | null;
  lastStatus: OrderStatus | 'none';
  totalHeartbeats: number;
  completedHeartbeats: number;
  uptimeRatio: number;
  incidents: DowntimeIncident[];
}

export interface DashboardSnapshot {
  issuerDid: Did;
  generatedAt: number;
  targets: TargetView[];
}

export function buildSnapshot(params: {
  issuerDid: Did;
  monitorStates: MonitorState[];
  store: AttestationStore;
  now: number;
}): DashboardSnapshot {
  const targets = params.monitorStates.map((ms): TargetView => {
    const cert = buildCertificate(ms.targetDid, params.issuerDid, params.store, params.now);
    return {
      targetDid: ms.targetDid,
      status: cert.status,
      inFlightOrderId: ms.inFlightOrderId,
      lastStatus: ms.lastStatus,
      totalHeartbeats: cert.totalHeartbeats,
      completedHeartbeats: cert.completedHeartbeats,
      uptimeRatio: cert.uptimeRatio,
      incidents: cert.downtimeIncidents,
    };
  });
  return { issuerDid: params.issuerDid, generatedAt: params.now, targets };
}
