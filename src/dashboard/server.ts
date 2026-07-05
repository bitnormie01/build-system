import { createServer } from 'node:http';
import type { Server, IncomingMessage, ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import type { DashboardSnapshot } from './snapshot.js';
import type { MockControl } from '../cap/environment.js';

export interface DashboardServerDeps {
  getSnapshot: () => DashboardSnapshot;
  control: MockControl | null;
  staticDir: string;
}

export class DashboardServer {
  private readonly server: Server;
  private readonly wss: WebSocketServer;
  private readonly clients = new Set<WebSocket>();

  constructor(private readonly deps: DashboardServerDeps) {
    this.server = createServer((req, res) => {
      void this.handle(req, res);
    });
    this.wss = new WebSocketServer({ server: this.server });
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.send(JSON.stringify(this.deps.getSnapshot()));
      ws.on('close', () => this.clients.delete(ws));
    });
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = req.url ?? '/';
    if (req.method === 'GET' && url === '/api/state') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(this.deps.getSnapshot()));
      return;
    }
    if (req.method === 'POST' && (url === '/api/kill' || url === '/api/revive')) {
      const body = await readBody(req);
      const did = (JSON.parse(body || '{}') as { did?: string }).did ?? '';
      if (!this.deps.control) {
        res.writeHead(409);
        res.end('control unavailable in live mode');
        return;
      }
      if (url === '/api/kill') this.deps.control.killTarget(did);
      else this.deps.control.reviveTarget(did);
      this.broadcast();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    const rel = url === '/' ? 'index.html' : url.replace(/^\//, '');
    if (rel.includes('..')) {
      res.writeHead(400);
      res.end('bad path');
      return;
    }
    try {
      const content = await readFile(join(this.deps.staticDir, rel));
      res.writeHead(200, { 'content-type': contentType(rel) });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  }

  broadcast(): void {
    const msg = JSON.stringify(this.deps.getSnapshot());
    for (const ws of this.clients) {
      if (ws.readyState === ws.OPEN) ws.send(msg);
    }
  }

  listen(port: number): Promise<number> {
    return new Promise((resolve) => {
      this.server.listen(port, () => {
        const addr = this.server.address();
        resolve(typeof addr === 'object' && addr !== null ? addr.port : port);
      });
    });
  }

  async close(): Promise<void> {
    for (const ws of this.clients) ws.close();
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => {
      data += String(c);
    });
    req.on('end', () => resolve(data));
  });
}

function contentType(file: string): string {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}
