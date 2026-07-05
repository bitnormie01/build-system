import type { CapEvent, Did, EventType } from '../domain/types.js';
import type { CapEventStream } from '../domain/cap-client.js';

type Handler = (event: CapEvent) => void;

export class CapEventBus {
  private readonly subscribers = new Set<{ did: Did; handler: Handler }>();

  emit(event: CapEvent): void {
    for (const sub of [...this.subscribers]) {
      if (event.requesterDid === sub.did || event.providerDid === sub.did) {
        sub.handler(event);
      }
    }
  }

  connect(did: Did): CapEventStream {
    const typed = new Map<EventType, Set<Handler>>();
    const anyHandlers = new Set<Handler>();
    const record = {
      did,
      handler: (event: CapEvent): void => {
        for (const h of [...anyHandlers]) h(event);
        const hs = typed.get(event.type);
        if (hs) for (const h of [...hs]) h(event);
      },
    };
    this.subscribers.add(record);
    return {
      on: (type: EventType, handler: Handler): void => {
        let hs = typed.get(type);
        if (!hs) {
          hs = new Set();
          typed.set(type, hs);
        }
        hs.add(handler);
      },
      onAny: (handler: Handler): void => {
        anyHandlers.add(handler);
      },
      close: (): void => {
        this.subscribers.delete(record);
      },
    };
  }
}
