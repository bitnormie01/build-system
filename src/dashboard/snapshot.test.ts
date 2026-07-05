import { test, expect } from 'vitest';
import { AttestationStore } from '../attestation/attestation-store.js';
import { buildSnapshot } from './snapshot.js';

test('maps each monitored target to its certificate status and in-flight order', () => {
  const store = new AttestationStore();
  store.recordDowntime('did:t', { orderId: 'o1', expiredAt: 5, refundTxHash: '0xrefund', slaMinutes: 1 });
  const snap = buildSnapshot({
    issuerDid: 'did:deadman',
    now: 100,
    store,
    monitorStates: [{ targetDid: 'did:t', inFlightOrderId: 'o2', lastStatus: 'expired', resolved: 1 }],
  });
  expect(snap.issuerDid).toBe('did:deadman');
  expect(snap.targets[0]?.status).toBe('down');
  expect(snap.targets[0]?.inFlightOrderId).toBe('o2');
  expect(snap.targets[0]?.incidents[0]?.refundTxHash).toBe('0xrefund');
});
