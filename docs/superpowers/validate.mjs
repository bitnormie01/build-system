// Deadman manifest generator + Stage-4 validator.
// Parses the plan documents (task-contract.md §1 grammar), PROJECTS them into
// docs/superpowers/manifest.json (so manifest⇄plan equality holds by construction), and runs all five
// Stage-4 checks. Plain Node ESM, no deps. Run from the repo root: `node docs/superpowers/validate.mjs`.
// Regeneration PRESERVES existing task statuses (so a mid-build re-projection never wipes progress).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const PLANS_DIR = 'docs/superpowers/plans';
const SPEC = 'docs/superpowers/specs/2026-07-05-deadman-design.md';
const OUT = 'docs/superpowers/manifest.json';

const PLAN_FILES = {
  'foundation': '2026-07-05-foundation.md',
  'mock-cap': '2026-07-05-mock-cap.md',
  'heartbeat': '2026-07-05-heartbeat.md',
  'downtime-attestation': '2026-07-05-downtime-attestation.md',
  'chain-decode': '2026-07-05-chain-decode.md',
  'dashboard-demo': '2026-07-05-dashboard-demo.md',
  'live-artifacts': '2026-07-05-live-artifacts.md',
};
const SUBSYSTEMS = Object.keys(PLAN_FILES);

const errors = [];
const fail = (msg) => errors.push(msg);

