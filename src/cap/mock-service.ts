import type { Clock, TimerHandle } from './clock.js';
import type { IdFactory } from './ids.js';
import type { CapEventBus } from './event-bus.js';
import { EventType } from '../domain/types.js';
import type {
  Order, CapEvent, Did, OrderId, NegotiationId,
} from '../domain/types.js';
import type {
  NegotiateRequest, Negotiation, AcceptResult, PayResult, DeliverRequest, DeliverResult,
  Delivery, ListOrdersOpts, CapEventStream,
} from '../domain/cap-client.js';

export interface TargetOptions {
  alive?: boolean;
  rejectAfterPay?: boolean;
}

export interface MockServiceConfig {
  msPerSlaMinute?: number;
  autoDeliverMs?: number;
}

interface TargetState { alive: boolean; rejectAfterPay: boolean; }
interface NegotiationRecord extends Negotiation { requirements: string | null; }

export class MockCapService {
  private readonly orders = new Map<OrderId, Order>();
  private readonly negotiations = new Map<NegotiationId, NegotiationRecord>();
  private readonly deliveries = new Map<OrderId, Delivery>();
  private readonly targets = new Map<Did, TargetState>();
  private readonly slaTimers = new Map<OrderId, TimerHandle>();
  private readonly autoTimers = new Set<TimerHandle>();
  private readonly msPerSlaMinute: number;
  private readonly autoDeliverMs: number;

  constructor(
    private readonly clock: Clock,
    private readonly ids: IdFactory,
    private readonly bus: CapEventBus,
    config: MockServiceConfig = {},
  ) {
    this.msPerSlaMinute = config.msPerSlaMinute ?? 60000;
    this.autoDeliverMs = config.autoDeliverMs ?? 500;
  }

  registerTarget(did: Did, opts: TargetOptions = {}): void {
    this.targets.set(did, { alive: opts.alive ?? true, rejectAfterPay: opts.rejectAfterPay ?? false });
  }
  killTarget(did: Did): void {
    const t = this.targets.get(did);
    if (t) t.alive = false;
  }
  reviveTarget(did: Did): void {
    const t = this.targets.get(did);
    if (t) t.alive = true;
  }

  private emit(type: EventType, e: Omit<CapEvent, 'type' | 'timestamp'>): void {
    this.bus.emit({ ...e, type, timestamp: this.clock.now() });
  }

  async negotiateOrder(req: NegotiateRequest): Promise<Negotiation> {
    const id = this.ids.nextNegotiationId();
    const record: NegotiationRecord = {
      id, requesterDid: req.requesterDid, providerDid: req.providerDid,
      amountUsdc: req.amountUsdc, slaMinutes: req.slaMinutes, status: 'pending',
      requirements: req.requirements ?? null,
    };
    this.negotiations.set(id, record);
    this.emit(EventType.NegotiationCreated, {
      orderId: '', negotiationId: id, requesterDid: req.requesterDid, providerDid: req.providerDid,
      status: 'created', slaMinutes: req.slaMinutes, refundTxHash: null, deliveryHash: null,
    });
    if (this.targets.has(req.providerDid)) {
      await this.acceptNegotiation(id, req.providerDid);
    }
    const current = this.negotiations.get(id);
    return {
      id, requesterDid: record.requesterDid, providerDid: record.providerDid,
      amountUsdc: record.amountUsdc, slaMinutes: record.slaMinutes,
      status: current?.status ?? 'pending',
    };
  }

  async acceptNegotiation(negotiationId: NegotiationId, bySelf: Did): Promise<AcceptResult> {
    const neg = this.negotiations.get(negotiationId);
    if (!neg) throw new Error(`Unknown negotiation: ${negotiationId}`);
    if (neg.providerDid !== bySelf) throw new Error('Only the provider may accept');
    neg.status = 'accepted';
    const orderId = this.ids.nextOrderId();
    const order: Order = {
      id: orderId, negotiationId, requesterDid: neg.requesterDid, providerDid: neg.providerDid,
      amountUsdc: neg.amountUsdc, slaMinutes: neg.slaMinutes, status: 'created',
      requirements: neg.requirements, createdAt: this.clock.now(), paidAt: null, resolvedAt: null,
      deliveryHash: null, refundTxHash: null,
    };
    this.orders.set(orderId, order);
    this.emit(EventType.OrderCreated, {
      orderId, negotiationId, requesterDid: order.requesterDid, providerDid: order.providerDid,
      status: 'created', slaMinutes: order.slaMinutes, refundTxHash: null, deliveryHash: null,
    });
    return { orderId, negotiationId };
  }

  async rejectNegotiation(negotiationId: NegotiationId, _reason: string, bySelf: Did): Promise<void> {
    const neg = this.negotiations.get(negotiationId);
    if (!neg) throw new Error(`Unknown negotiation: ${negotiationId}`);
    if (neg.providerDid !== bySelf) throw new Error('Only the provider may reject');
    neg.status = 'rejected';
  }

