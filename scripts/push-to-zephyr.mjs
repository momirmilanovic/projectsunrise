#!/usr/bin/env node
/**
 * Push test cases from testcases/*.json into Zephyr (Jira Cloud).
 *
 * Targets SmartBear's current unified "Zephyr" app:
 *
 *   base   https://api.zephyrscale.smartbear.com/v2
 *   auth   Authorization: Bearer <access token>
 *
 * WHICH ZEPHYR IS WHICH - this naming is a minefield, so for the next reader:
 *   - Zephyr (this script)   the unified app, built on the former Zephyr Scale
 *                           platform. Test cases are Zephyr entities with native
 *                           objective / precondition / folder / status fields.
 *                           Confirmed base URL and bearer auth in SmartBear's own
 *                           REST API overview for the Zephyr Cloud docs.
 *   - Zephyr Essential       the former Zephyr Squad. Same v2 endpoint shapes, but
 *                           hosted at prod-api.zephyr4jiracloud.com/v2. Point
 *                           ZEPHYR_BASE_URL there if you ever need it.
 *   - legacy Squad experience  test cases are Jira issues of type "Test" and steps
 *                           go through .../connect with a per-request signed JWT.
 *                           Nothing here supports that; it needs a different flow.
 *
 * Three calls per test case:
 *   POST /testcases                        -> { key }
 *   POST /testcases/{key}/teststeps        { mode: "OVERWRITE", items: [{ inline: {...} }] }
 *   POST /testcases/{key}/links/issues     { issueId: <numeric, not the key> }
 *
 * Dry run by default. Nothing is written without --apply.
 *
 *   node scripts/push-to-zephyr.mjs testcases/checkout.json
 *   node scripts/push-to-zephyr.mjs testcases/checkout.json --apply
 *   node scripts/push-to-zephyr.mjs testcases/checkout.json --apply --only CHK-TC-05
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_KEY = 'KAN';

// ---------------------------------------------------------------- args & env

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const FORCE = argv.includes('--force');
const UPDATE = argv.includes('--update');
const ONLY = valueOf('--only');
const FILE = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--only');

function valueOf(flag) {
  const i = argv.indexOf(flag);
  return i === -1 ? null : argv[i + 1];
}

function loadEnv() {
  const path = join(ROOT, '.env');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i);
    if (!m) continue;
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    if (!(m[1] in process.env)) process.env[m[1]] = val;
  }
}
loadEnv();

/**
 * Zephyr Cloud is region-sharded and a token is only valid in its own region. The
 * other regions answer 401 {"error":"Unknown token"}, which looks exactly like a bad
 * token - so probe the documented hosts rather than guessing. Order matters only for
 * speed. This list is the `servers` block of the official Zephyr Cloud OpenAPI spec.
 *
 * Set ZEPHYR_BASE_URL to pin one host and skip detection - also how you point this at
 * Zephyr Essential (https://prod-api.zephyr4jiracloud.com/v2), whose v2 surface is
 * identical.
 */
const REGION_HOSTS = [
  'https://api.zephyrscale.smartbear.com/v2', // US / default
  'https://eu.api.zephyrscale.smartbear.com/v2',
  'https://de.api.zephyrscale.smartbear.com/v2',
  'https://au.api.zephyrscale.smartbear.com/v2',
];

const PINNED = process.env.ZEPHYR_BASE_URL?.replace(/\/+$/, '') || null;
let BASE = PINNED ?? REGION_HOSTS[0];
const TOKEN = process.env.ZEPHYR_TOKEN;

function die(msg) {
  console.error(`\n  ${msg}\n`);
  process.exit(1);
}

if (!FILE) die('Usage: node scripts/push-to-zephyr.mjs <testcases/module.json> [--apply] [--only ID] [--force]');
if (APPLY && !TOKEN) {
  die(
    'ZEPHYR_TOKEN is not set. Put it in .env (see .env.example).\n' +
      '  Jira -> Settings -> General Settings -> Apps -> Zephyr API Access Tokens.\n' +
      '  This is a Zephyr token, NOT your Jira/Atlassian API token - test cases and\n' +
      '  steps live in Zephyr, not in Jira, so JIRA_API_TOKEN cannot write them.',
  );
}

// ------------------------------------------------------------------- http

/**
 * The v2 spec declares Authorization as an opaque apiKey header without pinning the
 * prefix. Rather than guess, probe once at startup and reuse whatever authenticates.
 */
