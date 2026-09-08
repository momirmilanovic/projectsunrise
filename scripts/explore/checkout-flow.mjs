#!/usr/bin/env node
/**
 * Walk the Toolshop checkout flow and capture the values that block the nine
 * unwritten Checkout test cases (CLAUDE.md §3 - observe, never infer).
 *
 * Captures, per stage: visible text, data-test hooks, form fields with their
 * required flags, select option labels, validation copy, and the cart/invoice
 * network calls that fire.
 *
 * Writes only session-scoped cart data. It NEVER selects a payment method and
 * confirms, so no invoice is created on the shared staging database.
 *
 *   node scripts/explore/checkout-flow.mjs
 *   BASE_URL=http://localhost:4200 node scripts/explore/checkout-flow.mjs
 */

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = (process.env.BASE_URL || 'https://practicesoftwaretesting.com').replace(/\/+$/, '');
const API = (process.env.API_URL || 'https://api.practicesoftwaretesting.com').replace(/\/+$/, '');
const EMAIL = process.env.TOOLSHOP_EMAIL || 'customer@practicesoftwaretesting.com';
const PASSWORD = process.env.TOOLSHOP_PASSWORD || 'welcome01';
const OUT = 'artifacts/checkout-flow';
mkdirSync(OUT, { recursive: true });

const stages = {};
const net = [];
const log = (...a) => console.log(...a);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 1100 } });
const page = await ctx.newPage();

page.on('request', (r) => {
  const u = r.url();
  if (/\/(carts|invoices|users\/login)/.test(u)) net.push({ t: Date.now(), line: `${r.method()} ${u.replace(API, '{API}')}` });
});
page.on('response', async (r) => {
  const u = r.url();
  if (/\/(carts|invoices)/.test(u)) net.push({ t: Date.now(), line: `   -> ${r.status()} ${r.request().method()} ${u.replace(API, '{API}')}` });
});

async function capture(label) {
  await page.waitForTimeout(700); // Angular settle
  const d = await page.evaluate(() => {
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
    };
    const t = (el) => (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 120);
    const NAV = /^(notification-bar|nav-|language-select|chat-|live-activity)/;
    return {
      url: location.href,
      bodyText: (document.querySelector('main, .container, body')?.innerText || '').trim().replace(/\n{2,}/g, '\n').slice(0, 1800),
      dataTest: [...new Set([...document.querySelectorAll('[data-test]')].filter(vis)
        .map((el) => el.getAttribute('data-test')).filter((n) => !NAV.test(n)))],
      fields: [...document.querySelectorAll('input,select,textarea')].filter(vis).map((el) => {
        const lab = (el.id && document.querySelector(`label[for="${el.id}"]`)?.innerText) || el.getAttribute('aria-label') || el.placeholder || '';
        return { tag: el.tagName.toLowerCase(), type: el.type || '', dt: el.getAttribute('data-test') || '', id: el.id || '',
          label: String(lab).trim().replace(/\s+/g, ' '), required: !!el.required, value: (el.value || '').slice(0, 30) };
      }),
      selects: [...document.querySelectorAll('select')].filter(vis).map((s) => ({
        dt: s.getAttribute('data-test') || s.id || '(unnamed)',
        options: [...s.options].map((o) => ({ value: o.value, text: o.text.trim() })),
      })),
      validation: [...new Set([...document.querySelectorAll('[role=alert],.alert,.invalid-feedback,.error,.text-danger,[class*=invalid]')]
        .filter(vis).map(t).filter(Boolean))],
      buttons: [...new Set([...document.querySelectorAll('button,input[type=submit]')].filter(vis)
        .map((el) => `${el.getAttribute('data-test') || '-'}: "${t(el) || el.value || ''}"`))],
    };
  });
  stages[label] = d;
  await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: true });
  log(`\n${'-'.repeat(76)}\n## ${label}   ${d.url}`);
  log('  text: ' + d.bodyText.replace(/\n/g, ' / ').slice(0, 400));
  if (d.dataTest.length) log('  data-test: ' + d.dataTest.join(', '));
  if (d.fields.length) { log('  fields:'); d.fields.forEach((f) => log(`    ${(f.dt || f.id || f.tag).padEnd(22)} ${f.type.padEnd(9)} label="${f.label}"${f.required ? ' REQUIRED' : ''}${f.value ? ' value="' + f.value + '"' : ''}`)); }
  d.selects.forEach((s) => { log(`  <select ${s.dt}>`); s.options.forEach((o) => log(`    ${o.value} => "${o.text}"`)); });
  if (d.validation.length) { log('  VALIDATION:'); d.validation.forEach((v) => log('    ' + v)); }
  return d;
}

async function stage(label, fn) {
  try { await fn(); await capture(label); }
  catch (e) { log(`\n## ${label}  FAILED: ${e.message.split('\n')[0]}`); stages[label] = { error: e.message.split('\n')[0] }; }
}

const dt = (n) => page.locator(`[data-test="${n}"]`);

// ---- 1. empty checkout, for case 02 --------------------------------------
await stage('01-checkout-empty', async () => {
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
});

