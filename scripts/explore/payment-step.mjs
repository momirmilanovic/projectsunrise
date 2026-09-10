#!/usr/bin/env node
/**
 * Second exploration pass: reach the payment step and capture what blocks
 * cases 09, 10 and 11, plus the UI half of CHK-TC-07.
 *
 * The first pass failed here because `country` is a <select> and was being
 * filled as a text input. Fixed by using selectOption.
 *
 * Writes only session-scoped cart data. Never confirms an order.
 */

import { chromium } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';

const BASE = (process.env.BASE_URL || 'https://practicesoftwaretesting.com').replace(/\/+$/, '');
const API = (process.env.API_URL || 'https://api.practicesoftwaretesting.com').replace(/\/+$/, '');
const EMAIL = process.env.TOOLSHOP_EMAIL || 'customer@practicesoftwaretesting.com';
const PASSWORD = process.env.TOOLSHOP_PASSWORD || 'welcome01';
const OUT = 'artifacts/payment-step';
mkdirSync(OUT, { recursive: true });

const out = {};
const log = (...a) => console.log(...a);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1200 } })).newPage();

// Capture request bodies - needed to know whether the UI actually sends quantity 0.
const reqs = [];
page.on('request', (r) => {
  if (/\/carts/.test(r.url())) reqs.push(`${r.method()} ${r.url().replace(API, '{API}')}  body=${r.postData() || '-'}`);
});
page.on('response', async (r) => {
  if (/\/carts/.test(r.url())) reqs.push(`   -> ${r.status()} ${r.request().method()}`);
});

const dt = (n) => page.locator(`[data-test="${n}"]`);

/** Validation copy only - no country dumps. */
async function messages(label) {
  const d = await page.evaluate(() => {
    const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const t = (el) => (el.innerText || '').trim().replace(/\s+/g, ' ');
    return {
      url: location.href,
      // Angular reactive-form errors and toasts, excluding the country <select> block.
      validation: [...new Set([...document.querySelectorAll('[role=alert],.alert,.invalid-feedback,.help-block,.text-danger,[class*=invalid-feedback]')]
        .filter(vis).map(t).filter((s) => s && s.length < 200 && !/Albania|Åland/.test(s)))],
      activeStep: t(document.querySelector('.stepper .active, [class*=active][class*=step]') || document.createElement('i')),
      visibleDataTest: [...new Set([...document.querySelectorAll('[data-test]')].filter(vis)
        .map((el) => el.getAttribute('data-test'))
        .filter((n) => !/^(notification-bar|nav-|language-|chat-|live-activity|product-0|category-|brand-)/.test(n)))],
    };
  });
  out[label] = d;
  await page.screenshot({ path: `${OUT}/${label}.png`, fullPage: true });
  log(`\n${'-'.repeat(70)}\n## ${label}`);
  log('  visible: ' + d.visibleDataTest.join(', '));
  if (d.validation.length) { log('  VALIDATION:'); d.validation.forEach((v) => log('    * ' + v)); }
  else log('  VALIDATION: (none shown)');
  return d;
}

// ---- build a cart and sign in -------------------------------------------
const r = await fetch(`${API}/products?limit=20`);
const pj = await r.json();
const prod = (pj.data ?? pj).find((x) => x.in_stock !== false);
log(`product: ${prod.name} $${prod.price}`);

await page.goto(`${BASE}/product/${prod.id}`, { waitUntil: 'networkidle' });
await dt('add-to-cart').click();
await page.waitForTimeout(1200);

// ---- CHK-TC-07 UI half: does the UI even send quantity 0? --------------
await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });
const qty = dt('product-quantity').first();
await qty.fill('3'); await qty.press('Tab'); await page.waitForTimeout(2000);
reqs.length = 0;
await qty.fill('0'); await qty.press('Tab'); await page.waitForTimeout(2500);
log('\n## CHK-TC-07 UI: network for quantity=0');
reqs.forEach((x) => log('    ' + x));
log('    input value now: ' + (await qty.inputValue()));
log('    cart total now : ' + (await dt('cart-total').innerText().catch(() => '?')));
await messages('01-quantity-zero-ui');