let AUTH_PREFIX = 'Bearer ';

function request(method, path, body, prefix = AUTH_PREFIX) {
  return fetch(BASE + path, {
    method,
    headers: {
      Authorization: `${prefix}${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function api(method, path, body, attempt = 1) {
  const res = await request(method, path, body);

  if (res.status === 429 && attempt <= 5) {
    const wait = Number(res.headers.get('retry-after') || 5) * 1000;
    console.log(`      rate limited, retrying in ${wait / 1000}s`);
    await sleep(wait);
    return api(method, path, body, attempt + 1);
  }

  const text = await res.text();
  if (!res.ok) {
    // CLAUDE.md working rule: read the response body, it names the offending field.
    throw new Error(`${method} ${path} -> ${res.status}\n${text}`);
  }
  return text ? JSON.parse(text) : null;
}

/**
 * Preflight: resolve the region, the header format and the token before writing
 * anything. Probes two endpoints per host, because a 401 on a path a host does not
 * serve is indistinguishable from a rejected token.
 */
async function preflight() {
  const hosts = PINNED ? [PINNED] : REGION_HOSTS;
  const attempts = [];

  for (const host of hosts) {
    BASE = host;
    for (const path of ['/healthcheck', `/projects?projectKey=${PROJECT_KEY}&maxResults=1`]) {
      for (const prefix of ['Bearer ', '']) {
        let res;
        try {
          res = await request('GET', path, undefined, prefix);
        } catch (err) {
          attempts.push(`    ---  ${host}${path} -> ${err.message}`);
          continue;
        }
        // Always drain the body: it carries the reason, and leaving it unread makes
        // node abort noisily on Windows when we exit mid-request.
        const body = (await res.text()).trim();
        if (res.ok) {
          AUTH_PREFIX = prefix;
          console.log(`  auth ok  ${host}`);
          console.log(`           Authorization: ${prefix ? 'Bearer <token>' : '<token>'}, verified via ${path}`);
          return;
        }
        attempts.push(
          `    ${String(res.status).padEnd(4)} ${prefix ? 'Bearer' : 'bare  '} ${host}${path}\n         ${body.slice(0, 200) || '(empty body)'}`,
        );
      }
    }
  }

  die(
    `Token rejected by ${hosts.length === 1 ? hosts[0] : 'every Zephyr region'}. Nothing was written.\n\n` +
      `${attempts.join('\n')}\n\n` +
      '  "Unknown token" from every region means the host never issued this token.\n' +
      '  The token decodes as a valid Zephyr JWT, so the likely causes are:\n' +
      '  1. It was copied from the wrong page. The API token lives at\n' +
      '     Jira -> Settings -> General Settings -> Apps -> Zephyr API Access Tokens.\n' +
      '     A token minted anywhere else will not authenticate this API.\n' +
      '  2. This Jira runs a different Zephyr edition. For Zephyr Essential set\n' +
      '     ZEPHYR_BASE_URL=https://prod-api.zephyr4jiracloud.com/v2\n' +
      '  3. The Jira user that minted the token lacks Zephyr API permission.',
  );
}

/**
 * Priority and status names are per-project vocabularies, not fixed enums - this
 * project has High/Normal/Low, not the High/Medium/Low you might assume. A bad name
 * fails the individual POST /testcases with a 404, so check every case up front
 * rather than discovering it a third of the way through a push.
 */
async function validateVocabulary(cases) {
  const [priorities, statuses] = await Promise.all([
    paginate(`/priorities?projectKey=${PROJECT_KEY}`),
    paginate(`/statuses?projectKey=${PROJECT_KEY}&statusType=TEST_CASE`),
  ]);
  const names = (list) => new Set(list.map((v) => v.name));
  const valid = { priority: names(priorities), status: names(statuses) };
  // PUT /testcases/{key} wants { id } objects, not names.
  VOCAB.priorityId = new Map(priorities.map((p) => [p.name, p.id]));
  VOCAB.statusId = new Map(statuses.map((p) => [p.name, p.id]));

  const problems = [];
  for (const tc of cases) {
    for (const field of ['priority', 'status']) {
      if (!valid[field].has(tc[field])) {
        problems.push(`    ${tc.id}  ${field} "${tc[field]}" is not defined in project ${PROJECT_KEY}`);
      }
    }
  }
  if (problems.length) {
    die(
      `Unknown priority or status name. Nothing was written.\n\n${problems.join('\n')}\n\n` +
        `  valid priorities: ${[...valid.priority].join(', ')}\n` +
        `  valid statuses:   ${[...valid.status].join(', ')}\n\n` +
        '  Fix the value in the JSON - it is the source of truth (CLAUDE.md §1) - or add\n' +
        '  the name to the project in Zephyr.',
    );
  }
  console.log(`  vocabulary ok  priorities [${[...valid.priority].join(', ')}]  statuses [${[...valid.status].join(', ')}]`);
}

async function paginate(path) {
  const out = [];
  let startAt = 0;
  for (;;) {
    const sep = path.includes('?') ? '&' : '?';
    const page = await api('GET', `${path}${sep}startAt=${startAt}&maxResults=100`);
    out.push(...(page.values ?? []));
    if (page.isLast !== false || (page.values ?? []).length === 0) break;
    startAt += 100;
  }
  return out;
}

// ------------------------------------------------------------------ folders

/** Resolve "/Toolshop/Checkout" to a folderId, creating missing segments. */
async function resolveFolder(path) {
  const segments = path.split('/').filter(Boolean);
  const existing = await paginate(`/folders?projectKey=${PROJECT_KEY}&folderType=TEST_CASE`);

  let parentId = null;
  for (const name of segments) {
    const hit = existing.find((f) => f.name === name && (f.parentId ?? null) === parentId);
    if (hit) {
      parentId = hit.id;
      continue;
    }
    if (!APPLY) {
      console.log(`  would create folder: ${name} (parent ${parentId ?? 'root'})`);
      parentId = `<new:${name}>`;
      continue;
    }
    const created = await api('POST', '/folders', {
      name,
      projectKey: PROJECT_KEY,
      folderType: 'TEST_CASE',
      parentId: parentId ?? null, // spec: must be null for root folders
    });
    console.log(`  created folder: ${name} -> ${created.id}`);
    existing.push({ id: created.id, name, parentId });
    parentId = created.id;
  }
  return parentId;
}

// ---------------------------------------------------------------- push one

const zephyrName = (tc) => `${tc.id} ${tc.name}`;
const hasVerifyMarker = (tc) => JSON.stringify(tc).includes('VERIFY');

const VOCAB = {};

/**
 * Read-modify-write an existing case. PUT /testcases/{key} is a full replace that
 * requires id, key, name, project, priority and status, with priority/status/folder
 * as { id } objects - so fetch the live object, patch it, and put it back rather
 * than reconstructing it from scratch.
 */
async function updateCase(tc, key, jiraIssueId) {
  const live = await api('GET', `/testcases/${key}`);

  const payload = {
    ...live,
    name: zephyrName(tc),
    objective: tc.objective,
    precondition: tc.precondition,
    labels: [tc.id, ...(tc.labels ?? [])],
    priority: { id: VOCAB.priorityId.get(tc.priority) ?? live.priority?.id },
    status: { id: VOCAB.statusId.get(tc.status) ?? live.status?.id },
  };

  await api('PUT', `/testcases/${key}`, payload);
  await api('POST', `/testcases/${key}/teststeps`, {
    mode: 'OVERWRITE',
    items: tc.steps.map((st) => ({
      inline: { description: st.step, testData: st.data ?? '', expectedResult: st.expected },
    })),
  });
  console.log(`      updated ${key}: fields + ${tc.steps.length} steps overwritten`);
  await sleep(400);
  return { id: tc.id, action: 'updated', key };
}

async function pushCase(tc, folderId, jiraIssueId, existingNames) {
  const name = zephyrName(tc);
  console.log(`\n  ${tc.id}  ${tc.name}`);

  // §3: a case with unresolved VERIFY markers must not reach status Approved.
  if (tc.status === 'Approved' && hasVerifyMarker(tc)) {
    console.log('      SKIPPED - status Approved but unresolved VERIFY markers remain (CLAUDE.md §3)');
    return { id: tc.id, action: 'skipped-verify' };
  }

  // Existence check - the push is otherwise not idempotent.
  if (existingNames.has(name) && !FORCE) {
    if (UPDATE) {
      if (!APPLY) {
        console.log(`      PUT  /testcases/${existingNames.get(name)}                  fields`);
        console.log(`      POST /testcases/${existingNames.get(name)}/teststeps        ${tc.steps.length} steps, OVERWRITE`);
        return { id: tc.id, action: 'dry-run-update' };
      }
      return updateCase(tc, existingNames.get(name), jiraIssueId);
    }
    console.log('      SKIPPED - already exists (--update to overwrite it, --force to push a duplicate)');
    return { id: tc.id, action: 'skipped-exists' };
  }

  const payload = {
    projectKey: PROJECT_KEY,
    name,
    objective: tc.objective,
    precondition: tc.precondition,
    priorityName: tc.priority,
    statusName: tc.status,
    folderId,
    labels: [tc.id, ...(tc.labels ?? [])],
  };

  const steps = {
    mode: 'OVERWRITE',
    items: tc.steps.map((s) => ({
      inline: {
        description: s.step,
        testData: s.data ?? '',
        expectedResult: s.expected,
      },
    })),
  };

  if (!APPLY) {
    console.log(`      POST /testcases                        ${payload.priorityName}/${payload.statusName}, ${payload.labels.length} labels`);
    console.log(`      POST /testcases/{key}/teststeps        ${steps.items.length} steps, OVERWRITE`);
    if (jiraIssueId) {
      console.log(`      POST /testcases/{key}/links/issues     issueId ${jiraIssueId}`);
    } else {
      console.log('      (no jiraIssueId in source header - would be created unlinked)');
    }
    if (hasVerifyMarker(tc)) console.log('      note: contains VERIFY markers - stays Draft');
    return { id: tc.id, action: 'dry-run' };
  }

  const created = await api('POST', '/testcases', payload);
  console.log(`      created ${created.key}`);

  await api('POST', `/testcases/${created.key}/teststeps`, steps);
  console.log(`      ${steps.items.length} steps written`);

  if (jiraIssueId) {
    await api('POST', `/testcases/${created.key}/links/issues`, { issueId: jiraIssueId });
    console.log(`      linked to issue ${jiraIssueId} (${tc.coverage})`);
  } else {
    console.log(`      no jiraIssueId in source header - created unlinked (coverage noted as ${tc.coverage})`);
  }

  existingNames.set(name, created.key);
  await sleep(400); // be gentle with the rate limiter
  return { id: tc.id, action: jiraIssueId ? 'created' : 'created-unlinked', key: created.key };
}

// -------------------------------------------------------------------- main

const source = JSON.parse(readFileSync(resolve(ROOT, FILE), 'utf8'));
const cases = source.testCases.filter((tc) => !ONLY || tc.id === ONLY);

if (cases.length === 0) die(`No test case matched --only ${ONLY}`);

console.log(`\n  ${APPLY ? 'APPLY' : 'DRY RUN'}  ${FILE}   target: Zephyr Cloud v2`);
console.log(`  ${PINNED ? PINNED : `region auto-detect across ${REGION_HOSTS.length} hosts`}`);
console.log(`  project ${PROJECT_KEY}  folder ${source.zephyrFolder}  issue ${source.jiraIssue} (${source.jiraIssueId})`);
console.log(`  ${cases.length} test case(s), ${cases.reduce((n, tc) => n + tc.steps.length, 0)} steps\n`);

if (!TOKEN) {
  console.log('  ZEPHYR_TOKEN not set - showing the planned calls only, no folder or existence lookup.\n');
  for (const tc of cases) await pushCase(tc, '<folderId>', source.jiraIssueId, new Map());
  console.log('\n  Set ZEPHYR_TOKEN in .env, re-run to validate against the live project, then add --apply.\n');
  process.exit(0);
}

await preflight();
await validateVocabulary(cases);

const folderId = await resolveFolder(source.zephyrFolder);
console.log(`  folderId ${folderId}`);

const existingNames = new Map(
  (typeof folderId === 'number'
    ? await paginate(`/testcases?projectKey=${PROJECT_KEY}&folderId=${folderId}`)
    : []
  ).map((tc) => [tc.name, tc.key]),
);
if (existingNames.size) console.log(`  ${existingNames.size} test case(s) already in this folder`);

const results = [];
for (const tc of cases) {
  try {
    results.push(await pushCase(tc, folderId, source.jiraIssueId, existingNames));
  } catch (err) {
    console.error(`      FAILED\n${err.message}`);
    results.push({ id: tc.id, action: 'failed' });
  }
}

console.log('\n  Summary');
for (const r of results) console.log(`    ${r.id}  ${r.action}${r.key ? `  ${r.key}` : ''}`);
console.log('');
