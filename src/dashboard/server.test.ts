import { test, expect } from 'vitest';
import { WebSocket } from 'ws';
import { DashboardServer } from './server.js';
import type { DashboardSnapshot } from './snapshot.js';

function snap(targets: DashboardSnapshot['targets']): DashboardSnapshot {
  return { issuerDid: 'did:deadman', generatedAt: 0, targets };
}

test('serves state, kills via control, and broadcasts to ws clients', async () => {
  let killed: string | null = null;
  let state = snap([{ targetDid: 'did:t', status: 'healthy', inFlightOrderId: 'o1',
    lastStatus: 'none', totalHeartbeats: 0, completedHeartbeats: 0, uptimeRatio: 1, incidents: [] }]);
  const server = new DashboardServer({
    getSnapshot: () => state,
    control: {
      registerTarget() {},
      killTarget: (did) => { killed = did; state = snap([{ ...state.targets[0]!, status: 'down' }]); },
      reviveTarget() {},
    },
    staticDir: '/nonexistent',
  });
  const port = await server.listen(0);
  const stateRes = await fetch(`http://127.0.0.1:${port}/api/state`);
  expect(((await stateRes.json()) as DashboardSnapshot).targets[0]?.targetDid).toBe('did:t');

  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  const messages: DashboardSnapshot[] = [];
  await new Promise<void>((r) => ws.on('open', () => r()));
  ws.on('message', (d) => messages.push(JSON.parse(d.toString()) as DashboardSnapshot));
  await new Promise((r) => setTimeout(r, 30));

  const killRes = await fetch(`http://127.0.0.1:${port}/api/kill`,
    { method: 'POST', body: JSON.stringify({ did: 'did:t' }) });
  expect(killRes.status).toBe(200);
  expect(killed).toBe('did:t');
  await new Promise((r) => setTimeout(r, 30));
  expect(messages.some((m) => m.targets[0]?.status === 'down')).toBe(true);

  ws.close();
  await server.close();
});
