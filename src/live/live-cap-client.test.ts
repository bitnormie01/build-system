import { test, expect } from 'vitest';
import { LiveCapClient } from './live-cap-client.js';
import type { SdkAgentClient, SdkEvent, SdkStream } from './sdk-agent-client.js';
import type { CapEvent } from '../domain/types.js';

class FakeSdk implements SdkAgentClient {
  calls: string[] = [];
  private anyCbs: Array<(e: SdkEvent) => void> = [];
  async negotiateOrder(req: { providerId: string }) { this.calls.push('negotiate:' + req.providerId); return { id: 'n1', status: 'accepted' }; }
  async acceptNegotiation(id: string) { this.calls.push('accept:' + id); return { orderId: 'o1' }; }
  async rejectNegotiation() {}
  async payOrder(orderId: string) { this.calls.push('pay:' + orderId); return { orderId }; }
  async deliverOrder(orderId: string) { this.calls.push('deliver:' + orderId); return { orderId, deliveryHash: '0xdead' }; }
  async rejectOrder() {}
  async getOrder(orderId: string) { return { id: orderId, status: 'expired', providerId: 'did:prov', refundTxHash: '0xrefund' }; }
  async listOrders() { return []; }
  async getDelivery(orderId: string) { return { orderId, deliveryHash: '0xdead', payload: {} }; }
  async connectWebSocket(): Promise<SdkStream> {
    const cbs = this.anyCbs;
    return { on() {}, onAny: (cb) => { cbs.push(cb); }, close() {} };
  }
  emit(e: SdkEvent) { for (const cb of this.anyCbs) cb(e); }
}

test('maps CapClient calls to the SDK and maps SDK events back to CapEvents', async () => {
  const sdk = new FakeSdk();
  const client = new LiveCapClient(sdk, 'did:self');
  const neg = await client.negotiateOrder(
    { requesterDid: 'did:self', providerDid: 'did:prov', amountUsdc: '0.01', slaMinutes: 1 });
  expect(sdk.calls).toContain('negotiate:did:prov');
  expect(neg.providerDid).toBe('did:prov');
  expect(neg.status).toBe('accepted');
  await client.payOrder('o1');
  expect(sdk.calls).toContain('pay:o1');

  const order = await client.getOrder('o1');
  expect(order.status).toBe('expired');
  expect(order.refundTxHash).toBe('0xrefund');

  const stream = await client.connectWebSocket();
  const seen: CapEvent[] = [];
  stream.onAny((e) => seen.push(e));
  sdk.emit({ type: 'OrderExpired', orderId: 'o1', providerId: 'did:prov',
    requesterId: 'did:self', status: 'expired', refundTxHash: '0xrefund', slaMinutes: 1 });
  expect(seen[0]?.type).toBe('order_expired');
  expect(seen[0]?.refundTxHash).toBe('0xrefund');
});
