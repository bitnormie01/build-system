import { test, expect } from 'vitest';
import { AttestationStore } from './attestation-store.js';
import { buildCertificate } from './certificate-builder.js';

test('healthy certificate when there are no incidents', () => {
  const store = new AttestationStore();
  store.recordCompleted('did:t');
  const cert = buildCertificate('did:t', 'did:deadman', store, 100);
  expect(cert.status).toBe('healthy');
  expect(cert.uptimeRatio).toBe(1);
  expect(cert.downtimeIncidents).toHaveLength(0);
  expect(cert.issuerDid).toBe('did:deadman');
  expect(cert.schemaVersion).toBe('1.0');
});

test('down certificate cites the refund tx of the latest expiry', () => {
  const store = new AttestationStore();
  store.recordCompleted('did:t');
  store.recordDowntime('did:t', { orderId: 'o2', expiredAt: 50, refundTxHash: '0xrefund', slaMinutes: 1 });
  const cert = buildCertificate('did:t', 'did:deadman', store, 100);
  expect(cert.status).toBe('down');
  expect(cert.totalHeartbeats).toBe(2);
  expect(cert.completedHeartbeats).toBe(1);
  expect(cert.uptimeRatio).toBe(0.5);
  expect(cert.downtimeIncidents[0]?.refundTxHash).toBe('0xrefund');
});

test('degraded certificate after recovery from a past incident', () => {
  const store = new AttestationStore();
  store.recordDowntime('did:t', { orderId: 'o1', expiredAt: 10, refundTxHash: '0xr', slaMinutes: 1 });
  store.recordCompleted('did:t');
  const cert = buildCertificate('did:t', 'did:deadman', store, 100);
  expect(cert.status).toBe('degraded');
});

test('unknown target yields a healthy, evidence-free certificate', () => {
  const cert = buildCertificate('did:unknown', 'did:deadman', new AttestationStore(), 100);
  expect(cert.status).toBe('healthy');
  expect(cert.totalHeartbeats).toBe(0);
  expect(cert.uptimeRatio).toBe(1);
});
