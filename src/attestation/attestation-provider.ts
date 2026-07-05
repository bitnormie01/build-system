import type { AttestationStore } from './attestation-store.js';
import { buildCertificate } from './certificate-builder.js';
import type { CapClient, CapEventStream } from '../domain/cap-client.js';
import { EventType } from '../domain/types.js';
import type { Did } from '../domain/types.js';

export class AttestationProvider {
  private stream: CapEventStream | null = null;

  constructor(
    private readonly client: CapClient,
    private readonly selfDid: Did,
    private readonly store: AttestationStore,
    private readonly now: () => number,
  ) {}

  async start(): Promise<void> {
    this.stream = await this.client.connectWebSocket();
    this.stream.on(EventType.NegotiationCreated, (e) => {
      if (e.providerDid !== this.selfDid || e.negotiationId === null) return;
      void this.client.acceptNegotiation(e.negotiationId).catch(() => undefined);
    });
    this.stream.on(EventType.OrderPaid, (e) => {
      if (e.providerDid !== this.selfDid) return;
      void this.deliverCertificate(e.orderId).catch(() => undefined);
    });
  }

  private async deliverCertificate(orderId: string): Promise<void> {
    const order = await this.client.getOrder(orderId);
    const targetDid = order.requirements ?? '';
    const cert = buildCertificate(targetDid, this.selfDid, this.store, this.now());
    await this.client.deliverOrder({ orderId, payload: cert });
  }

  stop(): void {
    this.stream?.close();
  }
}
