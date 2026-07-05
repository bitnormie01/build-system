export type Did = string;
export type OrderId = string;
export type NegotiationId = string;
export type TxHash = `0x${string}`;

export type OrderStatus = 'created' | 'paid' | 'completed' | 'rejected' | 'expired';

export const EventType = {
  NegotiationCreated: 'negotiation_created',
  OrderCreated: 'order_created',
  OrderPaid: 'order_paid',
  OrderCompleted: 'order_completed',
  OrderRejected: 'order_rejected',
  OrderExpired: 'order_expired',
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export interface Order {
  id: OrderId;
  negotiationId: NegotiationId;
  requesterDid: Did;
  providerDid: Did;
  amountUsdc: string;
  slaMinutes: number;
  status: OrderStatus;
  requirements: string | null;
  createdAt: number;
  paidAt: number | null;
  resolvedAt: number | null;
  deliveryHash: TxHash | null;
  refundTxHash: TxHash | null;
}

export interface CapEvent {
  type: EventType;
  orderId: OrderId;
  negotiationId: NegotiationId | null;
  requesterDid: Did;
  providerDid: Did;
  status: OrderStatus;
  slaMinutes: number;
  refundTxHash: TxHash | null;
  deliveryHash: TxHash | null;
  timestamp: number;
}