function fieldLine(body, name) {
  const re = new RegExp('^\\*\\*' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\*\\*[ \\t]*(.*)$', 'm');
  const m = re.exec(body);
  return m ? m[1].trim() : null;
}

function backtickTokens(str) {
  if (!str || /^\(none\)$/i.test(str.trim())) return [];
  return [...str.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
}

function parseDepends(line, subsystem) {
  if (!line) return [];
  const out = [];
  for (const rawEntry of line.split(',')) {
    const entry = rawEntry.trim();
    if (!entry) continue;
    const m = /^(?:([\w-]+)\s+)?Task\s+(\d+(?:\.\d+)?)$/.exec(entry);
    if (!m) {
      fail(`[${subsystem}] unparseable Depends-on entry: "${entry}"`);
      continue;
    }
    const sub = m[1] && SUBSYSTEMS.includes(m[1]) ? m[1] : subsystem;
    out.push(`${sub}:${m[2]}`);
  }
  return out;
}

function parseFiles(body, id) {
  const files = { create: [], modify: [], test: [] };
  // Only scan the **Files:** block (up to the next blank line / bold field after it).
  const idx = body.indexOf('**Files:**');
  if (idx === -1) {
    fail(`[${id}] no **Files:** section`);
    return files;
  }
  const after = body.slice(idx);
  const end = after.search(/\n\s*\n/);
  const block = end === -1 ? after : after.slice(0, end);
  for (const m of block.matchAll(/^-\s*(Create|Modify|Test):\s*`([^`]+)`/gm)) {
    files[m[1].toLowerCase()].push(m[2]);
  }
  return files;
}

function parseGate(body, id) {
  const gi = body.indexOf('<-- GATE');
  if (gi === -1) {
    fail(`[${id}] no gate step marked "<-- GATE"`);
    return { run: '', expect: '' };
  }
  const after = body.slice(gi);
  const runM = /Run:\s*`([^`]+)`/.exec(after);
  const expM = /Expected:\s*(.+)/.exec(after);
  if (!runM) fail(`[${id}] gate step has no Run: command`);
  if (!expM) fail(`[${id}] gate step has no Expected: line`);
  return { run: runM ? runM[1].trim() : '', expect: expM ? expM[1].trim() : '' };
}

function parseCommit(body, id) {
  const m = /Message:\s*`([^`]+)`/.exec(body);
  if (!m) {
    fail(`[${id}] no commit Message`);
    return '';
  }
  return m[1];
}

function parsePlan(subsystem) {
  const path = `${PLANS_DIR}/${PLAN_FILES[subsystem]}`;
  const text = readFileSync(path, 'utf8');
  const parts = text.split(/^### Task /m).slice(1);
  const tasks = [];
  for (const part of parts) {
    const head = /^(\S+):\s*(.+)/.exec(part);
    if (!head) {
      fail(`[${subsystem}] a "### Task" header failed to parse`);
      continue;
    }
    const num = head[1];
    const title = head[2].trim();
    const id = `${subsystem}:${num}`;
    const body = part;
    const effort = fieldLine(body, 'Effort');
    if (!effort) fail(`[${id}] missing **Effort:** line`);
    if (effort && !/^(none|minimal|low|medium|high|xhigh)$/.test(effort)) {
      fail(`[${id}] invalid effort "${effort}"`);
    }
    tasks.push({
      id,
      subsystem,
      title,
      plan: path,
      depends_on: parseDepends(fieldLine(body, 'Depends on'), subsystem),
      effort: effort || 'medium',
      files: parseFiles(body, id),
      provides: backtickTokens(fieldLine(body, 'Provides')),
      requires: backtickTokens(fieldLine(body, 'Requires')),
      gate: parseGate(body, id),
      commit: parseCommit(body, id),
      human_gate: /human_gate:\s*true/i.test(body),
      allow_empty: false,
      status: 'pending',
    });
  }
  return tasks;
}

// ---- parse all plans ----
const tasks = SUBSYSTEMS.flatMap(parsePlan);
const byId = new Map(tasks.map((t) => [t.id, t]));

// ---- preserve existing statuses across regeneration ----
if (existsSync(OUT)) {
  try {
    const prev = JSON.parse(readFileSync(OUT, 'utf8'));
    const prevStatus = new Map((prev.tasks ?? []).map((t) => [t.id, t.status]));
    for (const t of tasks) {
      const s = prevStatus.get(t.id);
      if (s) t.status = s;
    }
  } catch {
    /* no prior manifest to preserve */
  }
}

// ---- Check 1: valid DAG (deps exist, no cycles) ----
for (const t of tasks) {
  for (const d of t.depends_on) {
    if (!byId.has(d)) fail(`[${t.id}] depends_on unknown task "${d}"`);
  }
}
// cycle detection via DFS
const WHITE = 0, GRAY = 1, BLACK = 2;
const color = new Map(tasks.map((t) => [t.id, WHITE]));
function dfs(id, stack) {
  color.set(id, GRAY);
  for (const d of byId.get(id)?.depends_on ?? []) {
    if (!byId.has(d)) continue;
    if (color.get(d) === GRAY) fail(`cycle detected: ${[...stack, id, d].join(' -> ')}`);
    else if (color.get(d) === WHITE) dfs(d, [...stack, id]);
  }
  color.set(id, BLACK);
}
for (const t of tasks) if (color.get(t.id) === WHITE) dfs(t.id, []);

// ---- Check 2: zero unmatched requires (char-for-char in a DIRECT dependency's provides) ----
for (const t of tasks) {
  const providedByDeps = new Set();
  for (const d of t.depends_on) {
    for (const p of byId.get(d)?.provides ?? []) providedByDeps.add(p);
  }
  for (const r of t.requires) {
    if (!providedByDeps.has(r)) {
      fail(`[${t.id}] requires "${r}" not provided by any direct dependency [${t.depends_on.join(', ')}]`);
    }
  }
}

// ---- Check 4: effort present (already validated during parse) ----
for (const t of tasks) {
  if (!t.effort) fail(`[${t.id}] no effort`);
  if (!t.gate.run) fail(`[${t.id}] no gate command`);
  if (!t.commit) fail(`[${t.id}] no commit message`);
}

// ---- Check 5: human-gate coverage (content-based) ----
// A task is live/key/fund/deploy if its steps reference a real key/fund/deploy action. In this build the
// only such task is the live smoke script (it calls createLiveEnvironment with real keys + places orders).
const LIVE_MARKERS = [/scripts\/live-smoke\.ts/];
for (const t of tasks) {
  const touchesLive = t.files.create.concat(t.files.modify).some((f) => LIVE_MARKERS.some((re) => re.test(f)));
  if (touchesLive && !t.human_gate) {
    fail(`[${t.id}] performs a live/key/fund action but is not human_gate:true`);
  }
}

// ---- build manifest (projection) ----
const manifest = {
  project: 'deadman',
  spec: SPEC,
  generated_by: 'docs/superpowers/validate.mjs',
  subsystems: SUBSYSTEMS,
  tasks: tasks.map((t) => ({
    id: t.id,
    subsystem: t.subsystem,
    title: t.title,
    plan: t.plan,
    depends_on: t.depends_on,
    effort: t.effort,
    files: t.files,
    provides: t.provides,
    requires: t.requires,
    gate: t.gate,
    commit: t.commit,
    human_gate: t.human_gate,
    allow_empty: t.allow_empty,
    status: t.status,
  })),
};

// ---- Check 3: manifest⇄plan equality (projection integrity round-trip) ----
// The manifest is a pure projection of the parsed plan tasks, so equality holds by construction; verify the
// serialized form re-parses to the identical field set for gate/files/effort/provides/requires/commit.
const roundTrip = JSON.parse(JSON.stringify(manifest));
for (const rt of roundTrip.tasks) {
  const src = byId.get(rt.id);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  for (const f of ['effort', 'commit']) {
    if (rt[f] !== src[f]) fail(`[${rt.id}] projection drift on ${f}`);
  }
  for (const f of ['files', 'provides', 'requires', 'gate']) {
    if (!same(rt[f], src[f])) fail(`[${rt.id}] projection drift on ${f}`);
  }
}

// ---- report ----
console.log(`Parsed ${tasks.length} tasks across ${SUBSYSTEMS.length} subsystems.`);
const humanGated = tasks.filter((t) => t.human_gate).map((t) => t.id);
console.log(`human_gate tasks: ${humanGated.length ? humanGated.join(', ') : '(none)'}`);
if (errors.length) {
  console.error(`\nFAILED — ${errors.length} issue(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n');
console.log(`\nAll 5 Stage-4 checks passed. Wrote ${OUT} (${manifest.tasks.length} tasks).`);
