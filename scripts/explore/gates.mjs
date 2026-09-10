#!/usr/bin/env node
/**
 * Third exploration pass: how the billing and payment steps actually gate
 * progression. Needed for cases 09 and 10.
 *
 * Pass 2 revealed two things that change the approach:
 *   - proceed-3 does not surface per-field errors; the click just times out,
 *     which suggests the button is disabled until the form validates.
 *   - the payment-method placeholder option is disabled once a real method has
 *     been chosen, so "confirm with no method" must be tested before selecting.
 *
 * Writes only session-scoped cart data. Never confirms an order.
 */

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = (process.env.BASE_URL || 'https://practicesoftwaretesting.com').replace(/\/+$/, '');
const API = (process.env.API_URL || 'https://api.practicesoftwaretesting.com').replace(/\/+$/, '');
const EMAIL = process.env.TOOLSHOP_EMAIL || 'customer@practicesoftwaretesting.com';
const PASSWORD = process.env.TOOLSHOP_PASSWORD || 'welcome01';
const OUT = 'artifacts/gates';
mkdirSync(OUT, { recursive: true });

const log = (...a) => console.log(...a);
const found = {};
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1200 } })).newPage();
const dt = (n) => page.locator(`[data-test="${n}"]`);

const errors = () => page.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  return [...new Set([...document.querySelectorAll('[role=alert],.alert,.invalid-feedback,.help-block,.text-danger,[class*=invalid-feedback],.ng-invalid ~ div')]
    .filter(vis).map((el) => (el.innerText || '').trim().replace(/\s+/g, ' '))
    .filter((s) => s && s.length < 200 && !/Albania|Åland/.test(s)))];
});

const state = async (name) => {
  const l = dt(name);
  if (!(await l.count())) return '(absent)';
  return `visible=${await l.isVisible()} enabled=${await l.isEnabled()}`;
};

// ---- cart + sign in ----------------------------------------------------
const pj = await (await fetch(`${API}/products?limit=20`)).json();
const prod = (pj.data ?? pj).find((x) => x.in_stock !== false);
await page.goto(`${BASE}/product/${prod.id}`, { waitUntil: 'networkidle' });
await dt('add-to-cart').click();
await page.waitForTimeout(1200);
await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
await dt('proceed-1').click(); await page.waitForTimeout(1200);
await dt('email').fill(EMAIL);
await dt('password').fill(PASSWORD);
await dt('login-submit').click(); await page.waitForTimeout(2500);
await dt('proceed-2').click(); await page.waitForTimeout(1800);

// ---- case 09: billing gate -------------------------------------------
log('\n===== case 09: billing address step =====');
const FIELDS = ['postal_code', 'house_number', 'street', 'city', 'state'];

log('  proceed-3 with profile prefill as-is : ' + (await state('proceed-3')));

// Clear every field and blur it, which is what a real user does.
for (const f of FIELDS) { await dt(f).fill(''); await dt(f).blur(); await page.waitForTimeout(200); }
await dt('country').selectOption('').catch(() => {});
await page.waitForTimeout(800);

log('  proceed-3 with all fields empty     : ' + (await state('proceed-3')));
const emptyErrs = await errors();
log('  validation shown when empty:');
emptyErrs.forEach((e) => log('    * ' + e));
found.billingEmpty = { proceed3: await state('proceed-3'), errors: emptyErrs };
await page.screenshot({ path: `${OUT}/billing-empty.png`, fullPage: true });

// Force a submit attempt even if disabled, to see if anything surfaces.
await dt('proceed-3').click({ force: true, timeout: 5000 }).catch((e) => log('  forced click: ' + e.message.split('\n')[0]));
await page.waitForTimeout(1200);
const forcedErrs = await errors();
log('  validation after forced submit:');
forcedErrs.forEach((e) => log('    * ' + e));
found.billingForced = forcedErrs;
await page.screenshot({ path: `${OUT}/billing-forced.png`, fullPage: true });

// Fill one field at a time, to learn which are actually mandatory.
log('\n  incremental fill - when does proceed-3 become enabled?');
const order = [['country', 'NL'], ['postal_code', '1000AA'], ['house_number', '1'], ['street', 'Teststraat'], ['city', 'Amsterdam'], ['state', 'Noord-Holland']];
for (const [f, v] of order) {
  if (f === 'country') await dt(f).selectOption(v); else await dt(f).fill(v);
  await dt(f).blur().catch(() => {});
  await page.waitForTimeout(400);
  log(`    after ${f.padEnd(13)} -> proceed-3 ${await state('proceed-3')}`);
}
found.mandatoryOrder = order.map(([f]) => f);

// ---- payment step ----------------------------------------------------
await dt('proceed-3').click({ timeout: 10000 });
await page.waitForTimeout(2000);
log('\n===== case 10: payment step, nothing selected =====');
log('  payment-method : ' + (await state('payment-method')));
log('  finish         : ' + (await state('finish')));
const selValue = await dt('payment-method').inputValue().catch(() => '?');
log('  payment-method current value: ' + JSON.stringify(selValue));

await dt('finish').click({ force: true, timeout: 8000 }).catch((e) => log('  finish click: ' + e.message.split('\n')[0]));
await page.waitForTimeout(1800);
const noMethodErrs = await errors();
log('  validation after confirm with no method:');
noMethodErrs.forEach((e) => log('    * ' + e));
log('  still on payment step? finish ' + (await state('finish')));
found.confirmNoMethod = { errors: noMethodErrs, finish: await state('finish'), url: page.url() };
await page.screenshot({ path: `${OUT}/confirm-no-method.png`, fullPage: true });

writeFileSync(`${OUT}/findings.json`, JSON.stringify(found, null, 2));
log('\nNO order was confirmed.');
await browser.close();
