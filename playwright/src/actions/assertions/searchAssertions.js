import { expect } from '@playwright/test';

// "Only hammers displayed" cannot be read off the DOM: product cards expose neither
// category nor brand. It is expressed instead as two identity-based checks against the
// expected name set - nothing outside it, nothing missing from it - so no assertion
// depends on a record count or on a seed-generated id.
export async function verifyOnlyProductsFrom(homePage, expectedNames) {
  await expect
    .poll(
      async () => {
        const names = await homePage.productNames();
        return {
          unexpected: names.filter((name) => !expectedNames.includes(name)).sort(),
          missing: expectedNames.filter((name) => !names.includes(name)).sort(),
        };
      },
      { message: 'filtered grid should show exactly the expected products' },
    )
    .toEqual({ unexpected: [], missing: [] });
}

export async function verifyProductAbsent(homePage, productName) {
  await expect(
    homePage.productCardByName(productName),
    `"${productName}" should not survive the filter`,
  ).toHaveCount(0);
}

// Unlike verifyOnlyProductsFrom, this does not require the result set to be exactly
// expectedNames - only that they are among the (more than one) products displayed.
export async function verifyProductsInclude(homePage, expectedNames) {
  await expect
    .poll(async () => homePage.productNames(), {
      message: `product grid should include ${expectedNames.join(', ')}`,
    })
    .toEqual(expect.arrayContaining(expectedNames));
  const names = await homePage.productNames();
  expect(names.length, 'multiple products should be displayed').toBeGreaterThan(1);
}

export async function verifyNoResultsMessageVisible(homePage) {
  await expect(homePage.noResultsMessage).toHaveText('There are no products found.');
}

export async function verifyNoResultsMessageHidden(homePage) {
  await expect(homePage.noResultsMessage).toHaveCount(0);
}

export async function verifySearchResultCount(homePage, expectedText) {
  await expect(homePage.searchResultCount).toHaveText(expectedText);
}
