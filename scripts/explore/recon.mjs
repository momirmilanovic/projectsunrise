#!/usr/bin/env node
/**
 * Reconnaissance pass over the Toolshop UI.
 *
 * Purpose: learn the app's actual structure - data-test hooks, accessible names,
 * form fields, validation copy - so that test cases and page objects are written
 * against observed values rather than guesses (CLAUDE.md §3, §7).
 *
 * Read-only apart from cart writes, which are session-scoped. It never confirms an
 * order, so no invoice is created on the shared staging database.
 *
 *   node scripts/explore/recon.mjs
 *   BASE_URL=http://localhost:4200 node scripts/explore/recon.mjs
 */

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = (process.env.BASE_URL || 'https://practicesoftwaretesting.com').replace(/\/+$/, '');
const API = (process.env.API_URL || 'https://api.practicesoftwaretesting.com').replace(/\/+$/, '');
const OUT = 'artifacts/recon';

mkdirSync(OUT, { recursive: true });

const findings = {};
const log = (...a) => console.log(...a);

/** Everything an author needs to write a locator, harvested from the live DOM. */
async function inventory(page, label) {
  const data = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const txt = (el) => (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90);
    return {
      url: location.href,
      title: document.title,
      dataTest: [...new Set([...document.querySelectorAll('[data-test]')]
        .filter(vis)
        .map((el) => `${el.getAttribute('data-test')}  <${el.tagName.toLowerCase()}${el.type ? ' type=' + el.type : ''}>${txt(el) ? '  "' + txt(el) + '"' : ''}`))],
      headings: [...document.querySelectorAll('h1,h2,h3')].filter(vis).map(txt).filter(Boolean),
      buttons: [...new Set([...document.querySelectorAll('button,a[role=button],input[type=submit]')]
        .filter(vis).map((el) => txt(el) || el.value || el.getAttribute('aria-label') || '').filter(Boolean))],
      fields: [...document.querySelectorAll('input,select,textarea')].filter(vis).map((el) => {
        const id = el.id;
        const lab = (id && document.querySelector(`label[for="${id}"]`)?.innerText) || el.getAttribute('aria-label') || el.placeholder || '';
        return `${el.tagName.toLowerCase()}${el.type ? '[' + el.type + ']' : ''} name=${el.name || '-'} id=${id || '-'} label="${String(lab).trim().slice(0, 40)}"${el.required ? ' REQUIRED' : ''}`;
      }),
      selectOptions: [...document.querySelectorAll('select')].map((s) => ({
        name: s.name || s.id || '(unnamed)',
        options: [...s.options].map((o) => `${o.value} => "${o.text.trim()}"`),
      })),
      // Anything that looks like a validation or alert message.
      alerts: [...new Set([...document.querySelectorAll('[role=alert],.alert,.invalid-feedback,.error,.text-danger,[class*=error]')]
        .filter(vis).map(txt).filter(Boolean))],
    };
  });
  findings[label] = data;
  log(`\n${'='.repeat(78)}\n## ${label}   ${data.url}`);
  log(`   title: ${data.title}`);
  if (data.headings.length) log(`   headings: ${data.headings.join(' | ')}`);
  if (data.dataTest.length) { log('   data-test:'); data.dataTest.forEach((d) => log('     ' + d)); }
  if (data.fields.length) { log('   fields:'); data.fields.forEach((f) => log('     ' + f)); }
  for (const s of data.selectOptions) { log(`   <select ${s.name}>:`); s.options.forEach((o) => log('     ' + o)); }
  if (data.buttons.length) log(`   buttons: ${data.buttons.join(' | ')}`);
  if (data.alerts.length) { log('   ALERTS/VALIDATION:'); data.alerts.forEach((a) => log('     ' + a)); }
  await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: true });
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1000 } });
const page = await ctx.newPage();

// Surface the app's own network chatter - needed for the §9 async question.
const calls = [];
page.on('request', (r) => {
  if (r.url().includes('/carts') || r.url().includes('/invoices')) {
    calls.push(`${r.method()} ${r.url().replace(API, '{API}')}`);
  }
});

async function probe(label, fn) {
  try {
    await fn();
    await page.waitForTimeout(600); // let Angular settle before harvesting
    await inventory(page, label);
  } catch (err) {
    log(`\n## ${label}  PROBE FAILED: ${err.message.split('\n')[0]}`);
    findings[label] = { error: err.message.split('\n')[0] };
  }
}

log(`recon against ${BASE}\n`);

await probe('01-home', async () => {
  await page.goto(BASE, { waitUntil: 'networkidle' });
});

await probe('02-checkout-empty-cart', async () => {
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
});

await probe('03-cart-page-empty', async () => {
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
});

await probe('04-login', async () => {
  await page.goto(`${BASE}/auth/login`, { waitUntil: 'networkidle' });
});

// First product detail page, id taken from the API rather than hardcoded.
await probe('05-product-detail', async () => {
  const res = await fetch(`${API}/products?limit=1`);
  const j = await res.json();
  const id = (j.data ?? j)[0]?.id;
  log(`   (using product id ${id})`);
  await page.goto(`${BASE}/product/${id}`, { waitUntil: 'networkidle' });
});

writeFileSync(`${OUT}/findings.json`, JSON.stringify({ base: BASE, findings, networkCalls: calls }, null, 2));
log(`\n${'='.repeat(78)}`);
log(`cart/invoice network calls seen: ${calls.length ? '\n  ' + calls.join('\n  ') : 'none'}`);
log(`\nwrote ${OUT}/findings.json and ${Object.keys(findings).length} screenshots`);

await browser.close();
