import type { MockCapService } from './mock-service.js';
import type {
  CapClient, CapEventStream, NegotiateRequest, Negotiation, AcceptResult, PayResult,
  DeliverRequest, DeliverResult, Delivery, ListOrdersOpts,
} from '../domain/cap-client.js';
import type { Did, OrderId, NegotiationId, Order } from '../domain/types.js';

export class MockCapClient implements CapClient {
  constructor(private readonly service: MockCapService, private readonly selfDid: Did) {}

  negotiateOrder(req: NegotiateRequest): Promise<Negotiation> {
    return this.service.negotiateOrder(req);
  }
  acceptNegotiation(negotiationId: NegotiationId): Promise<AcceptResult> {
    return this.service.acceptNegotiation(negotiationId, this.selfDid);
  }
  rejectNegotiation(negotiationId: NegotiationId, reason: string): Promise<void> {
    return this.service.rejectNegotiation(negotiationId, reason, this.selfDid);
  }
  payOrder(orderId: OrderId): Promise<PayResult> {
    return this.service.payOrder(orderId, this.selfDid);
  }
  deliverOrder(req: DeliverRequest): Promise<DeliverResult> {
    return this.service.deliverOrder(req, this.selfDid);
  }
  rejectOrder(orderId: OrderId, reason: string): Promise<void> {
    return this.service.rejectOrder(orderId, reason, this.selfDid);
  }
  getOrder(orderId: OrderId): Promise<Order> {
    return this.service.getOrder(orderId);
  }
  listOrders(opts?: ListOrdersOpts): Promise<Order[]> {
    return this.service.listOrders(opts);
  }
  getDelivery(orderId: OrderId): Promise<Delivery> {
    return this.service.getDelivery(orderId);
  }
  connectWebSocket(): Promise<CapEventStream> {
    return Promise.resolve(this.service.connect(this.selfDid));
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}
