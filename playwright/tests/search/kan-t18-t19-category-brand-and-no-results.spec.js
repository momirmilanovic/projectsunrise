import {
  verifyHomePageDisplayed,
  verifyProductPageDisplayed,
  verifyProductTagsDisplayed,
} from '../../src/actions/assertions/catalogAssertions.js';
import {
  verifyNoResultsMessageHidden,
  verifyNoResultsMessageVisible,
  verifyProductsInclude,
  verifySearchResultCount,
} from '../../src/actions/assertions/searchAssertions.js';
import { test } from '../../src/fixtures/index.js';

// Both cases browse and search only, so they are tagged @guest and run as an
// unauthenticated guest - no storageState, no setup-project dependency (see the
// chromium-guest project in playwright.config.js).

test(
  'KAN-T18 Search by category, subcategory and brand, select item and go back',
  { tag: '@guest' },
  async ({ guest }) => {
    test.slow();

    // No expected result recorded in Zephyr for this step - action only.
    await test.step(`Select 'Power Tools' category from By category`, async () => {
      await guest.filterByCategory('Power Tools');
    });

    // No expected result recorded in Zephyr for this step - action only.
    await test.step(`Select 'Hammer' from Hand Tools category By category`, async () => {
      await guest.filterByCategory('Hammer');
    });

    await test.step(`Select 'ForgeFlex Tools' from 'By brand'`, async () => {
      await guest.filterByBrand('ForgeFlex Tools');
      await verifyProductsInclude(guest.homePage, ['Thor Hammer', 'Sheet Sander']);
    });

    await test.step('Select Sledgehammer from displayed items', async () => {
      await guest.viewProductFromHome('Sledgehammer');
      await verifyProductPageDisplayed(guest.productPage, 'Sledgehammer');
      await verifyProductTagsDisplayed(guest.productPage, 'Hammer', 'ForgeFlex Tools');
    });

    await test.step(`Go back to home by click on 'Toolshop Demo'`, async () => {
      await guest.goHome();
      await verifyHomePageDisplayed(guest.homePage, guest.header);
    });
  },
);

test('KAN-T19 Search with no results', { tag: '@guest' }, async ({ guest }) => {
  test.slow();

  // No expected result recorded in Zephyr for this step - action only.
  await test.step(`Select 'Wrench' from 'Hand Tools' subcategory in By Category`, async () => {
    await guest.filterByCategory('Wrench');
  });

  await test.step(`Select 'MightyCraft Hardware' from By brand`, async () => {
    await guest.filterByBrand('MightyCraft Hardware');
    await verifyNoResultsMessageVisible(guest.homePage);
  });

  await test.step(`Deselect 'Wrench' and 'MightyCraft Hardware'`, async () => {
    await guest.unfilterByCategory('Wrench');
    await guest.unfilterByBrand('MightyCraft Hardware');
    await verifyNoResultsMessageHidden(guest.homePage);
  });

  await test.step(`Search for 'No such tools ABCDEFG'`, async () => {
    await guest.searchFor('No such tools ABCDEFG');
    await verifySearchResultCount(guest.homePage, `0 products found for 'No such tools ABCDEFG'`);
    await verifyNoResultsMessageVisible(guest.homePage);
  });
});
