import { test, expect } from 'vitest';
import { AttestationStore } from './attestation-store.js';

test('completed heartbeats count toward uptime; no incidents', () => {
  const store = new AttestationStore();
  store.recordCompleted('did:t');
  store.recordCompleted('did:t');
  const rec = store.get('did:t');
  expect(rec?.totalHeartbeats).toBe(2);
  expect(rec?.completedHeartbeats).toBe(2);
  expect(rec?.incidents ?? []).toHaveLength(0);
  expect(rec?.lastResolvedStatus).toBe('completed');
});

test('expiry records a downtime incident citing the refund tx', () => {
  const store = new AttestationStore();
  store.recordCompleted('did:t');
  store.recordDowntime('did:t', { orderId: 'o2', expiredAt: 50, refundTxHash: '0xrefund', slaMinutes: 1 });
  const rec = store.get('did:t');
  expect(rec?.totalHeartbeats).toBe(2);
  expect(rec?.completedHeartbeats).toBe(1);
  expect(rec?.incidents).toHaveLength(1);
  expect(rec?.incidents[0]?.refundTxHash).toBe('0xrefund');
  expect(rec?.lastResolvedStatus).toBe('expired');
});

test('a provider-reject is neutral: not downtime, not counted against uptime', () => {
  const store = new AttestationStore();
  store.recordCompleted('did:t');
  store.recordRejected('did:t');
  const rec = store.get('did:t');
  expect(rec?.totalHeartbeats).toBe(1);           // reject not added to total
  expect(rec?.incidents ?? []).toHaveLength(0);   // reject is NOT downtime
  expect(rec?.lastResolvedStatus).toBe('rejected');
});
