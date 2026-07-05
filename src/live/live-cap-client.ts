import type {
  SdkAgentClient, SdkStream, SdkEvent, SdkOrder,
} from './sdk-agent-client.js';
import { mapSdkEventType } from './sdk-agent-client.js';
import type {
  CapClient, CapEventStream, NegotiateRequest, Negotiation, NegotiationStatus, AcceptResult,
  PayResult, DeliverRequest, DeliverResult, Delivery, ListOrdersOpts,
} from '../domain/cap-client.js';
import type { Order, OrderStatus, CapEvent, Did, OrderId, NegotiationId, TxHash } from '../domain/types.js';

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '');
}
function mapOrderStatus(s: string): OrderStatus {
  switch (normalize(s)) {
    case 'paid': return 'paid';
    case 'completed': return 'completed';
    case 'rejected': return 'rejected';
    case 'expired': return 'expired';
    default: return 'created';
  }
}
function mapNegStatus(s: string): NegotiationStatus {
  switch (normalize(s)) {
    case 'accepted': return 'accepted';
    case 'rejected': return 'rejected';
    case 'expired': return 'expired';
    default: return 'pending';
  }
}
function mapSdkOrder(o: SdkOrder): Order {
  return {
    id: o.id,
    negotiationId: o.negotiationId ?? '',
    requesterDid: o.requesterId ?? '',
    providerDid: o.providerId ?? '',
    amountUsdc: o.amount ?? '0',
    slaMinutes: o.slaMinutes ?? 0,
    status: mapOrderStatus(o.status),
    requirements: o.requirements ?? null,
    createdAt: o.createdAt ?? 0,
    paidAt: o.paidAt ?? null,
    resolvedAt: o.resolvedAt ?? null,
    deliveryHash: (o.deliveryHash ?? null) as TxHash | null,
    refundTxHash: (o.refundTxHash ?? null) as TxHash | null,
  };
}
function toCapEvent(raw: SdkEvent): CapEvent | null {
  const type = mapSdkEventType(raw.type);
  if (type === null) return null;
  return {
    type,
    orderId: raw.orderId ?? '',
    negotiationId: raw.negotiationId ?? null,
    requesterDid: raw.requesterId ?? '',
    providerDid: raw.providerId ?? '',
    status: mapOrderStatus(raw.status ?? 'created'),
    slaMinutes: raw.slaMinutes ?? 0,
    refundTxHash: (raw.refundTxHash ?? null) as TxHash | null,
    deliveryHash: (raw.deliveryHash ?? null) as TxHash | null,
    timestamp: raw.timestamp ?? 0,
  };
}

class SdkEventStreamAdapter implements CapEventStream {
  private readonly typed = new Map<CapEvent['type'], Set<(e: CapEvent) => void>>();
  private readonly anyHandlers = new Set<(e: CapEvent) => void>();

  constructor(private readonly stream: SdkStream) {
    stream.onAny((raw) => {
      const mapped = toCapEvent(raw);
      if (!mapped) return;
      for (const h of [...this.anyHandlers]) h(mapped);
      const hs = this.typed.get(mapped.type);
      if (hs) for (const h of [...hs]) h(mapped);
    });
  }
  on(type: CapEvent['type'], handler: (e: CapEvent) => void): void {
    let hs = this.typed.get(type);
    if (!hs) { hs = new Set(); this.typed.set(type, hs); }
    hs.add(handler);
  }
  onAny(handler: (e: CapEvent) => void): void { this.anyHandlers.add(handler); }
  close(): void { this.stream.close(); }
}

export class LiveCapClient implements CapClient {
  constructor(private readonly sdk: SdkAgentClient, private readonly selfDid: Did) {}

  async negotiateOrder(req: NegotiateRequest): Promise<Negotiation> {
    const n = await this.sdk.negotiateOrder({
      providerId: req.providerDid, amount: req.amountUsdc, slaMinutes: req.slaMinutes,
      requirements: req.requirements,
    });
    return {
      id: n.id, requesterDid: req.requesterDid, providerDid: req.providerDid,
      amountUsdc: req.amountUsdc, slaMinutes: req.slaMinutes, status: mapNegStatus(n.status),
    };
  }
  async acceptNegotiation(negotiationId: NegotiationId): Promise<AcceptResult> {
    const r = await this.sdk.acceptNegotiation(negotiationId);
    return { orderId: r.orderId, negotiationId };
  }
  rejectNegotiation(negotiationId: NegotiationId, reason: string): Promise<void> {
    return this.sdk.rejectNegotiation(negotiationId, reason);
  }
  async payOrder(orderId: OrderId): Promise<PayResult> {
    const r = await this.sdk.payOrder(orderId);
    return { orderId: r.orderId, escrowLocked: true };
  }
  async deliverOrder(req: DeliverRequest): Promise<DeliverResult> {
    const r = await this.sdk.deliverOrder(req.orderId, req.payload);
    return { orderId: r.orderId, deliveryHash: r.deliveryHash as TxHash };
  }
  rejectOrder(orderId: OrderId, reason: string): Promise<void> {
    return this.sdk.rejectOrder(orderId, reason);
  }
  async getOrder(orderId: OrderId): Promise<Order> {
    return mapSdkOrder(await this.sdk.getOrder(orderId));
  }
  async listOrders(opts?: ListOrdersOpts): Promise<Order[]> {
    return (await this.sdk.listOrders(opts)).map(mapSdkOrder);
  }
  async getDelivery(orderId: OrderId): Promise<Delivery> {
    const d = (await this.sdk.getDelivery(orderId)) as { deliveryHash?: string; payload?: unknown };
    return { orderId, deliveryHash: (d.deliveryHash ?? '0x') as TxHash, payload: d.payload ?? null };
  }
  async connectWebSocket(): Promise<CapEventStream> {
    return new SdkEventStreamAdapter(await this.sdk.connectWebSocket());
  }
  close(): Promise<void> {
    return Promise.resolve();
  }
}
