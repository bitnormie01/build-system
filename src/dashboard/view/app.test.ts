import { test, expect } from 'vitest';
import { renderState } from './app.js';

test('renders a down target citing its refund tx, and a healthy target', () => {
  const html = renderState({
    issuerDid: 'did:deadman',
    generatedAt: 0,
    targets: [
      { targetDid: 'did:down', status: 'down', inFlightOrderId: null, lastStatus: 'expired',
        totalHeartbeats: 2, completedHeartbeats: 1, uptimeRatio: 0.5,
        incidents: [{ orderId: 'o1', expiredAt: 5, refundTxHash: '0xrefund', slaMinutes: 1 }] },
      { targetDid: 'did:up', status: 'healthy', inFlightOrderId: 'o9', lastStatus: 'completed',
        totalHeartbeats: 3, completedHeartbeats: 3, uptimeRatio: 1, incidents: [] },
    ],
  });
  expect(html).toContain('DOWN');
  expect(html).toContain('0xrefund');
  expect(html).toContain('did:up');
  expect(html).toContain('HEALTHY');
});