  async payOrder(orderId: OrderId, bySelf: Did): Promise<PayResult> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Unknown order: ${orderId}`);
    if (order.requesterDid !== bySelf) throw new Error('Only the requester may pay');
    if (order.status !== 'created') {
      throw new Error(`Order ${orderId} is not payable (status=${order.status})`);
    }
    order.status = 'paid';
    order.paidAt = this.clock.now();
    this.emit(EventType.OrderPaid, {
      orderId, negotiationId: order.negotiationId, requesterDid: order.requesterDid,
      providerDid: order.providerDid, status: 'paid', slaMinutes: order.slaMinutes,
      refundTxHash: null, deliveryHash: null,
    });
    const slaMs = order.slaMinutes * this.msPerSlaMinute;
    this.slaTimers.set(orderId, this.clock.setTimer(() => this.expire(orderId), slaMs));
    const target = this.targets.get(order.providerDid);
    if (target) {
      const autoHandle = this.clock.setTimer(() => {
        this.autoTimers.delete(autoHandle);
        const current = this.orders.get(orderId);
        if (!current || current.status !== 'paid') return;
        const t = this.targets.get(order.providerDid);
        if (!t || !t.alive) return;
        if (t.rejectAfterPay) {
          void this.rejectOrder(orderId, 'provider declines', order.providerDid);
        } else {
          void this.deliverOrder({ orderId, payload: { heartbeat: true } }, order.providerDid);
        }
      }, this.autoDeliverMs);
      this.autoTimers.add(autoHandle);
    }
    return { orderId, escrowLocked: true };
  }

  async deliverOrder(req: DeliverRequest, bySelf: Did): Promise<DeliverResult> {
    const order = this.orders.get(req.orderId);
    if (!order) throw new Error(`Unknown order: ${req.orderId}`);
    if (order.providerDid !== bySelf) throw new Error('Only the provider may deliver');
    if (order.status !== 'paid') {
      throw new Error(`Order ${req.orderId} is not deliverable (status=${order.status})`);
    }
    const deliveryHash = this.ids.deliveryHash(req.payload);
    order.status = 'completed';
    order.resolvedAt = this.clock.now();
    order.deliveryHash = deliveryHash;
    this.deliveries.set(order.id, { orderId: order.id, deliveryHash, payload: req.payload });
    this.cancelSla(order.id);
    this.emit(EventType.OrderCompleted, {
      orderId: order.id, negotiationId: order.negotiationId, requesterDid: order.requesterDid,
      providerDid: order.providerDid, status: 'completed', slaMinutes: order.slaMinutes,
      refundTxHash: null, deliveryHash,
    });
    return { orderId: order.id, deliveryHash };
  }

  async rejectOrder(orderId: OrderId, _reason: string, bySelf: Did): Promise<void> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Unknown order: ${orderId}`);
    if (order.providerDid !== bySelf) throw new Error('Only the provider may reject a paid order');
    if (order.status !== 'paid') {
      throw new Error(`Order ${orderId} is not rejectable (status=${order.status})`);
    }
    const refundTxHash = this.ids.refundTxHash(orderId);
    order.status = 'rejected';
    order.resolvedAt = this.clock.now();
    order.refundTxHash = refundTxHash;
    this.cancelSla(orderId);
    this.emit(EventType.OrderRejected, {
      orderId, negotiationId: order.negotiationId, requesterDid: order.requesterDid,
      providerDid: order.providerDid, status: 'rejected', slaMinutes: order.slaMinutes,
      refundTxHash, deliveryHash: null,
    });
  }

  private expire(orderId: OrderId): void {
    const order = this.orders.get(orderId);
    if (!order || order.status !== 'paid') return;
    const refundTxHash = this.ids.refundTxHash(orderId);
    order.status = 'expired';
    order.resolvedAt = this.clock.now();
    order.refundTxHash = refundTxHash;
    this.slaTimers.delete(orderId);
    this.emit(EventType.OrderExpired, {
      orderId, negotiationId: order.negotiationId, requesterDid: order.requesterDid,
      providerDid: order.providerDid, status: 'expired', slaMinutes: order.slaMinutes,
      refundTxHash, deliveryHash: null,
    });
  }

  private cancelSla(orderId: OrderId): void {
    const h = this.slaTimers.get(orderId);
    if (h) {
      this.clock.clearTimer(h);
      this.slaTimers.delete(orderId);
    }
  }

  async getOrder(orderId: OrderId): Promise<Order> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Unknown order: ${orderId}`);
    return { ...order };
  }

  async listOrders(opts: ListOrdersOpts = {}): Promise<Order[]> {
    return [...this.orders.values()]
      .filter((o) =>
        (opts.requesterDid === undefined || o.requesterDid === opts.requesterDid) &&
        (opts.providerDid === undefined || o.providerDid === opts.providerDid) &&
        (opts.status === undefined || o.status === opts.status))
      .map((o) => ({ ...o }));
  }

  async getDelivery(orderId: OrderId): Promise<Delivery> {
    const d = this.deliveries.get(orderId);
    if (!d) throw new Error(`No delivery for order: ${orderId}`);
    return { ...d };
  }

  connect(did: Did): CapEventStream {
    return this.bus.connect(did);
  }

  stop(): void {
    for (const h of this.slaTimers.values()) this.clock.clearTimer(h);
    this.slaTimers.clear();
    for (const h of this.autoTimers) this.clock.clearTimer(h);
    this.autoTimers.clear();
  }
}
