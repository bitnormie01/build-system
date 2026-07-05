import type { CapEnvironment, MockControl } from '../cap/environment.js';
import { RequesterShard } from '../heartbeat/requester-shard.js';
import { HeartbeatEngine } from '../heartbeat/heartbeat-engine.js';
import type { EngineTarget } from '../heartbeat/heartbeat-engine.js';
import { DowntimeDetector } from '../attestation/downtime-detector.js';
import { AttestationStore } from '../attestation/attestation-store.js';
import { AttestationProvider } from '../attestation/attestation-provider.js';
import { buildSnapshot } from './snapshot.js';
import type { DashboardSnapshot } from './snapshot.js';
import type { Did } from '../domain/types.js';

export interface DemoConfig {
  env: CapEnvironment;
  issuerDid: Did;
  requesterDids: Did[];
  targets: EngineTarget[];
  now: () => number;
}

export interface DemoSystem {
  getSnapshot: () => DashboardSnapshot;
  control: MockControl | null;
  stop: () => void;
}

export async function buildDemoSystem(config: DemoConfig): Promise<DemoSystem> {
  const store = new AttestationStore();
  const shards: RequesterShard[] = [];
  for (const did of config.requesterDids) {
    const client = config.env.forAgent(did);
    new DowntimeDetector(store).attach(await client.connectWebSocket());
    shards.push(new RequesterShard(did, client));
  }
  const engine = new HeartbeatEngine(shards);
  await engine.start(config.targets);
  const provider = new AttestationProvider(
    config.env.forAgent(config.issuerDid), config.issuerDid, store, config.now);
  await provider.start();
  return {
    getSnapshot: (): DashboardSnapshot =>
      buildSnapshot({
        issuerDid: config.issuerDid,
        monitorStates: engine.getStates(),
        store,
        now: config.now(),
      }),
    control: config.env.control,
    stop: (): void => {
      engine.stop();
      provider.stop();
    },
  };
}