// ---- 2. add an in-stock product to the cart ------------------------------
await stage('02-product-added', async () => {
  const r = await fetch(`${API}/products?limit=20`);
  const j = await r.json();
  const p = (j.data ?? j).find((x) => x.in_stock !== false && !x.is_rental);
  log(`  (product: ${p.name} $${p.price} id=${p.id})`);
  await page.goto(`${BASE}/product/${p.id}`, { waitUntil: 'networkidle' });
  await dt('add-to-cart').click();
  await page.waitForTimeout(1200);
});

// ---- 3. cart step -------------------------------------------------------
await stage('03-cart-step', async () => {
  await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
});

// ---- 4. §9 async: change quantity, watch the network --------------------
await stage('04-quantity-changed-to-3', async () => {
  const q = page.locator('[data-test^="product-quantity"], input[type=number]').first();
  const before = net.length;
  await q.fill('3');
  await q.press('Tab');
  await page.waitForTimeout(2500);
  log('  network during quantity change:');
  net.slice(before).forEach((n) => log('    ' + n.line));
});

// ---- 5. CHK-TC-07: quantity 0 ------------------------------------------
await stage('05-quantity-zero', async () => {
  const q = page.locator('[data-test^="product-quantity"], input[type=number]').first();
  const before = net.length;
  await q.fill('0');
  await q.press('Tab');
  await page.waitForTimeout(2500);
  log('  network during quantity=0:');
  net.slice(before).forEach((n) => log('    ' + n.line));
});

// ---- 6. guest tries to proceed: CHK-TC-03 / BR-2 -----------------------
await stage('06-guest-proceed', async () => {
  const q = page.locator('[data-test^="product-quantity"], input[type=number]').first();
  await q.fill('1'); await q.press('Tab'); await page.waitForTimeout(1500);
  await page.locator('[data-test="proceed-1"]').click();
  await page.waitForTimeout(1500);
});

// ---- 7. sign in --------------------------------------------------------
await stage('07-signed-in', async () => {
  await dt('email').fill(EMAIL);
  await dt('password').fill(PASSWORD);
  await dt('login-submit').click();
  await page.waitForTimeout(2500);
});

// ---- 8. billing step, empty submit: case 09 / Q4 -----------------------
await stage('08-billing-step', async () => {
  for (const b of ['proceed-2', 'proceed-3']) {
    const el = page.locator(`[data-test="${b}"]`);
    if (await el.count() && await el.isVisible()) { await el.click(); await page.waitForTimeout(1500); break; }
  }
});

await stage('09-billing-empty-submit', async () => {
  for (const b of ['proceed-3', 'proceed-2']) {
    const el = page.locator(`[data-test="${b}"]`);
    if (await el.count() && await el.isVisible()) { await el.click(); await page.waitForTimeout(1500); break; }
  }
});

// ---- 10. payment step: cases 10 and 11 ---------------------------------
await stage('10-payment-step', async () => {
  const addr = { street: 'Teststraat 1', city: 'Amsterdam', state: 'NH', country: 'Netherlands', postal_code: '1000AA' };
  for (const [k, v] of Object.entries(addr)) {
    const el = page.locator(`[data-test="${k}"]`);
    if (await el.count()) await el.fill(v);
  }
  await page.waitForTimeout(400);
  for (const b of ['proceed-3', 'proceed-2']) {
    const el = page.locator(`[data-test="${b}"]`);
    if (await el.count() && await el.isVisible()) { await el.click(); await page.waitForTimeout(1800); break; }
  }
});

// ---- 11. case 10: confirm with no payment method selected --------------
await stage('11-confirm-no-method', async () => {
  const el = page.locator('[data-test="finish"]');
  if (await el.count() && await el.isVisible()) { await el.click(); await page.waitForTimeout(1500); }
  else log('  (no finish button visible - payment step may not have been reached)');
});

// ---- 12. case 11: per-method field sets, WITHOUT confirming -----------
await stage('12-payment-methods', async () => {
  const sel = page.locator('[data-test="payment-method"], select').first();
  if (!(await sel.count())) { log('  (no payment method select found)'); return; }
  const opts = await sel.locator('option').evaluateAll((os) => os.map((o) => ({ value: o.value, text: o.text.trim() })));
  log('  displayed payment methods:');
  const perMethod = {};
  for (const o of opts) {
    if (!o.value) continue;
    await sel.selectOption(o.value);
    await page.waitForTimeout(700);
    const fields = await page.evaluate(() => [...document.querySelectorAll('input,select')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map((el) => ({ dt: el.getAttribute('data-test') || el.id || '', type: el.type,
        label: (el.id && document.querySelector(`label[for="${el.id}"]`)?.innerText || '').trim() }))
      .filter((f) => f.dt && !/^(email|password|street|city|state|country|postal_code|payment-method|search|category|brand|eco)/.test(f.dt)));
    perMethod[o.value] = { displayed: o.text, fields };
    log(`    ${o.value.padEnd(20)} "${o.text}"  fields: ${fields.map((f) => f.dt).join(', ') || '(none)'}`);
  }
  stages['12-payment-methods-detail'] = perMethod;
});

writeFileSync(`${OUT}/stages.json`, JSON.stringify({ base: BASE, stages, net: net.map((n) => n.line) }, null, 2));
log(`\n${'='.repeat(76)}\nwrote ${OUT}/stages.json + screenshots. NO order was confirmed.`);
await browser.close();
