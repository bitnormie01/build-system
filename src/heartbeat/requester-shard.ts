import type { CapClient, Negotiation, PayResult } from '../domain/cap-client.js';
import type { Did } from '../domain/types.js';

export class RequesterShard {
  private queue: Promise<unknown> = Promise.resolve();

  constructor(readonly did: Did, readonly client: CapClient) {}

  negotiate(providerDid: Did, amountUsdc: string, slaMinutes: number): Promise<Negotiation> {
    return this.client.negotiateOrder({ requesterDid: this.did, providerDid, amountUsdc, slaMinutes });
  }

  pay(orderId: string): Promise<PayResult> {
    const run = this.queue.then(() => this.client.payOrder(orderId));
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}
