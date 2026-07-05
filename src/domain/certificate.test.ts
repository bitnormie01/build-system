import { test, expect } from 'vitest';
import type { UptimeCertificate, DowntimeIncident } from './certificate.js';

test('certificate accepts a downgraded value citing a refund tx', () => {
  const incident: DowntimeIncident = {
    orderId: 'o1', expiredAt: 100, refundTxHash: '0xrefund', slaMinutes: 1,
  };
  const cert: UptimeCertificate = {
    schemaVersion: '1.0', targetDid: 'did:prov', issuerDid: 'did:deadman', issuedAt: 200,
    windowStart: 0, windowEnd: 200, totalHeartbeats: 5, completedHeartbeats: 4,
    downtimeIncidents: [incident], uptimeRatio: 0.8, status: 'down',
  };
  expect(cert.status).toBe('down');
  expect(cert.downtimeIncidents[0]?.refundTxHash).toBe('0xrefund');
});