// ---- proceed to billing ------------------------------------------------
await qty.fill('1'); await qty.press('Tab'); await page.waitForTimeout(1800);
await dt('proceed-1').click(); await page.waitForTimeout(1200);
await dt('email').fill(EMAIL);
await dt('password').fill(PASSWORD);
await dt('login-submit').click(); await page.waitForTimeout(2500);
await dt('proceed-2').click(); await page.waitForTimeout(1500);

// ---- Q4: what is prefilled from the profile? --------------------------
const prefill = {};
for (const f of ['postal_code', 'house_number', 'street', 'city', 'state']) {
  prefill[f] = await dt(f).inputValue().catch(() => '(absent)');
}
prefill.country = await dt('country').inputValue().catch(() => '(absent)');
log('\n## Q4 billing prefill from profile: ' + JSON.stringify(prefill));
out.prefill = prefill;

// ---- case 09: submit billing with every field cleared -----------------
for (const f of ['postal_code', 'house_number', 'street', 'city', 'state']) {
  await dt(f).fill('').catch(() => {});
}
await dt('proceed-3').click({ timeout: 8000 }).catch((e) => log('  proceed-3 click: ' + e.message.split('\n')[0]));
await page.waitForTimeout(1500);
await messages('02-billing-empty-submit');

// ---- fill correctly, reach payment ------------------------------------
await dt('country').selectOption('NL');
await dt('postal_code').fill('1000AA');
await dt('house_number').fill('1');
await dt('street').fill('Teststraat');
await dt('city').fill('Amsterdam');
await dt('state').fill('Noord-Holland');
await page.waitForTimeout(400);
await dt('proceed-3').click({ timeout: 10000 }).catch((e) => log('  proceed-3: ' + e.message.split('\n')[0]));
await page.waitForTimeout(2000);
await messages('03-payment-step');

// ---- case 11: displayed payment methods and their field sets ----------
const sel = dt('payment-method');
if (await sel.count()) {
  const opts = await sel.locator('option').evaluateAll((os) => os.map((o) => ({ value: o.value, text: o.text.trim() })));
  log('\n## case 11: payment methods AS DISPLAYED');
  const per = {};
  for (const o of opts) {
    if (!o.value) { log(`    (placeholder) "${o.text}"`); continue; }
    await sel.selectOption(o.value);
    await page.waitForTimeout(700);
    const fields = await page.evaluate(() => [...document.querySelectorAll('input,select')]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
      .map((el) => ({ dt: el.getAttribute('data-test') || '', label: (el.id && document.querySelector(`label[for="${el.id}"]`)?.innerText || '').trim().replace(/\s+/g, ' ') }))
      .filter((f) => f.dt && !/^(payment-method|country|postal_code|house_number|street|city|state|search|product-quantity)/.test(f.dt)));
    per[o.value] = { displayed: o.text, fields };
    log(`    ${o.value.padEnd(20)} "${o.text}"  ->  ${fields.map((f) => f.dt + (f.label ? ` ("${f.label}")` : '')).join(', ') || '(no extra fields)'}`);
  }
  out.paymentMethods = per;

  // ---- case 10: confirm with the placeholder (no method) selected -----
  await sel.selectOption('');
  await page.waitForTimeout(500);
  await dt('finish').click({ timeout: 8000 }).catch((e) => log('  finish click: ' + e.message.split('\n')[0]));
  await page.waitForTimeout(1500);
  await messages('04-confirm-no-method');
} else {
  log('\n## payment-method select NOT FOUND - did not reach the payment step');
}

writeFileSync(`${OUT}/findings.json`, JSON.stringify({ out, reqs }, null, 2));
log('\nNO order was confirmed. Wrote ' + OUT + '/findings.json');
await browser.close();
