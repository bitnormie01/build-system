import type { DashboardSnapshot } from '../snapshot.js';

export function renderState(snapshot: DashboardSnapshot): string {
  const cards = snapshot.targets
    .map((t) => {
      const color = t.status === 'down' ? '#e5484d' : t.status === 'degraded' ? '#f5a623' : '#30a46c';
      const incidents = t.incidents
        .map((i) => `<li>SLA ${i.slaMinutes}m breached · refund <code>${i.refundTxHash}</code></li>`)
        .join('');
      return `<div class="card" style="border-color:${color}">
          <h3>${t.targetDid}</h3>
          <div class="status" style="color:${color}">${t.status.toUpperCase()}</div>
          <div>heartbeats ${t.completedHeartbeats}/${t.totalHeartbeats} · in-flight ${t.inFlightOrderId ?? '—'}</div>
          <ul>${incidents}</ul>
          <button data-kill="${t.targetDid}">Kill</button>
          <button data-revive="${t.targetDid}">Revive</button>
        </div>`;
    })
    .join('');
  return `<h1>Deadman — liveness oracle</h1>
    <p>issuer <code>${snapshot.issuerDid}</code> · a status page can lie, a refund tx cannot.</p>
    <div class="grid">${cards}</div>`;
}

function bootstrap(): void {
  const root = document.getElementById('root');
  const render = (s: DashboardSnapshot): void => {
    if (root) root.innerHTML = renderState(s);
  };
  const ws = new WebSocket(`ws://${location.host}`);
  ws.onmessage = (ev): void => render(JSON.parse(String(ev.data)) as DashboardSnapshot);
  document.addEventListener('click', (e) => {
    const el = e.target as HTMLElement;
    const kill = el.getAttribute('data-kill');
    const revive = el.getAttribute('data-revive');
    if (kill) void fetch('/api/kill', { method: 'POST', body: JSON.stringify({ did: kill }) });
    if (revive) void fetch('/api/revive', { method: 'POST', body: JSON.stringify({ did: revive }) });
  });
  void fetch('/api/state')
    .then((r) => r.json())
    .then((s) => render(s as DashboardSnapshot));
}

if (typeof document !== 'undefined') bootstrap();
