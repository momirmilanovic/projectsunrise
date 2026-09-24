import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

export const PLAYWRIGHT_ROOT = resolve(here, '../..');
export const REPO_ROOT = resolve(here, '../../..');
export const AUTH_DIR = resolve(PLAYWRIGHT_ROOT, '.auth');

// Same dependency-free .env parsing as scripts/push-to-zephyr.mjs. Absent on CI,
// where the variables come from the real environment instead.
function loadDotEnv() {
  let raw;
  try {
    raw = readFileSync(resolve(REPO_ROOT, '.env'), 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match) continue;
    const [, key, value] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = value.replace(/^['"]|['"]$/g, '');
  }
}

loadDotEnv();

export const ENV = {
  baseURL: 'https://practicesoftwaretesting.com',
  apiURL: 'https://api.practicesoftwaretesting.com',
};
