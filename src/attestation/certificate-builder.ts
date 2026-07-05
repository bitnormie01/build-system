import type { AttestationStore } from './attestation-store.js';
import type { UptimeCertificate, UptimeStatus } from '../domain/certificate.js';
import type { Did } from '../domain/types.js';

export function buildCertificate(
  targetDid: Did,
  issuerDid: Did,
  store: AttestationStore,
  now: number,
): UptimeCertificate {
  const rec = store.get(targetDid);
  const total = rec?.totalHeartbeats ?? 0;
  const completed = rec?.completedHeartbeats ?? 0;
  const incidents = rec?.incidents ?? [];
  const last = rec?.lastResolvedStatus ?? 'none';
  const uptimeRatio = total === 0 ? 1 : completed / total;
  let status: UptimeStatus;
  if (last === 'expired') status = 'down';
  else if (incidents.length > 0) status = 'degraded';
  else status = 'healthy';
  return {
    schemaVersion: '1.0',
    targetDid,
    issuerDid,
    issuedAt: now,
    windowStart: 0,
    windowEnd: now,
    totalHeartbeats: total,
    completedHeartbeats: completed,
    downtimeIncidents: incidents,
    uptimeRatio,
    status,
  };
}
