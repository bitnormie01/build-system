import { test, expect } from 'vitest';
import type { CapClient, CapEventStream } from './cap-client.js';

const stream: CapEventStream = { on() {}, onAny() {}, close() {} };

const stub: CapClient = {
  async negotiateOrder(req) {
    return { id: 'n1', requesterDid: req.requesterDid, providerDid: req.providerDid,
      amountUsdc: req.amountUsdc, slaMinutes: req.slaMinutes, status: 'pending' };
  },
  async acceptNegotiation(negotiationId) { return { orderId: 'o1', negotiationId }; },
  async rejectNegotiation() {},
  async payOrder(orderId) { return { orderId, escrowLocked: true }; },
  async deliverOrder(req) { return { orderId: req.orderId, deliveryHash: '0xdead' }; },
  async rejectOrder() {},
  async getOrder(orderId) {
    return { id: orderId, negotiationId: 'n1', requesterDid: 'did:req', providerDid: 'did:prov',
      amountUsdc: '0.01', slaMinutes: 1, status: 'created', requirements: null, createdAt: 0,
      paidAt: null, resolvedAt: null, deliveryHash: null, refundTxHash: null };
  },
  async listOrders() { return []; },
  async getDelivery(orderId) { return { orderId, deliveryHash: '0xdead', payload: {} }; },
  async connectWebSocket() { return stream; },
  async close() {},
};

test('CapClient stub exposes the full method surface', () => {
  for (const m of ['negotiateOrder','acceptNegotiation','rejectNegotiation','payOrder',
    'deliverOrder','rejectOrder','getOrder','listOrders','getDelivery','connectWebSocket','close'] as const) {
    expect(typeof stub[m]).toBe('function');
  }
});
