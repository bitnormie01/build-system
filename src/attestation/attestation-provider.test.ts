import { test, expect } from 'vitest';
import { ManualClock } from '../cap/clock.js';
import { createMockEnvironment } from '../cap/environment.js';
import { AttestationStore } from './attestation-store.js';
import { AttestationProvider } from './attestation-provider.js';
import type { UptimeCertificate } from '../domain/certificate.js';

async function flush(): Promise<void> {
  for (let i = 0; i < 50; i++) await Promise.resolve();
}

test('sells an uptime certificate: accept the buyer, deliver the cert for the requested target', async () => {
  const clock = new ManualClock();
  const env = createMockEnvironment({ clock });
  const store = new AttestationStore();
  store.recordDowntime('did:target',
    { orderId: 'ox', expiredAt: 5, refundTxHash: '0xrefund', slaMinutes: 1 });
  const provider = new AttestationProvider(env.forAgent('did:deadman'), 'did:deadman', store, () => 100);
  await provider.start();

  const buyer = env.forAgent('did:buyer');
  const neg = await buyer.negotiateOrder({
    requesterDid: 'did:buyer', providerDid: 'did:deadman', amountUsdc: '0.05',
    slaMinutes: 1, requirements: 'did:target',
  });
  await flush();
  const order = (await buyer.listOrders({ requesterDid: 'did:buyer' })).find((o) => o.negotiationId === neg.id);
  await buyer.payOrder(order?.id ?? '');
  await flush();

  const delivery = await buyer.getDelivery(order?.id ?? '');
  const cert = delivery.payload as UptimeCertificate;
  expect(cert.targetDid).toBe('did:target');
  expect(cert.status).toBe('down');
  expect(cert.downtimeIncidents[0]?.refundTxHash).toBe('0xrefund');
  expect(delivery.deliveryHash).toMatch(/^0x/);
  provider.stop();
});
