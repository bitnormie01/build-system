import type { DowntimeIncident } from '../domain/certificate.js';
import type { Did, OrderStatus } from '../domain/types.js';

export interface TargetRecord {
  targetDid: Did;
  totalHeartbeats: number;
  completedHeartbeats: number;
  incidents: DowntimeIncident[];
  lastResolvedStatus: OrderStatus | 'none';
}

export class AttestationStore {
  private readonly records = new Map<Did, TargetRecord>();

  private ensure(did: Did): TargetRecord {
    let rec = this.records.get(did);
    if (!rec) {
      rec = { targetDid: did, totalHeartbeats: 0, completedHeartbeats: 0, incidents: [],
        lastResolvedStatus: 'none' };
      this.records.set(did, rec);
    }
    return rec;
  }

  recordCompleted(did: Did): void {
    const rec = this.ensure(did);
    rec.totalHeartbeats += 1;
    rec.completedHeartbeats += 1;
    rec.lastResolvedStatus = 'completed';
  }

  recordDowntime(did: Did, incident: DowntimeIncident): void {
    const rec = this.ensure(did);
    rec.totalHeartbeats += 1;
    rec.incidents.push(incident);
    rec.lastResolvedStatus = 'expired';
  }

  recordRejected(did: Did): void {
    const rec = this.ensure(did);
    rec.lastResolvedStatus = 'rejected';
  }

  get(did: Did): TargetRecord | undefined {
    const rec = this.records.get(did);
    return rec ? { ...rec, incidents: [...rec.incidents] } : undefined;
  }

  listTargets(): Did[] {
    return [...this.records.keys()];
  }
}
