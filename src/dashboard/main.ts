import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveMode } from '../config/mode.js';
import { createMockEnvironment } from '../cap/environment.js';
import { buildDemoSystem } from './demo-system.js';
import { DashboardServer } from './server.js';

export async function startDemo(port = 4000): Promise<{ port: number; stop: () => Promise<void> }> {
  const mode = resolveMode(process.env);
  if (mode === 'live') {
    throw new Error('DEADMAN_MODE=live: run the live smoke via `npm run live:smoke`, not the mock demo');
  }
  const env = createMockEnvironment({ msPerSlaMinute: 8000, autoDeliverMs: 1200 });
  env.control?.registerTarget('did:partner-a');
  env.control?.registerTarget('did:partner-b');
  env.control?.registerTarget('did:kill-target');
  env.control?.registerTarget('did:declining', { rejectAfterPay: true });
  const system = await buildDemoSystem({
    env,
    issuerDid: 'did:deadman',
    requesterDids: ['did:req1', 'did:req2'],
    targets: [
      { did: 'did:partner-a', amountUsdc: '0.01', slaMinutes: 1 },
      { did: 'did:partner-b', amountUsdc: '0.01', slaMinutes: 1 },
      { did: 'did:kill-target', amountUsdc: '0.01', slaMinutes: 1 },
      { did: 'did:declining', amountUsdc: '0.01', slaMinutes: 1 },
    ],
    now: () => Date.now(),
  });
  const staticDir = join(dirname(fileURLToPath(import.meta.url)), 'public');
  const server = new DashboardServer({
    getSnapshot: system.getSnapshot,
    control: system.control,
    staticDir,
  });
  const actualPort = await server.listen(port);
  const interval = setInterval(() => server.broadcast(), 1000);
  return {
    port: actualPort,
    stop: async (): Promise<void> => {
      clearInterval(interval);
      system.stop();
      await server.close();
      await env.close();
    },
  };
}

const invokedDirectly = process.argv[1] === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  startDemo(Number(process.env.PORT ?? 4000))
    .then(({ port }) => {
      console.log(`Deadman demo dashboard: http://localhost:${port} (mock mode). Open it, then click Kill.`);
    })
    .catch((err: unknown) => {
      console.error(err);
      process.exitCode = 1;
    });
}
