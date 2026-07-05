import type { Did } from '../domain/types.js';
import type { CapClient } from '../domain/cap-client.js';
import type { Clock } from './clock.js';
import { SystemClock } from './clock.js';
import { IdFactory } from './ids.js';
import { CapEventBus } from './event-bus.js';
import { MockCapService } from './mock-service.js';
import type { MockServiceConfig, TargetOptions } from './mock-service.js';
import { MockCapClient } from './mock-client.js';

export interface MockControl {
  registerTarget(did: Did, opts?: TargetOptions): void;
  killTarget(did: Did): void;
  reviveTarget(did: Did): void;
}

export interface CapEnvironment {
  forAgent(did: Did): CapClient;
  control: MockControl | null;
  close(): Promise<void>;
}

export interface MockEnvironmentConfig extends MockServiceConfig {
  clock?: Clock;
}

export function createMockEnvironment(config: MockEnvironmentConfig = {}): CapEnvironment {
  const clock = config.clock ?? new SystemClock();
  const service = new MockCapService(clock, new IdFactory(), new CapEventBus(), config);
  return {
    forAgent: (did: Did): CapClient => new MockCapClient(service, did),
    control: {
      registerTarget: (did, opts) => service.registerTarget(did, opts ?? {}),
      killTarget: (did) => service.killTarget(did),
      reviveTarget: (did) => service.reviveTarget(did),
    },
    close: () => {
      service.stop();
      return Promise.resolve();
    },
  };
}
