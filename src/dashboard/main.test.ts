import { test, expect } from 'vitest';
import { startDemo } from './main.js';
import type { DashboardSnapshot } from './snapshot.js';

test('startDemo serves a mock-mode snapshot with monitored targets, then stops cleanly', async () => {
  const { port, stop } = await startDemo(0);
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/state`);
    const snap = (await res.json()) as DashboardSnapshot;
    expect(snap.issuerDid).toBe('did:deadman');
    expect(snap.targets.length).toBeGreaterThan(0);
  } finally {
    await stop();
  }
});
