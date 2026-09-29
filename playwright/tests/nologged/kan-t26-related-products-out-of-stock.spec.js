import {
  verifyOutOfStock,
  verifyProductPageDisplayed,
  verifyRelatedProductsDisplayed,
} from '../../src/actions/assertions/catalogAssertions.js';
import { test } from '../../src/fixtures/index.js';

const PRODUCT = 'Pliers';
const RELATED_PRODUCT = 'Long Nose Pliers';

// This case only browses anonymously, so it is tagged @guest and run as an
// unauthenticated guest - no storageState, no setup-project dependency (see the
// chromium-guest project in playwright.config.js).
test('KAN-T26 Related products lead to an out-of-stock item that still shows Add to Cart', { tag: '@guest' }, async ({ guest }) => {
  await test.step(`Select '${PRODUCT}' from the home page`, async () => {
    await guest.viewProductFromHome(PRODUCT);
    await verifyProductPageDisplayed(guest.productPage, PRODUCT);
  });

  await test.step('Scroll to the related products section', async () => {
    await verifyRelatedProductsDisplayed(guest.productPage);
  });

  await test.step(`Select '${RELATED_PRODUCT}' from related products`, async () => {
    await guest.openRelatedProduct(RELATED_PRODUCT);
    await verifyProductPageDisplayed(guest.productPage, RELATED_PRODUCT);
  });

  await test.step('Review the out-of-stock state', async () => {
    await verifyOutOfStock(guest.productPage);
  });
});
