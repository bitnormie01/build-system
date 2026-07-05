import type { Did } from '../domain/types.js';
import type { CapClient } from '../domain/cap-client.js';
import type { CapEnvironment } from '../cap/environment.js';
import type { SdkAgentClient } from './sdk-agent-client.js';
import { LiveCapClient } from './live-cap-client.js';

export interface LiveEnvironmentConfig {
  agentKeys: Record<Did, string>;
  baseUrl?: string;
  wsUrl?: string;
  rpcUrl?: string;
  sdkFactory?: (apiKey: string) => SdkAgentClient;
}

async function defaultSdkFactory(
  config: LiveEnvironmentConfig,
): Promise<(apiKey: string) => SdkAgentClient> {
  const spec = '@croo-network/sdk';
  const mod = (await import(spec)) as {
    AgentClient: new (cfg: unknown, apiKey: string) => unknown;
  };
  const cfg = {
    baseURL: config.baseUrl ?? 'https://api.croo.network',
    wsURL: config.wsUrl ?? 'wss://api.croo.network/ws',
    rpcURL: config.rpcUrl,
  };
  return (apiKey: string): SdkAgentClient =>
    new mod.AgentClient(cfg, apiKey) as unknown as SdkAgentClient;
}

export async function createLiveEnvironment(config: LiveEnvironmentConfig): Promise<CapEnvironment> {
  const factory = config.sdkFactory ?? (await defaultSdkFactory(config));
  const clients = new Map<Did, CapClient>();
  return {
    forAgent: (did: Did): CapClient => {
      let client = clients.get(did);
      if (!client) {
        const apiKey = config.agentKeys[did];
        if (!apiKey) throw new Error(`No API key configured for agent ${did}`);
        client = new LiveCapClient(factory(apiKey), did);
        clients.set(did, client);
      }
      return client;
    },
    control: null,
    close: () => Promise.resolve(),
  };
}
