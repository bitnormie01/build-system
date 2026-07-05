export type DeadmanMode = 'mock' | 'live';

export function resolveMode(env: NodeJS.ProcessEnv): DeadmanMode {
  const raw = env.DEADMAN_MODE;
  if (raw === undefined || raw === '') return 'mock';
  if (raw === 'mock' || raw === 'live') return raw;
  throw new Error(`Invalid DEADMAN_MODE: ${raw} (expected "mock" or "live")`);
}
