#!/usr/bin/env node
/** Case 08: what happens when the last cart line is removed. Cart writes only. */
import { chromium } from '@playwright/test';
const BASE = (process.env.BASE_URL || 'https://practicesoftwaretesting.com').replace(/\/+$/, '');
const API = (process.env.API_URL || 'https://api.practicesoftwaretesting.com').replace(/\/+$/, '');
const log = (...a) => console.log(...a);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
const dt = (n) => page.locator(`[data-test="${n}"]`);
const net = [];
page.on('response', (r) => { if (/\/carts/.test(r.url())) net.push(`${r.status()} ${r.request().method()} ${r.url().replace(API, '{API}')}`); });

const pj = await (await fetch(`${API}/products?limit=20`)).json();
const prod = (pj.data ?? pj).find((x) => x.in_stock !== false);
await page.goto(`${BASE}/product/${prod.id}`, { waitUntil: 'networkidle' });
await dt('add-to-cart').click(); await page.waitForTimeout(1200);
await page.goto(`${BASE}/checkout`, { waitUntil: 'networkidle' });

// Every control inside the cart row, so the remove affordance is found, not guessed.
const row = await page.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  return [...document.querySelectorAll('table button, table a, table svg, table i, [data-test*=delete], [data-test*=remove]')]
    .filter(vis).map((el) => `${el.tagName.toLowerCase()} data-test=${el.getAttribute('data-test') || '-'} aria-label="${el.getAttribute('aria-label') || ''}" class="${(el.getAttribute('class') || '').slice(0, 50)}" text="${(el.innerText || '').trim().slice(0, 30)}"`);
});
log('cart row controls:'); row.forEach((r) => log('  ' + r));

log('\ntotal before: ' + await dt('cart-total').innerText().catch(() => '?'));
net.length = 0;
const del = page.locator('a.btn-danger, [data-test^="delete"], [data-test^="remove"]').last();
log('clicking: ' + (await del.getAttribute('data-test').catch(() => 'n/a')));
await del.click({ timeout: 8000 }).catch((e) => log('click failed: ' + e.message.split('\n')[0]));
await page.waitForTimeout(2500);
log('network: ' + JSON.stringify(net));

const after = await page.evaluate(() => {
  const vis = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  return {
    url: location.href,
    text: (document.querySelector('main, .container')?.innerText || '').trim().replace(/\n{2,}/g, '\n').slice(0, 700),
    visible: [...new Set([...document.querySelectorAll('[data-test]')].filter(vis).map((e) => e.getAttribute('data-test'))
      .filter((n) => !/^(notification-bar|nav-|language-|chat-|live-activity)/.test(n)))],
  };
});
log('\nAFTER removal:');
log('  url: ' + after.url);
log('  visible data-test: ' + after.visible.join(', '));
log('  text: ' + after.text.replace(/\n/g, ' / '));
await page.screenshot({ path: 'artifacts/remove-line/after.png', fullPage: true });
await browser.close();
