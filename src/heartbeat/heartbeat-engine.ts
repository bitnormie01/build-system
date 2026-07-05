import type { RequesterShard } from './requester-shard.js';
import { TargetMonitor } from './target-monitor.js';
import type { MonitorState } from './target-monitor.js';
import type { Did } from '../domain/types.js';

export interface EngineTarget {
  did: Did;
  amountUsdc: string;
  slaMinutes: number;
}

export class HeartbeatEngine {
  private readonly monitors: TargetMonitor[] = [];

  constructor(private readonly shards: RequesterShard[]) {
    if (shards.length === 0) {
      throw new Error('HeartbeatEngine needs at least one requester shard');
    }
  }

  async start(targets: EngineTarget[]): Promise<void> {
    let i = 0;
    for (const t of targets) {
      const shard = this.shards[i % this.shards.length];
      i += 1;
      if (!shard) continue;
      const monitor = new TargetMonitor(shard, t.did, {
        amountUsdc: t.amountUsdc,
        slaMinutes: t.slaMinutes,
      });
      this.monitors.push(monitor);
      await monitor.start();
    }
  }

  getStates(): MonitorState[] {
    return this.monitors.map((m) => m.getState());
  }

  stop(): void {
    for (const m of this.monitors) m.stop();
  }
}
