import { expect } from '@playwright/test';

import { formatCents, sumCents, toCents } from '../../utils/money.js';

export async function verifyCartContains(cartPage, productNames) {
  for (const name of productNames) {
    await expect(cartPage.row(name), `cart should contain "${name}"`).toBeVisible();
  }
}

export async function verifyCartCount(header, expectedCount) {
  await expect(header.cartQuantity).toHaveText(String(expectedCount));
}

export async function verifyCartQuantity(cartPage, productName, expectedQuantity) {
  await expect(cartPage.quantityInput(productName)).toHaveValue(String(expectedQuantity));
}

export async function verifyCartLineRemoved(cartPage, productName) {
  await expect(
    cartPage.row(productName),
    `"${productName}" should no longer be in the cart`,
  ).toHaveCount(0);
}

export async function verifyCartUnitPriceMatches(cartPage, productName, expectedPriceText) {
  const actualText = await cartPage.unitPrice(productName).textContent();
  expect(
    toCents(actualText),
    `"${productName}" cart price should match the price shown on its product page`,
  ).toBe(toCents(expectedPriceText));
}

export async function verifyCartTotalMatchesLines(cartPage, productNames) {
  await expect(cartPage.total).toBeVisible();
  const lineTotals = await Promise.all(
    productNames.map((name) => cartPage.lineTotal(name).textContent()),
  );
  const expectedCents = sumCents(lineTotals);
  const actualCents = toCents(await cartPage.total.textContent());
  expect(
    actualCents,
    `cart total should equal the sum of line totals (${lineTotals.join(' + ')})`,
  ).toBe(expectedCents);
  return formatCents(actualCents);
}
