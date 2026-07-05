import type {
  Did, OrderId, NegotiationId, TxHash, Order, OrderStatus, CapEvent, EventType,
} from './types.js';

export interface NegotiateRequest {
  requesterDid: Did;
  providerDid: Did;
  amountUsdc: string;
  slaMinutes: number;
  requirements?: string;
}
export type NegotiationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';
export interface Negotiation {
  id: NegotiationId;
  requesterDid: Did;
  providerDid: Did;
  amountUsdc: string;
  slaMinutes: number;
  status: NegotiationStatus;
}
export interface AcceptResult { orderId: OrderId; negotiationId: NegotiationId; }
export interface PayResult { orderId: OrderId; escrowLocked: boolean; }
export interface DeliverRequest { orderId: OrderId; payload: unknown; }
export interface DeliverResult { orderId: OrderId; deliveryHash: TxHash; }
export interface Delivery { orderId: OrderId; deliveryHash: TxHash; payload: unknown; }
export interface ListOrdersOpts { requesterDid?: Did; providerDid?: Did; status?: OrderStatus; }

export interface CapEventStream {
  on(type: EventType, handler: (event: CapEvent) => void): void;
  onAny(handler: (event: CapEvent) => void): void;
  close(): void;
}

export interface CapClient {
  negotiateOrder(req: NegotiateRequest): Promise<Negotiation>;
  acceptNegotiation(negotiationId: NegotiationId): Promise<AcceptResult>;
  rejectNegotiation(negotiationId: NegotiationId, reason: string): Promise<void>;
  payOrder(orderId: OrderId): Promise<PayResult>;
  deliverOrder(req: DeliverRequest): Promise<DeliverResult>;
  rejectOrder(orderId: OrderId, reason: string): Promise<void>;
  getOrder(orderId: OrderId): Promise<Order>;
  listOrders(opts?: ListOrdersOpts): Promise<Order[]>;
  getDelivery(orderId: OrderId): Promise<Delivery>;
  connectWebSocket(): Promise<CapEventStream>;
  close(): Promise<void>;
}
