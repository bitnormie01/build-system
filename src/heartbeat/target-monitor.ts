import type { RequesterShard } from './requester-shard.js';
import { EventType } from '../domain/types.js';
import type { CapEvent, OrderStatus, Did } from '../domain/types.js';
import type { CapEventStream } from '../domain/cap-client.js';

export interface MonitorConfig {
  amountUsdc: string;
  slaMinutes: number;
}

export interface MonitorState {
  targetDid: Did;
  inFlightOrderId: string | null;
  lastStatus: OrderStatus | 'none';
  resolved: number;
}

export class TargetMonitor {
  private readonly state: MonitorState;
  private stream: CapEventStream | null = null;
  private running = false;
  private readonly pending = new Set<string>();

  constructor(
    private readonly shard: RequesterShard,
    readonly targetDid: Did,
    private readonly cfg: MonitorConfig,
  ) {
    this.state = { targetDid, inFlightOrderId: null, lastStatus: 'none', resolved: 0 };
  }

  async start(): Promise<void> {
    this.running = true;
    this.stream = await this.shard.client.connectWebSocket();
    this.stream.onAny((e) => this.onEvent(e));
    await this.openNext();
  }

  private onEvent(e: CapEvent): void {
    if (e.providerDid !== this.targetDid) return;
    if (e.type === EventType.OrderCreated && e.negotiationId !== null && this.pending.has(e.negotiationId)) {
      this.pending.delete(e.negotiationId);
      this.state.inFlightOrderId = e.orderId;
      void this.shard.pay(e.orderId).catch(() => undefined);
      return;
    }
    if (e.orderId !== this.state.inFlightOrderId) return;
    if (
      e.type === EventType.OrderCompleted ||
      e.type === EventType.OrderExpired ||
      e.type === EventType.OrderRejected
    ) {
      this.state.lastStatus = e.status;
      this.state.resolved += 1;
      this.state.inFlightOrderId = null;
      if (this.running) void this.openNext();
    }
  }

  private async openNext(): Promise<void> {
    if (!this.running) return;
    const neg = await this.shard.negotiate(this.targetDid, this.cfg.amountUsdc, this.cfg.slaMinutes);
    const created = (
      await this.shard.client.listOrders({ requesterDid: this.shard.did, providerDid: this.targetDid })
    ).find((o) => o.negotiationId === neg.id && o.status === 'created');
    if (created) {
      this.state.inFlightOrderId = created.id;
      await this.shard.pay(created.id);
    } else {
      this.pending.add(neg.id);
    }
  }

  getState(): MonitorState {
    return { ...this.state };
  }

  stop(): void {
    this.running = false;
    this.stream?.close();
  }
}
