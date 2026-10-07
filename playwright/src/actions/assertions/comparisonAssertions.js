import { expect } from '@playwright/test';

export async function verifyComparisonContains(comparisonPage, productNames) {
  await expect
    .poll(async () => comparisonPage.productNames(), {
      message: `comparison table should contain exactly ${productNames.join(', ')}`,
    })
    .toEqual(productNames);
}

// One generic assertion for every row - Price, Brand, Category, Availability,
// CO2 Rating, Eco-Friendly, and every dynamic "Specifications" row - since they all
// share the same <th label>/<td per product> shape (see ComparisonPage.row/cell).
export async function verifyCompareValue(comparisonPage, attributeLabel, productName, expectedValue) {
  const cell = await comparisonPage.cell(attributeLabel, productName);
  await expect(
    cell,
    `"${productName}" should show "${expectedValue}" for "${attributeLabel}"`,
  ).toHaveText(expectedValue);
}

export async function verifyProductRemovedFromComparison(comparisonPage, productName) {
  await expect(
    comparisonPage.productNameLinks.filter({ hasText: productName }),
    `"${productName}" should no longer be in the comparison table`,
  ).toHaveCount(0);
}
