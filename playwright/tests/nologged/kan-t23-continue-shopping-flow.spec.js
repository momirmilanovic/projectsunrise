import { verifyHomePageDisplayed } from '../../src/actions/assertions/catalogAssertions.js';
import { verifyCartCount } from '../../src/actions/assertions/cartAssertions.js';
import { test } from '../../src/fixtures/index.js';

const PRODUCT = 'Bolt Cutters';

// This case only browses and adds to cart anonymously, so it is tagged @guest and
// run as an unauthenticated guest - no storageState, no setup-project dependency
// (see the chromium-guest project in playwright.config.js).
test('KAN-T23 Continue shopping flow', { tag: '@guest' }, async ({ guest }) => {
  await test.step(`Select '${PRODUCT}'`, async () => {
    await guest.viewProductFromHome(PRODUCT);
  });

  await test.step('Select Add to cart', async () => {
    await guest.addCurrentProductToCart(PRODUCT);
  });

  await test.step('Go to cart', async () => {
    await guest.openCart();
  });

  await test.step('Select Continue Shopping', async () => {
    await guest.continueShopping();
    await verifyHomePageDisplayed(guest.homePage, guest.header);
    await verifyCartCount(guest.header, 1);
  });
});
