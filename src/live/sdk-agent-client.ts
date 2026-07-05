import { EventType } from '../domain/types.js';

export interface SdkNegotiateRequest {
  providerId: string;
  amount: string;
  slaMinutes: number;
  requirements?: string;
}
export interface SdkNegotiation { id: string; status: string; }
export interface SdkAcceptResult { orderId: string; }
export interface SdkPayResult { orderId: string; }
export interface SdkDeliverResult { orderId: string; deliveryHash: string; }
export interface SdkOrder {
  id: string;
  status: string;
  negotiationId?: string;
  requesterId?: string;
  providerId?: string;
  amount?: string;
  slaMinutes?: number;
  requirements?: string | null;
  createdAt?: number;
  paidAt?: number | null;
  resolvedAt?: number | null;
  deliveryHash?: string | null;
  refundTxHash?: string | null;
}
export interface SdkEvent {
  type: string;
  orderId?: string;
  negotiationId?: string;
  requesterId?: string;
  providerId?: string;
  status?: string;
  slaMinutes?: number;
  refundTxHash?: string;
  deliveryHash?: string;
  timestamp?: number;
}
export interface SdkStream {
  on(type: string, cb: (e: SdkEvent) => void): void;
  onAny(cb: (e: SdkEvent) => void): void;
  close(): void;
}
export interface SdkAgentClient {
  negotiateOrder(req: SdkNegotiateRequest): Promise<SdkNegotiation>;
  acceptNegotiation(negotiationId: string): Promise<SdkAcceptResult>;
  rejectNegotiation(negotiationId: string, reason: string): Promise<void>;
  payOrder(orderId: string): Promise<SdkPayResult>;
  deliverOrder(orderId: string, req: unknown): Promise<SdkDeliverResult>;
  rejectOrder(orderId: string, reason: string): Promise<void>;
  getOrder(orderId: string): Promise<SdkOrder>;
  listOrders(opts?: unknown): Promise<SdkOrder[]>;
  getDelivery(orderId: string): Promise<unknown>;
  connectWebSocket(): Promise<SdkStream>;
}

export function mapSdkEventType(raw: string): EventType | null {
  switch (raw.toLowerCase().replace(/[^a-z]/g, '')) {
    case 'negotiationcreated': return EventType.NegotiationCreated;
    case 'ordercreated': return EventType.OrderCreated;
    case 'orderpaid': return EventType.OrderPaid;
    case 'ordercompleted': return EventType.OrderCompleted;
    case 'orderrejected': return EventType.OrderRejected;
    case 'orderexpired': return EventType.OrderExpired;
    default: return null;
  }
}
