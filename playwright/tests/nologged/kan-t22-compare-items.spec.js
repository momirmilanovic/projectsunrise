import {
  verifyCompareButtonSelected,
  verifyProductPageDisplayed,
  verifyProductTagsDisplayed,
} from '../../src/actions/assertions/catalogAssertions.js';
import {
  verifyComparisonContains,
  verifyCompareValue,
} from '../../src/actions/assertions/comparisonAssertions.js';
import { test } from '../../src/fixtures/index.js';

const PRODUCT_1 = 'Combination Pliers';
const PRODUCT_2 = 'Pliers';

// This case only browses and compares products anonymously, so it is tagged @guest
// and run as an unauthenticated guest - no storageState, no setup-project dependency
// (see the chromium-guest project in playwright.config.js).
test('KAN-T22 Compare items', { tag: '@guest' }, async ({ guest }) => {
  await test.step(`Select '${PRODUCT_1}'`, async () => {
    await guest.viewProductFromHome(PRODUCT_1);
    await verifyProductPageDisplayed(guest.productPage, PRODUCT_1);
    const { category, brand } = guest.receipts.productDetails[PRODUCT_1];
    await verifyProductTagsDisplayed(guest.productPage, category, brand);
  });

  await test.step("Select Compare on item's page", async () => {
    await guest.addProductToCompare();
    await verifyCompareButtonSelected(guest.productPage);
  });

  await test.step('Back to home', async () => {
    await guest.goHome();
  });

  await test.step(`Select '${PRODUCT_2}'`, async () => {
    await guest.viewProductFromHome(PRODUCT_2);
    await verifyProductPageDisplayed(guest.productPage, PRODUCT_2);
    const { category, brand } = guest.receipts.productDetails[PRODUCT_2];
    await verifyProductTagsDisplayed(guest.productPage, category, brand);
  });

  await test.step("Select Compare on item's page", async () => {
    await guest.addProductToCompare();
  });

  await test.step('Click on [Compare Now] button', async () => {
    await guest.goToComparisonFromBar();
    await verifyComparisonContains(guest.comparisonPage, [PRODUCT_1, PRODUCT_2]);

    const details1 = guest.receipts.productDetails[PRODUCT_1];
    const details2 = guest.receipts.productDetails[PRODUCT_2];
    await verifyCompareValue(guest.comparisonPage, 'Category', PRODUCT_1, details1.category);
    await verifyCompareValue(guest.comparisonPage, 'Brand', PRODUCT_1, details1.brand);
    await verifyCompareValue(guest.comparisonPage, 'Category', PRODUCT_2, details2.category);
    await verifyCompareValue(guest.comparisonPage, 'Brand', PRODUCT_2, details2.brand);
  });
});
